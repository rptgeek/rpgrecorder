import { s3Client } from "./s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const bucketName = process.env.AWS_S3_BUCKET_NAME;

/**
 * Uploads a transcript to S3 and returns the storage key.
 * @param sessionId The ID of the session the transcript belongs to.
 * @param content The stringified transcript content (JSON or text).
 * @returns The S3 key where the transcript is stored.
 */
export async function uploadTranscript(sessionId: string, content: string): Promise<string> {
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set.");
  }

  const key = `transcripts/${sessionId}.json`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: content,
    ContentType: "application/json",
  });

  await s3Client.send(command);
  return key;
}

/**
 * Retrieves a transcript from S3 given its storage key.
 * @param key The S3 key of the transcript.
 * @returns The transcript content as a string.
 */
export async function getTranscript(key: string): Promise<string> {
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set.");
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    return "";
  }

  const content = await response.Body.transformToString();
  return content;
}
