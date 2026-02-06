import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { summarizeSession } from "@/lib/ai/summarize";
import { generatePlayerRecap } from "@/lib/ai/recap";

export const summarizeSessionJob = inngest.createFunction(
  { id: "summarize-session" },
  { event: "session/transcription.completed" },
  async ({ event, step }) => {
    const { sessionId } = event.data;

    const session = await step.run("fetch-session", async () => {
      return await prisma.session.findUnique({
        where: { id: sessionId },
        include: { campaign: true },
      });
    });

    if (!session || !session.transcriptText) {
      return { message: "Session or transcript not found" };
    }

    const summary = await step.run("generate-summary", async () => {
      return await summarizeSession(
        session.transcriptText!,
        session.campaign?.description || undefined
      );
    });

    // Generate player recap as a separate step. 
    // We catch errors so failure here doesn't prevent updating the session with the main summary.
    const playerRecap = await step.run("generate-player-recap", async () => {
      try {
        return await generatePlayerRecap(
          session.transcriptText!,
          session.notes || "",
          session.campaign?.description || ""
        );
      } catch (error) {
        console.error("Error generating player recap:", error);
        return null;
      }
    });

    await step.run("update-session", async () => {
      await prisma.session.update({
        where: { id: sessionId },
        data: { 
          summary,
          playerRecap: playerRecap ?? undefined,
        },
      });
    });

    return { message: "Summary and player recap generated successfully", sessionId };
  }
);
