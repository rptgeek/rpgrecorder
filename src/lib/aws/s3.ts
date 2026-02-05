import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const awsRegion = process.env.AWS_REGION || "us-east-1"; // Default to us-east-1 if not set
const s3BucketName = process.env.AWS_S3_BUCKET_NAME!;

export const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface PresignedPostOptions {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
  maxFileSize?: number;
}

export async function generatePresignedPost({
  key,
  contentType,
  expiresInSeconds = 3600, // 1 hour
  maxFileSize = 104857600, // 100 MB
}: PresignedPostOptions) {
  try {
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: s3BucketName,
      Key: key,
      Expires: expiresInSeconds,
      Conditions: [
        ["content-length-range", 0, maxFileSize], // Min 0, Max 100 MB
        ["starts-with", "$Content-Type", contentType],
      ],
    });

    return { url, fields };
  } catch (error) {
    console.error("Error generating presigned POST URL:", error);
    throw new Error("Failed to generate presigned POST URL.");
  }
}

export async function generatePresignedGetObject(key: string, expiresInSeconds: number = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: s3BucketName,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    return url;
  } catch (error) {
    console.error("Error generating presigned GET URL:", error);
    throw new Error("Failed to generate presigned GET URL.");
  }
}

