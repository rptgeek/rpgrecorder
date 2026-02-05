import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth"; // Assuming authConfig is exported from here
import { generatePresignedPost } from "@/lib/aws/s3"; // Assuming generatePresignedPost is exported from here
import { z } from "zod";

const requestSchema = z.object({
  filename: z.string().min(1, "Filename is required."),
  contentType: z.string().min(1, "Content type is required."),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { filename, contentType } = requestSchema.parse(body);

    // Ensure the S3 key incorporates the userId to enforce ownership
    const s3Key = `${session.user.id}/${Date.now()}-${filename}`;

    const { url, fields } = await generatePresignedPost({
      key: s3Key,
      contentType: contentType,
    });

    return NextResponse.json({ url, fields, key: s3Key });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request payload", errors: error.errors }, { status: 400 });
    }
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
