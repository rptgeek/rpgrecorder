import { NextRequest, NextResponse } from "next/server";
// import { updateSession } from "@/lib/actions/session"; // REMOVED - will perform direct DDB update
import { s3Client } from "@/lib/aws/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { documentClient } from "@/lib/dynamodb"; // ADDED for direct DDB update
import { UpdateCommand } from "@aws-sdk/lib-dynamodb"; // ADDED for direct DDB update

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "rpg-prod"; // Dynamodb Table Name

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Transcribe Webhook received:", JSON.stringify(body, null, 2));

    const { TranscriptionJobName, TranscriptionJobStatus, OutputLocation } = body.detail || body;

    if (!TranscriptionJobName || !TranscriptionJobStatus || !OutputLocation) {
      return NextResponse.json({ message: "Invalid Transcribe webhook payload" }, { status: 400 });
    }

    if (TranscriptionJobStatus !== "COMPLETED") {
      console.log(`Transcription job ${TranscriptionJobName} not completed. Status: ${TranscriptionJobStatus}`);
      return NextResponse.json({ message: `Job ${TranscriptionJobName} status: ${TranscriptionJobStatus}` }, { status: 200 });
    }

    // Extract userId AND sessionId from jobName
    // Assuming jobName format: rpg-session-<userId>-<sessionId>-<timestamp>
    const jobNameMatch = TranscriptionJobName.match(/rpg-session-([a-f0-9-]+)-([a-f0-9-]+)-\d+/);
    if (!jobNameMatch || !jobNameMatch[1] || !jobNameMatch[2]) {
      console.error("Could not extract userId and sessionId from jobName:", TranscriptionJobName);
      return NextResponse.json({ message: "Could not extract userId and sessionId from jobName" }, { status: 400 });
    }
    const userId = jobNameMatch[1];
    const sessionId = jobNameMatch[2];

    // Parse OutputLocation to get bucket and key
    const outputUrl = new URL(OutputLocation);
    const outputBucket = outputUrl.hostname;
    const outputKey = outputUrl.pathname.substring(1); // Remove leading slash

    // Fetch transcription result from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: outputBucket,
      Key: outputKey,
    });
    const { Body } = await s3Client.send(getObjectCommand);

    if (!Body) {
      throw new Error("Could not retrieve transcription output from S3.");
    }

    const transcriptionResult = JSON.parse(await Body.transformToString());
    
    // Flatten transcript to plain text for search and AI
    const transcriptText = transcriptionResult.results?.transcripts
      ?.map((t: any) => t.transcript)
      .join(" ") || "";

    // PERFORM DIRECT DYNAMODB UPDATE HERE
    await documentClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
      UpdateExpression: "SET transcriptJson = :transcriptJson, transcriptText = :transcriptText, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":transcriptJson": transcriptionResult,
        ":transcriptText": transcriptText,
        ":updatedAt": new Date().toISOString(),
      },
    }));

    // Trigger AI summarization via Inngest (Plan 02-03)
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({
      name: "session/transcription.completed",
      data: { sessionId, userId }, // NOW INCLUDING userId
    });

    return NextResponse.json({ message: `Successfully processed transcription for session ${sessionId}` }, { status: 200 });
  } catch (error) {
    console.error("Error processing Transcribe webhook:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}