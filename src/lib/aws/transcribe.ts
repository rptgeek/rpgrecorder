import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";

const awsRegion = process.env.AWS_REGION || "us-east-1"; // Use same region as S3
const s3BucketName = process.env.AWS_S3_BUCKET_NAME!; // Primary S3 bucket for audio input
const awsTranscribeOutputBucket = process.env.AWS_TRANSCRIBE_OUTPUT_BUCKET || s3BucketName; // Default to S3 upload bucket
const awsTranscribeIamRoleArn = process.env.AWS_TRANSCRIBE_IAM_ROLE_ARN!;

export const transcribeClient = new TranscribeClient({
  region: awsRegion,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function startTranscriptionJob(
  sessionId: string,
  audioKey: string,
  userId: string
) {
  if (!s3BucketName || !awsTranscribeOutputBucket || !awsTranscribeIamRoleArn) {
    throw new Error("Missing AWS S3 bucket name, Transcribe output bucket, or IAM role ARN environment variables.");
  }

  const jobName = `rpg-session-${sessionId}-${Date.now()}`;
  const mediaUri = `s3://${s3BucketName}/${audioKey}`; // Use the primary S3 bucket for input

  const params = {
    TranscriptionJobName: jobName,
    LanguageCode: "en-US", // Hardcoded for now, could be dynamic
    MediaFormat: "webm", // Hardcoded for now, could be dynamic
    Media: {
      MediaFileUri: mediaUri,
    },
    OutputBucketName: awsTranscribeOutputBucket,
    OutputKey: `transcripts/${jobName}.json`, // Transcribe will write the JSON result here
    Settings: {
      ShowSpeakerLabels: true,
      MaxSpeakerLabels: 5, // Up to 5 speakers for diarization
    },
    DataAccessRoleArn: awsTranscribeIamRoleArn, // IAM role for Transcribe to access S3
    Tags: [
      { Key: "sessionId", Value: sessionId },
      { Key: "userId", Value: userId },
    ],
  };

  try {
    const command = new StartTranscriptionJobCommand(params);
    const response = await transcribeClient.send(command);
    return response.TranscriptionJob;
  } catch (error) {
    console.error("Error starting Transcribe job:", error);
    throw new Error("Failed to start transcription job.");
  }
}
