import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
// import prisma from "@/lib/prisma"; // REMOVED
import { documentClient } from "@/lib/dynamodb"; // ADDED
import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb"; // ADDED
import { createCampaignSchema } from "@/validation/campaign";
import { nanoid } from 'nanoid'; // ADDED for unique IDs

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "rpg-prod"; // Dynamodb Table Name

export async function GET() {
  const session = await getServerSession(authConfig);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { Items: campaigns } = await documentClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${session.user.id}`,
        ":sk_prefix": "CAMPAIGN#",
      },
      ScanIndexForward: false, // Order by createdAt desc (if SK is sorted by it)
    }));

    // NOTE: The _count.select.sessions functionality from Prisma is not directly
    // supported by a single Query in DynamoDB. It would require a separate
    // Query for each campaign to count its sessions, or a more complex
    // GSI design. For now, we return campaigns without session count.
    // If needed, this could be added by iterating through campaigns and
    // performing another Query for sessions.

    return NextResponse.json(campaigns || []);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createCampaignSchema.parse(body);
    const campaignId = nanoid(); // Generate unique ID

    const campaignItem = {
      PK: `USER#${session.user.id}`,
      SK: `CAMPAIGN#${campaignId}`,
      EntityType: 'Campaign',
      id: campaignId,
      userId: session.user.id,
      name: validatedData.name,
      description: validatedData.description || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await documentClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: campaignItem,
    }));

    return NextResponse.json(campaignItem, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request data", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}