import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { getSessionById, updateSession, deleteSession } from "@/lib/actions/session";
import { updateSessionSchema } from "@/validation/session";
import { z } from "zod";

interface SessionApiRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, context: SessionApiRouteContext) {
  const session = await getServerSession(authConfig);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const sessionData = await getSessionById(id); // getSessionById already includes userId check

    return NextResponse.json(sessionData, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      if (error.message.includes("unauthorized")) {
        return NextResponse.json({ message: error.message }, { status: 403 });
      }
    }
    console.error("Error fetching session:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: SessionApiRouteContext) {
  const session = await getServerSession(authConfig);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateSessionSchema.parse(body);

    const updatedSession = await updateSession(id, validatedData);

    return NextResponse.json(updatedSession, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request payload", errors: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      if (error.message.includes("unauthorized")) {
        return NextResponse.json({ message: error.message }, { status: 403 });
      }
    }
    console.error("Error updating session:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH can also be implemented similarly to PUT, for partial updates.
// For simplicity, we'll use PUT for full replacement or partial if data only contains partial.
// Plan specifies PUT/PATCH, so PUT is sufficient if it handles partial updates from validatedData.

export async function DELETE(req: NextRequest, context: SessionApiRouteContext) {
  const session = await getServerSession(authConfig);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await deleteSession(id); // deleteSession already includes userId check

    return NextResponse.json({ message: "Session deleted successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      if (error.message.includes("unauthorized")) {
        return NextResponse.json({ message: error.message }, { status: 403 });
      }
    }
    console.error("Error deleting session:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
