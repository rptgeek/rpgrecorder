import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { createSession, getSessions } from "@/lib/actions/session"; // Assuming these actions are available
import { createSessionSchema } from "@/validation/session"; // Assuming this schema is available
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createSessionSchema.parse(body);

    const newSession = await createSession({
      name: validatedData.name,
      description: validatedData.description,
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request payload", errors: error.issues }, { status: 400 });
    }
    console.error("Error creating session:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authConfig);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await getSessions();
    return NextResponse.json(sessions, { status: 200 });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
