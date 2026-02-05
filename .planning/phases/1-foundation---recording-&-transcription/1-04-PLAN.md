---
phase: 1-foundation---recording-&-transcription
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/upload/presigned-url/route.ts
  - src/lib/aws/s3.ts
  - .env
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
    - "An authenticated API request returns a valid presigned URL for S3 POST upload."
    - "The presigned URL allows direct client-side upload to the specified S3 bucket."
    - "Unauthenticated requests to the presigned URL endpoint are rejected."
  artifacts:
    - path: "src/app/api/upload/presigned-url/route.ts"
      provides: "API endpoint for generating S3 presigned URLs"
      min_lines: 30
      exports: ["POST"]
    - path: "src/lib/aws/s3.ts"
      provides: "AWS S3 client and utility functions for S3 operations"
      min_lines: 20
    - path: ".env"
      provides: "AWS credential and S3 bucket environment variables"
      contains: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET_NAME"]
  key_links:
    - from: "src/app/api/upload/presigned-url/route.ts"
      to: "src/lib/aws/s3.ts"
      via: "import and call generatePresignedPost"
      pattern: "generatePresignedPost"
    - from: "src/app/api/upload/presigned-url/route.ts"
      to: "Auth.js session"
      via: "getServerSession"
      pattern: "getServerSession\(authConfig\)"
---

<objective>
Implement a server-side endpoint to securely generate presigned URLs for direct client-side upload of audio files to AWS S3.

Purpose: Enable efficient and secure handling of large audio file uploads without proxying through the backend, fulfilling part of AUDIO-02. This allows the client to upload directly to S3, reducing backend load and improving performance.
Output: An API endpoint that returns a presigned URL and fields necessary for a direct S3 POST upload.
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
    `.env` contains all required AWS S3 environment variables.
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
    Set appropriate conditions for the presigned post (e.g., maximum file size, content type).
  </action>
  <verify>
    `src/lib/aws/s3.ts` exports `generatePresignedPost` function.
    Calling `generatePresignedPost` with a key returns an object containing `url` and `fields`.
  </verify>
  <done>
    Utility function for generating S3 presigned POST URLs is implemented.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create API endpoint for Presigned URL generation</name>
  <files>
    src/app/api/upload/presigned-url/route.ts
  </files>
  <action>
    Create `src/app/api/upload/presigned-url/route.ts`.
    Implement a `POST` method that:
    - Uses `getServerSession` (from Auth.js) to authenticate the request.
    - Extracts `filename` and `contentType` from the request body.
    - Calls the `generatePresignedPost` function from `src/lib/aws/s3.ts` to get a presigned URL and fields.
    - Returns the presigned URL and fields in the response.
    - Handles unauthenticated requests with a 401 status.
    - Ensures the S3 key incorporates the `userId` to enforce ownership and prevent naming conflicts (e.g., `user-id/session-id/audio.webm`).
  </action>
  <verify>
    `curl -X POST -H "Authorization: Bearer <token>" -d '{"filename":"test.webm", "contentType":"audio/webm"}' /api/upload/presigned-url` returns a JSON object with `url` and `fields`.
    Unauthenticated request returns 401.
    The `url` and `fields` are valid for a short period (e.g., 5-10 minutes).
  </verify>
  <done>
    Secure, authenticated API endpoint for generating S3 presigned POST URLs is fully functional.
  </done>
</task>

</tasks>

<verification>
1.  Ensure AWS credentials and S3 bucket name are correctly set in `.env`.
2.  Ensure your S3 bucket has the necessary CORS policy configured.
3.  Log in as a test user via the application.
4.  Use `curl` or a client to make an authenticated POST request to `/api/upload/presigned-url` with a sample filename and content type.
5.  Verify that a valid presigned URL and fields are returned.
6.  Attempt to make the same request without authentication and verify it returns a 401 Unauthorized status.
</verification>

<success_criteria>
- Backend is successfully configured to interact with AWS S3.
- An authenticated API endpoint is available for generating presigned URLs for S3 POST uploads.
- The generated URLs are functional and allow direct client-side uploads.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-04-SUMMARY.md`
</output>
