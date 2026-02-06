import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import prisma from "@/lib/prisma";

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
      const sessionRecord = await prisma.session.findUnique({
        where: { id: data.sessionId, userId: session.user.id },
      });

      if (!sessionRecord) {
        return NextResponse.json({ message: "Session not found or unauthorized" }, { status: 403 });
      }
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
