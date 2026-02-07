import { inngest } from "./client";
// import prisma from "@/lib/prisma"; // REMOVED
import { documentClient } from "@/lib/dynamodb"; // ADDED
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"; // ADDED
import { summarizeSession } from "@/lib/ai/summarize";
import { generatePlayerRecap } from "@/lib/ai/recap";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "rpg-prod"; // Dynamodb Table Name

export const summarizeSessionJob = inngest.createFunction(
  { id: "summarize-session" },
  { event: "session/transcription.completed" },
  async ({ event, step }) => {
    // NOTE: userId is NOT currently passed in event.data from transcribe-webhook.
    // This will need to be added to the event emission in src/app/api/transcribe-webhook/route.ts
    // For now, assuming it's available for the purpose of this file's migration.
    const { sessionId, userId } = event.data as { sessionId: string; userId: string; }; // ASSUMPTION: userId is passed

    // --- Fetch session ---
    const { Item: sessionItem } = await step.run("fetch-session", async () => {
      const { Item } = await documentClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`, // Requires userId from event data
          SK: `SESSION#${sessionId}`,
        },
      }));
      return Item;
    });

    if (!sessionItem || !sessionItem.transcriptText) {
      // If session not found, or transcript missing, log and return
      console.error(`Session (ID: ${sessionId}, UserID: ${userId}) or transcript not found for summarization.`);
      return { message: "Session or transcript not found" };
    }

    // --- Fetch associated campaign (if any) ---
    let campaignItem: any | undefined;
    if (sessionItem.campaignId) {
      const { Item: fetchedCampaignItem } = await step.run("fetch-campaign", async () => {
        const { Item } = await documentClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`, // Campaign also belongs to the same user
            SK: `CAMPAIGN#${sessionItem.campaignId}`,
          },
        }));
        return Item;
      });
      campaignItem = fetchedCampaignItem;
    }

    // --- Generate Summary ---
    const summary = await step.run("generate-summary", async () => {
      return await summarizeSession(
        sessionItem.transcriptText,
        campaignItem?.description || undefined
      );
    });

    // --- Generate Player Recap ---
    const playerRecap = await step.run("generate-player-recap", async () => {
      try {
        return await generatePlayerRecap(
          sessionItem.transcriptText,
          sessionItem.notes || "",
          campaignItem?.description || ""
        );
      } catch (error) {
        console.error("Error generating player recap:", error);
        return null; // Return null if recap generation fails
      }
    });

    // --- Update Session ---
    await step.run("update-session", async () => {
      const updateExpressionParts: string[] = [];
      const ExpressionAttributeValues: Record<string, any> = {};
      const ExpressionAttributeNames: Record<string, string> = {};

      updateExpressionParts.push("#summary_attr = :summary_val"); // Use unique placeholder name for summary
      ExpressionAttributeValues[":summary_val"] = summary;
      ExpressionAttributeNames["#summary_attr"] = "summary";

      if (playerRecap !== null) { // Only update if playerRecap was successfully generated
        updateExpressionParts.push("#playerRecap_attr = :playerRecap_val");
        ExpressionAttributeValues[":playerRecap_val"] = playerRecap;
        ExpressionAttributeNames["#playerRecap_attr"] = "playerRecap";
      }
      
      updateExpressionParts.push("#updatedAt_attr = :updatedAt_val");
      ExpressionAttributeValues[":updatedAt_val"] = new Date().toISOString();
      ExpressionAttributeNames["#updatedAt_attr"] = "updatedAt";

      const UpdateExpression = "SET " + updateExpressionParts.join(", ");

      await documentClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `SESSION#${sessionId}`,
        },
        UpdateExpression,
        ExpressionAttributeValues,
        ExpressionAttributeNames,
      }));
    });

    return { message: "Summary and player recap generated successfully", sessionId };
  }
);