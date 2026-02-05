---
phase: 1-foundation---recording-&-transcription
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/aws/s3.ts
  - .env
  - package.json
autonomous: true
user_setup:
  - service: AWS S3
    why: "Storing audio recordings and transcriptions"
    env_vars:
      - name: AWS_ACCESS_KEY_ID
        source: "Your AWS IAM Access Key ID (with S3 and Transcribe permissions)"
      - name: AWS_SECRET_ACCESS_KEY
        source: "Your AWS IAM Secret Access Key"
      - name: AWS_REGION
        source: "The AWS region for your S3 bucket (e.g., us-east-1)"
      - name: AWS_S3_BUCKET_NAME
        source: "The name of your S3 bucket for audio uploads"
    dashboard_config:
      - task: "Create an S3 bucket in your AWS account"
        location: "AWS Console -> S3 -> Buckets -> Create bucket"
      - task: "Configure S3 bucket CORS policy to allow uploads from your frontend domain"
        location: "AWS Console -> S3 -> Your bucket -> Permissions -> Cross-origin resource sharing (CORS)"
        details: |
          Example CORS policy (adjust origins as needed):
          ```json
          [
              {
                  "AllowedHeaders": ["*"],
                  "AllowedMethods": ["PUT", "POST", "DELETE", "GET", "HEAD"],
                  "AllowedOrigins": ["http://localhost:3000", "https://your-frontend-domain.com"],
                  "ExposeHeaders": [],
                  "MaxAgeSeconds": 3000
              }
          ]
          ```
must_haves:
  truths:
    - "Backend can successfully interact with AWS S3."
    - "Utility functions for generating presigned URLs are available."
  artifacts:
    - path: "src/lib/aws/s3.ts"
      provides: "AWS S3 client and utility functions for S3 operations"
      min_lines: 20
    - path: ".env"
      provides: "AWS credential and S3 bucket environment variables"
      contains: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET_NAME"]
  key_links:
    - from: "src/lib/aws/s3.ts"
      to: "AWS S3 Service"
      via: "@aws-sdk/client-s3"
      pattern: "new S3Client()"
---

<objective>
Configure the AWS SDK for S3 and implement utility functions for generating presigned URLs.

Purpose: Establish the foundational AWS S3 integration, allowing the application to interact with S3 buckets and prepare for direct client-side uploads.
Output: Configured S3 client, environment variables for AWS S3, and a function to generate presigned S3 POST URLs.
</objective>

<execution_context>
@/home/ubuntu/.gemini/get-shit-done/workflows/execute-plan.md
@/home/ubuntu/.gemini/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Configure AWS SDK for S3 and environment variables</name>
  <files>
    package.json
    src/lib/aws/s3.ts
    .env
  </files>
  <action>
    Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
    Create `src/lib/aws/s3.ts` to initialize an S3 client using environment variables for credentials and region.
    Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME` to `.env` with placeholders.
  </action>
  <verify>
    `npm list @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` shows installed.
    `src/lib/aws/s3.ts` initializes `S3Client` correctly.
    `.env` contains all required AWS S3 environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`).
  </verify>
  <done>
    AWS S3 SDK is configured, and environment variables are set up.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement Presigned POST URL generation function</name>
  <files>
    src/lib/aws/s3.ts
  </files>
  <action>
    In `src/lib/aws/s3.ts`, implement a function (e.g., `generatePresignedPost`) that takes an S3 key (file path) and optional content type.
    This function should use `createPresignedPost` from `@aws-sdk/s3-request-presigner` to generate a presigned URL and form fields for a direct S3 POST upload.
    Set appropriate conditions for the presigned post (e.g., maximum file size, content type, expiration).
  </action>
  <verify>
    `src/lib/aws/s3.ts` exports `generatePresignedPost` function.
    Calling `generatePresignedPost` with a dummy key (e.g., "test/audio.webm") returns an object containing `url` and `fields` (without actually hitting AWS if mocked).
  </verify>
  <done>
    Utility function for generating S3 presigned POST URLs is implemented.
  </done>
</task>

</tasks>

<verification>
1.  Ensure AWS credentials and S3 bucket name are correctly set in `.env`.
2.  Verify `npm install` for AWS SDK packages completes successfully.
3.  Manually inspect `src/lib/aws/s3.ts` to confirm `S3Client` initialization and `generatePresignedPost` function exist.
</verification>

<success_criteria>
- Backend is successfully configured to interact with AWS S3.
- Utility function for generating S3 presigned URLs is available.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-04-SUMMARY.md`
</output>