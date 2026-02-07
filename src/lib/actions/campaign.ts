"use server";

// import prisma from "@/lib/prisma"; // REMOVED
import { documentClient } from "@/lib/dynamodb"; // ADDED
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"; // ADDED
import { nanoid } from 'nanoid'; // ADDED for unique IDs

import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { revalidatePath } from "next/cache";
import { createCampaignSchema, updateCampaignSchema } from "@/validation/campaign";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "rpg-prod"; // Dynamodb Table Name

export async function createCampaign(data: { name: string; description?: string }) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validatedData = createCampaignSchema.parse(data);
  const campaignId = nanoid(); // Generate unique ID

  const campaignItem = {
    PK: `USER#${session.user.id}`,
    SK: `CAMPAIGN#${campaignId}`,
    EntityType: 'Campaign',
    id: campaignId,
    userId: session.user.id, // Stored for easier filtering/access if needed, though PK already has it
    name: validatedData.name,
    description: validatedData.description || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await documentClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: campaignItem,
  }));

  revalidatePath("/dashboard");
  return campaignItem; // Return the created item
}

export async function getCampaigns() {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const { Items } = await documentClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${session.user.id}`,
      ":sk_prefix": "CAMPAIGN#",
    },
    // No 'include' for sessions here; sessions will be fetched separately if needed
  }));

  // Map DynamoDB items back to a structure similar to Prisma's output if necessary,
  // or simply return the raw DynamoDB items. For now, returning raw items.
  return (Items || []).map(item => ({
    id: item.id,
    userId: item.userId,
    name: item.name,
    description: item.description,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    // sessions: [] // Placeholder, as sessions are not included here
  }));
}

export async function getCampaignById(id: string) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const { Item } = await documentClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${session.user.id}`,
      SK: `CAMPAIGN#${id}`,
    },
  }));

  if (!Item) return null;

  // Map DynamoDB item back to a structure similar to Prisma's output
  return {
    id: Item.id,
    userId: Item.userId,
    name: Item.name,
    description: Item.description,
    createdAt: Item.createdAt,
    updatedAt: Item.updatedAt,
    // sessions: [] // Placeholder
  };
}

export async function updateCampaign(id: string, data: { name?: string; description?: string }) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validatedData = updateCampaignSchema.parse(data);

  const updateExpressionParts: string[] = [];
  const ExpressionAttributeValues: Record<string, any> = {};
  const ExpressionAttributeNames: Record<string, string> = {};

  if (validatedData.name !== undefined) {
    updateExpressionParts.push("#name = :name");
    ExpressionAttributeValues[":name"] = validatedData.name;
    ExpressionAttributeNames["#name"] = "name";
  }
  if (validatedData.description !== undefined) {
    updateExpressionParts.push("#description = :description");
    ExpressionAttributeValues[":description"] = validatedData.description;
    ExpressionAttributeNames["#description"] = "description";
  }

  if (updateExpressionParts.length === 0) {
    // No updates to perform
    const existingCampaign = await getCampaignById(id);
    if (!existingCampaign) throw new Error("Campaign not found");
    return existingCampaign;
  }

  updateExpressionParts.push("#updatedAt = :updatedAt");
  ExpressionAttributeValues[":updatedAt"] = new Date().toISOString();
  ExpressionAttributeNames["#updatedAt"] = "updatedAt";

  const UpdateExpression = "SET " + updateExpressionParts.join(", ");

  const { Attributes } = await documentClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${session.user.id}`,
      SK: `CAMPAIGN#${id}`,
    },
    UpdateExpression,
    ExpressionAttributeValues,
    ExpressionAttributeNames,
    ReturnValues: "ALL_NEW", // Return the updated item
  }));

  revalidatePath("/dashboard");
  revalidatePath(`/campaigns/${id}`);

  // Map DynamoDB attributes back
  if (!Attributes) throw new Error("Failed to update campaign");
  return {
    id: Attributes.id,
    userId: Attributes.userId,
    name: Attributes.name,
    description: Attributes.description,
    createdAt: Attributes.createdAt,
    updatedAt: Attributes.updatedAt,
  };
}

export async function deleteCampaign(id: string) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await documentClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${session.user.id}`,
      SK: `CAMPAIGN#${id}`,
    },
  }));

  revalidatePath("/dashboard");
}