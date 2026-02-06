import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/actions/session";
import { s3Client } from "@/lib/aws/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

// This is a placeholder webhook endpoint.
// In a real-world scenario, AWS Transcribe does not directly call a webhook.
// You would typically set up an S3 Event Notification to an SNS topic,
// then use an AWS Lambda function subscribed to the SNS topic to call this API route,
// or use AWS EventBridge to trigger a Lambda function to call this API route.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Transcribe Webhook received:", JSON.stringify(body, null, 2));

    // AWS Transcribe completion notifications typically come from SNS,
    // which in turn gets triggered by an S3 event.
    // The structure of the event can vary. This example assumes a simplified payload
    // where job details are directly available or can be inferred.

    // A more robust solution would parse a complex SNS notification body.
    // For now, we'll assume the body directly contains what we need for a completed job.
    // Example: { "jobName": "rpg-session-sessionId-timestamp", "jobStatus": "COMPLETED", "outputLocation": "s3://bucket/path/to/job.json" }

    const { TranscriptionJobName, TranscriptionJobStatus, OutputLocation } = body.detail || body;

    if (!TranscriptionJobName || !TranscriptionJobStatus || !OutputLocation) {
      return NextResponse.json({ message: "Invalid Transcribe webhook payload" }, { status: 400 });
    }

    if (TranscriptionJobStatus !== "COMPLETED") {
      console.log(`Transcription job ${TranscriptionJobName} not completed. Status: ${TranscriptionJobStatus}`);
      return NextResponse.json({ message: `Job ${TranscriptionJobName} status: ${TranscriptionJobStatus}` }, { status: 200 });
    }

    // Extract sessionId from jobName (assuming jobName format: rpg-session-sessionId-timestamp)
    const sessionIdMatch = TranscriptionJobName.match(/rpg-session-([a-f0-9-]+)-\d+/);
    if (!sessionIdMatch || !sessionIdMatch[1]) {
      console.error("Could not extract sessionId from jobName:", TranscriptionJobName);
      return NextResponse.json({ message: "Could not extract sessionId from jobName" }, { status: 400 });
    }
    const sessionId = sessionIdMatch[1];

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

    // Update session with transcriptJson and flattened text
    await updateSession(sessionId, { 
      transcriptJson: transcriptionResult,
      transcriptText: transcriptText
    });

    // Trigger AI summarization via Inngest (Plan 02-03)
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({
      name: "session/transcription.completed",
      data: { sessionId },
    });

    return NextResponse.json({ message: `Successfully processed transcription for session ${sessionId}` }, { status: 200 });
  } catch (error) {
    console.error("Error processing Transcribe webhook:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
