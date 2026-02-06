"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { revalidatePath } from "next/cache";
import { createCampaignSchema, updateCampaignSchema } from "@/validation/campaign";

export async function createCampaign(data: { name: string; description?: string }) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validatedData = createCampaignSchema.parse(data);

  const campaign = await prisma.campaign.create({
    data: {
      ...validatedData,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  return campaign;
}

export async function getCampaigns() {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return await prisma.campaign.findMany({
    where: { userId: session.user.id },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaignById(id: string) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return await prisma.campaign.findUnique({
    where: { id, userId: session.user.id },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateCampaign(id: string, data: { name?: string; description?: string }) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validatedData = updateCampaignSchema.parse(data);

  const campaign = await prisma.campaign.update({
    where: { id, userId: session.user.id },
    data: validatedData,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/campaigns/${id}`);
  return campaign;
}

export async function deleteCampaign(id: string) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.campaign.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard");
}
