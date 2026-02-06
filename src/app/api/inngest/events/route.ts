import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
  try {
    const { name, data } = await req.json();

    if (!name || !data) {
      return NextResponse.json({ message: "Missing event name or data" }, { status: 400 });
    }

    // For security in a real app, you would verify the user's session 
    // and check if they have permission (GM role) to trigger this for this sessionId.
    
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
