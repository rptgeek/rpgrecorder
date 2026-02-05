import { z } from "zod";

export const createSessionSchema = z.object({
  name: z.string().min(1, "Session name is required."),
  description: z.string().optional(),
  audioStorageKey: z.string().optional(),
  transcriptionJobId: z.string().optional(),
  transcriptJson: z.any().optional(), // Using z.any() for Json type
  notes: z.string().optional(),
});

export const updateSessionSchema = z.object({
  name: z.string().min(1, "Session name is required.").optional(),
  description: z.string().optional(),
  audioStorageKey: z.string().optional(),
  transcriptionJobId: z.string().optional(),
  transcriptJson: z.any().optional(), // Using z.any() for Json type
  notes: z.string().optional(),
});
