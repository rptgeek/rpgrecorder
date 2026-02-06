import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required."),
  description: z.string().optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required.").optional(),
  description: z.string().optional(),
});
