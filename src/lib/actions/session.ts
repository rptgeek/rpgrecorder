import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth"; // Using alias for src/auth.ts
import { createSessionSchema, updateSessionSchema } from "@/validation/session"; // Using alias for src/validation/session.ts
import { z } from "zod";
import { startTranscriptionJob } from "@/lib/aws/transcribe"; // Import startTranscriptionJob

const prisma = new PrismaClient();

// Helper to get current user's ID
async function getCurrentUserId() {
  const session = await getServerSession(authConfig);
  if (!session || !session.user || !session.user.id) {
    throw new Error("Unauthorized: No active session or user ID.");
  }
  return session.user.id;
}

export async function createSession(
  data: z.infer<typeof createSessionSchema>
) {
  const userId = await getCurrentUserId();
  const validatedData = createSessionSchema.parse(data);

  const session = await prisma.session.create({
    data: {
      name: validatedData.name,
      description: validatedData.description,
      audioStorageKey: validatedData.audioStorageKey,
      transcriptionJobId: validatedData.transcriptionJobId,
      transcriptJson: validatedData.transcriptJson,
      notes: validatedData.notes,
      userId: userId,
    },
  });
  return session;
}

export async function getSessions() {
  const userId = await getCurrentUserId();
  const sessions = await prisma.session.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return sessions;
}

export async function getSessionById(id: string) {
  const userId = await getCurrentUserId();
  const session = await prisma.session.findUnique({
    where: {
      id: id,
      userId: userId, // Ensure ownership
    },
  });

  if (!session) {
    throw new Error("Session not found or unauthorized.");
  }
  return session;
}

export async function updateSession(
  id: string,
  data: z.infer<typeof updateSessionSchema>
) {
  const userId = await getCurrentUserId();
  const validatedData = updateSessionSchema.parse(data);

  const existingSession = await prisma.session.findUnique({
    where: { id: id, userId: userId },
  });

  if (!existingSession) {
    throw new Error("Session not found or unauthorized.");
  }

  const updatedSession = await prisma.session.update({
    where: { id: id },
    data: {
      name: validatedData.name,
      description: validatedData.description,
      audioStorageKey: validatedData.audioStorageKey,
      transcriptionJobId: validatedData.transcriptionJobId,
      transcriptJson: validatedData.transcriptJson,
      notes: validatedData.notes,
    },
  });

  // If audioStorageKey is updated/added, initiate transcription job
  if (validatedData.audioStorageKey && validatedData.audioStorageKey !== existingSession.audioStorageKey) {
    try {
      const job = await startTranscriptionJob(id, validatedData.audioStorageKey, userId);
      // Update session with transcriptionJobId
      await prisma.session.update({
        where: { id: id },
        data: {
          transcriptionJobId: job?.TranscriptionJobName,
        },
      });
    } catch (transcribeError) {
      console.error("Failed to initiate transcription job:", transcribeError);
      // Handle error, e.g., notify user, log to a different service
    }
  }

  return updatedSession;
}

export async function deleteSession(id: string) {
  const userId = await getCurrentUserId();

  const existingSession = await prisma.session.findUnique({
    where: { id: id, userId: userId },
  });

  if (!existingSession) {
    throw new Error("Session not found or unauthorized.");
  }

  await prisma.session.delete({
    where: { id: id },
  });
  return { message: "Session deleted successfully." };
}
