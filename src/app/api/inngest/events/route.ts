import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
// import prisma from "@/lib/prisma"; // REMOVED
import { documentClient } from "@/lib/dynamodb"; // ADDED
import { GetCommand } from "@aws-sdk/lib-dynamodb"; // ADDED

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "rpg-prod"; // Dynamodb Table Name

export async function POST(req: NextRequest) {
  try {
    const { name, data } = await req.json();

    if (!name || !data) {
      return NextResponse.json({ message: "Missing event name or data" }, { status: 400 });
    }

    // Verify user authentication
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify session ownership if sessionId is provided
    if (data.sessionId) {
      const { Item: sessionRecord } = await documentClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${session.user.id}`,
          SK: `SESSION#${data.sessionId}`,
        },
      }));

      if (!sessionRecord) {
        return NextResponse.json({ message: "Session not found or unauthorized" }, { status: 403 });
      }

      // **IMPORTANT NOTE:** The Inngest event `session/transcription.completed`
      // emitted from src/app/api/transcribe-webhook/route.ts currently only passes
      // `sessionId`. For the `summarizeSessionJob` in Inngest to work correctly
      // with DynamoDB's single-table design (PK: USER#<userId>), the `userId`
      // MUST be included in the event data. This will need to be updated in
      // src/app/api/transcribe-webhook/route.ts as well.
      // For now, I will modify the `inngest.send` below to pass userId.
      data.userId = session.user.id; // ADDED userId to event data for Inngest function
    }

    await inngest.send({
      name,
      data,
    });

    return NextResponse.json({ message: `Event ${name} sent successfully` }, { status: 200 });
  } catch (error) {
    console.error("Error sending Inngest event:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}