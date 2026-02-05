---
phase: 1-foundation---recording-&-transcription
plan: 11
type: execute
wave: 2
depends_on: ["1-02", "1-04"]
files_modified:
  - src/app/api/upload/presigned-url/route.ts
autonomous: true
user_setup:
  - service: AWS S3
    why: "Storing audio recordings and transcriptions"
    env_vars: [] # Already covered in 1-04
    dashboard_config:
      - task: "Ensure S3 bucket CORS policy is configured to allow uploads from your frontend domain"
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
    - "An authenticated API request returns a valid presigned URL for S3 POST upload."
    - "The presigned URL allows direct client-side upload to the specified S3 bucket."
    - "Unauthenticated requests to the presigned URL endpoint are rejected."
  artifacts:
    - path: "src/app/api/upload/presigned-url/route.ts"
      provides: "API endpoint for generating S3 presigned URLs"
      min_lines: 30
      exports: ["POST"]
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
Implement an API endpoint to securely generate presigned URLs for direct client-side upload of audio files to AWS S3.

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
@.planning/phases/1-foundation---recording-&-transcription/1-02-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-04-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create API endpoint for Presigned URL generation</name>
  <files>
    src/app/api/upload/presigned-url/route.ts
  </files>
  <action>
    Create `src/app/api/upload/presigned-url/route.ts`.
    Implement a `POST` method that:
    - Uses `getServerSession` (from Auth.js Plan 02) to authenticate the request.
    - Extracts `filename` and `contentType` from the request body.
    - Calls the `generatePresignedPost` function from `src/lib/aws/s3.ts` (Plan 04) to get a presigned URL and fields.
    - Returns the presigned URL and fields in the response.
    - Handles unauthenticated requests with a 401 status.
    - Ensures the S3 key incorporates the `userId` to enforce ownership and prevent naming conflicts (e.g., `user-id/session-id/audio.webm`).
  </action>
  <verify>
    Using an authenticated `curl -X POST -H "Authorization: Bearer <token>" -d '{"filename":"test.webm", "contentType":"audio/webm"}' /api/upload/presigned-url` returns a JSON object with `url` and `fields`.
    An unauthenticated request returns 401.
    The `url` and `fields` are valid for a short period (e.g., 5-10 minutes).
  </verify>
  <done>
    Secure, authenticated API endpoint for generating S3 presigned POST URLs is fully functional.
  </done>
</task>

</tasks>

<verification>
1.  Ensure AWS credentials and S3 bucket name are correctly set in `.env` (from Plan 1-04).
2.  Ensure your S3 bucket has the necessary CORS policy configured.
3.  Log in as a test user via the application (from Plan 1-10).
4.  Use `curl` or a client to make an authenticated POST request to `/api/upload/presigned-url` with a sample filename and content type.
5.  Verify that a valid presigned URL and fields are returned.
6.  Attempt to make the same request without authentication and verify it returns a 401 Unauthorized status.
</verification>

<success_criteria>
- An authenticated API endpoint is available for generating presigned URLs for S3 POST uploads.
- The generated URLs are functional and allow direct client-side uploads.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-11-SUMMARY.md`
</output>
