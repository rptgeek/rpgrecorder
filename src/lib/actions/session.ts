"use server";

// import prisma from "@/lib/prisma"; // REMOVED
import { documentClient } from "@/lib/dynamodb"; // ADDED
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"; // ADDED
import { nanoid } from "nanoid"; // Used for unique IDs and share tokens

import { getServerSession } from "next-auth";
import { authConfig } from "@/auth"; // Using alias for src/auth.ts
import { createSessionSchema, updateSessionSchema } from "@/validation/session"; // Using alias for src/validation/session.ts
import { z } from "zod";
import { startTranscriptionJob, getTranscriptionJobStatus } from "@/lib/aws/transcribe"; 
import { s3Client } from "@/lib/aws/s3"; 
import { GetObjectCommand } from "@aws-sdk/client-s3";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "rpg-prod"; // Dynamodb Table Name

async function getCurrentUserId() {
  const session = await getServerSession(authConfig);
  if (!session || !session.user || !session.user.id) {
    throw new Error("Unauthorized: No active session or user ID.");
  }
  return session.user.id;
}

export async function getPublicSessionByToken(token: string) {
  // IMPORTANT: For production, a GSI on 'shareToken' would be required for efficient querying.
  // Using Scan with FilterExpression for now, which is inefficient for large datasets.
  const { Items } = await documentClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "shareToken = :token AND EntityType = :entityType",
    ExpressionAttributeValues: {
      ":token": token,
      ":entityType": "Session",
    },
  }));

  if (!Items || Items.length === 0) {
    return null;
  }

  const sessionItem = Items[0]; // Assuming shareToken is unique for a Session
  
  // To simulate 'include: { campaign: { select: { name: true } } }'
  let campaignName: string | undefined;
  if (sessionItem.campaignId) {
    const { Item: campaignItem } = await documentClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${sessionItem.userId}`, // Assuming Campaign PK is USER#userId
        SK: `CAMPAIGN#${sessionItem.campaignId}`,
      },
    }));
    campaignName = campaignItem?.name;
  }

  return {
    name: sessionItem.name,
    createdAt: sessionItem.createdAt,
    playerRecap: sessionItem.playerRecap,
    campaign: campaignName ? { name: campaignName } : undefined,
  };
}

export async function generateShareToken(sessionId: string) {
  const userId = await getCurrentUserId();
  
  const { Item: existingSession } = await documentClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${sessionId}`,
    },
  }));

  if (!existingSession) {
    throw new Error("Session not found or unauthorized.");
  }

  const token = nanoid(12);
  
  await documentClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${sessionId}`,
    },
    UpdateExpression: "SET shareToken = :token, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":token": token,
      ":updatedAt": new Date().toISOString(),
    },
  }));

  return token; // Return the generated token directly
}

export async function refreshSessionTranscription(sessionId: string) {
  const userId = await getCurrentUserId();
  const { Item: session } = await documentClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${sessionId}`,
    },
  }));

  if (!session || !session.transcriptionJobId) {
    throw new Error("No transcription job found for this session.");
  }

  const job = await getTranscriptionJobStatus(session.transcriptionJobId);

  if (job?.TranscriptionJobStatus === "COMPLETED" && job.Transcript?.TranscriptFileUri) {
    // Fetch results from S3
    const outputUri = job.Transcript.TranscriptFileUri;
    // Format is s3://bucket-name/key
    const bucketAndKey = outputUri.replace("s3://", "").split("/");
    const bucket = bucketAndKey[0];
    const key = bucketAndKey.slice(1).join("/");

    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    const transcriptBody = await s3Response.Body?.transformToString();
    if (transcriptBody) {
      const transcriptJson = JSON.parse(transcriptBody);
      
      await documentClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `SESSION#${sessionId}`,
        },
        UpdateExpression: "SET transcriptJson = :transcriptJson, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":transcriptJson": transcriptJson,
          ":updatedAt": new Date().toISOString(),
        },
      }));

      return { ...session, transcriptJson: transcriptJson }; // Return updated session
    }
  }

  return { status: job?.TranscriptionJobStatus };
}

export async function createSession(
  data: z.infer<typeof createSessionSchema>
) {
  const userId = await getCurrentUserId();
  const validatedData = createSessionSchema.parse(data);
  const sessionId = nanoid();

  const sessionItem = {
    PK: `USER#${userId}`,
    SK: `SESSION#${sessionId}`,
    EntityType: 'Session',
    id: sessionId,
    userId: userId,
    name: validatedData.name,
    description: validatedData.description ?? null,
    campaignId: validatedData.campaignId ?? null, // Stored as attribute for linking
    audioStorageKey: validatedData.audioStorageKey ?? null,
    transcriptionJobId: validatedData.transcriptionJobId ?? null,
    transcriptJson: validatedData.transcriptJson ?? null,
    transcriptText: validatedData.transcriptText ?? null,
    notes: validatedData.notes ?? null,
    speakerNames: validatedData.speakerNames ?? null,
    metrics: validatedData.metrics ?? null,
    playerRecap: validatedData.playerRecap ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // shareToken: null, // Initialized as null or absent
  };

  await documentClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: sessionItem,
  }));
  return sessionItem;
}

export async function getSessions() {
  const userId = await getCurrentUserId();
  const { Items } = await documentClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk_prefix": "SESSION#",
    },
    ScanIndexForward: false, // Order by createdAt desc (if SK is sorted by it)
  }));

  // Map DynamoDB items back to a structure similar to Prisma's output
  return (Items || []).map(item => ({
    id: item.id,
    userId: item.userId,
    name: item.name,
    description: item.description,
    campaignId: item.campaignId,
    audioStorageKey: item.audioStorageKey,
    transcriptionJobId: item.transcriptionJobId,
    transcriptJson: item.transcriptJson,
    transcriptText: item.transcriptText,
    notes: item.notes,
    speakerNames: item.speakerNames,
    metrics: item.metrics,
    playerRecap: item.playerRecap,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    shareToken: item.shareToken,
  }));
}

export async function getSessionById(id: string) {
  const userId = await getCurrentUserId();
  const { Item } = await documentClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${id}`,
    },
  }));

  if (!Item) {
    throw new Error("Session not found or unauthorized.");
  }

  // To simulate 'include: { campaign: true }'
  let campaignItem: any | undefined;
  if (Item.campaignId) {
    const { Item: fetchedCampaignItem } = await documentClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `CAMPAIGN#${Item.campaignId}`,
      },
    }));
    campaignItem = fetchedCampaignItem;
  }

  return {
    id: Item.id,
    userId: Item.userId,
    name: Item.name,
    description: Item.description,
    campaignId: Item.campaignId,
    audioStorageKey: Item.audioStorageKey,
    transcriptionJobId: Item.transcriptionJobId,
    transcriptJson: Item.transcriptJson,
    transcriptText: Item.transcriptText,
    notes: Item.notes,
    speakerNames: Item.speakerNames,
    metrics: Item.metrics,
    playerRecap: Item.playerRecap,
    createdAt: Item.createdAt,
    updatedAt: Item.updatedAt,
    shareToken: Item.shareToken,
    campaign: campaignItem ? {
      id: campaignItem.id,
      userId: campaignItem.userId,
      name: campaignItem.name,
      description: campaignItem.description,
      createdAt: campaignItem.createdAt,
      updatedAt: campaignItem.updatedAt,
    } : undefined,
  };
}

export async function updateSession(
  id: string,
  data: z.infer<typeof updateSessionSchema>
) {
  const userId = await getCurrentUserId();
  const validatedData = updateSessionSchema.parse(data);

  const { Item: existingSession } = await documentClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${id}`,
    },
  }));

  if (!existingSession) {
    throw new Error("Session not found or unauthorized.");
  }

  const updateExpressionParts: string[] = [];
  const ExpressionAttributeValues: Record<string, any> = {};
  const ExpressionAttributeNames: Record<string, string> = {};

  // Dynamically add fields from validatedData to update expression
  for (const key in validatedData) {
    if (validatedData.hasOwnProperty(key) && validatedData[key] !== undefined) {
      updateExpressionParts.push(`#${key} = :${key}`);
      ExpressionAttributeValues[`:${key}`] = validatedData[key];
      ExpressionAttributeNames[`#${key}`] = key;
    }
  }

  if (updateExpressionParts.length === 0) {
    // No updates to perform
    return existingSession; // Return existing session if no data to update
  }

  updateExpressionParts.push("#updatedAt = :updatedAt");
  ExpressionAttributeValues[":updatedAt"] = new Date().toISOString();
  ExpressionAttributeNames["#updatedAt"] = "updatedAt";

  const UpdateExpression = "SET " + updateExpressionParts.join(", ");

  const { Attributes: updatedAttributes } = await documentClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${id}`,
    },
    UpdateExpression,
    ExpressionAttributeValues,
    ExpressionAttributeNames,
    ReturnValues: "ALL_NEW", // Return the updated item
  }));

  // If audioStorageKey is updated/added, initiate transcription job
  if (validatedData.audioStorageKey && validatedData.audioStorageKey !== existingSession.audioStorageKey) {
    try {
      const job = await startTranscriptionJob(id, validatedData.audioStorageKey, userId);
      // Update session with transcriptionJobId
      // This will trigger another UpdateCommand, or we can include it in the current one
      // For simplicity, doing it as a separate update if needed
      if (job?.TranscriptionJobName) {
        await documentClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: `SESSION#${id}` },
          UpdateExpression: "SET transcriptionJobId = :jobId, updatedAt = :updatedAt",
          ExpressionAttributeValues: { ":jobId": job.TranscriptionJobName, ":updatedAt": new Date().toISOString() },
          ExpressionAttributeNames: { "#transcriptionJobId": "transcriptionJobId", "#updatedAt": "updatedAt" },
        }));
      }
    } catch (transcribeError) {
      console.error("Failed to initiate transcription job:", transcribeError);
      // Handle error, e.g., notify user, log to a different service
    }
  }

  if (!updatedAttributes) throw new Error("Failed to update session");
  return updatedAttributes; // Return the updated attributes
}

export async function deleteSession(id: string) {
  const userId = await getCurrentUserId();

  const { Item: existingSession } = await documentClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${id}`,
    },
  }));

  if (!existingSession) {
    throw new Error("Session not found or unauthorized.");
  }

  await documentClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${id}`,
    },
  }));
  return { message: "Session deleted successfully." };
}
