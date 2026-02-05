---
phase: 1-foundation---recording-&-transcription
plan: 06
type: execute
wave: 2
depends_on: ["1-01", "1-05"] # Needs database setup and session actions for new fields
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/
  - package.json
  - src/lib/aws/transcribe.ts
  - .env
  - src/lib/actions/session.ts
autonomous: true
user_setup:
  - service: AWS Transcribe
    why: "Speech-to-text transcription and speaker diarization"
    env_vars: [] # Uses same AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION from S3 setup
    dashboard_config:
      - task: "Ensure the AWS IAM user used for S3 also has permissions for AWS Transcribe"
        location: "AWS Console -> IAM -> Users -> Your user -> Permissions"
        details: "Requires `transcribe:StartTranscriptionJob`, `transcribe:GetTranscriptionJob` and `iam:PassRole` if using roles."
      - task: "Create an IAM Role for Transcribe to write output to S3"
        location: "AWS Console -> IAM -> Roles -> Create role"
        details: "This role needs `s3:PutObject` permissions to your S3 bucket. AWS Transcribe will use this role to write the transcription output back to S3. Make sure to specify the 'Transcribe' service as the trusted entity."

must_haves:
  truths:
    - "Session model is updated to store transcription data."
    - "AWS Transcribe SDK is installed and client initialized."
    - "Environment variables for AWS Transcribe are configured."
  artifacts:
    - path: "src/lib/aws/transcribe.ts"
      provides: "AWS Transcribe client initialization"
      min_lines: 10
    - path: "prisma/schema.prisma"
      provides: "Updated Session model to store transcription data"
      contains: ["transcriptionJobId: String?", "transcriptJson: JsonB?"]
    - path: ".env"
      provides: "AWS Transcribe environment variables"
      contains: ["AWS_TRANSCRIBE_IAM_ROLE_ARN"]
  key_links:
    - from: "src/lib/aws/transcribe.ts"
      to: "AWS Transcribe Service"
      via: "@aws-sdk/client-transcribe"
      pattern: "new TranscribeClient()"
---

<objective>
Update the Session model to store transcription data, and configure the AWS SDK for Transcribe.

Purpose: Prepare the database schema for storing transcription results and establish the basic AWS Transcribe integration, crucial for automating speech-to-text conversion.
Output: Database schema updated with fields for transcription, installed AWS Transcribe SDK, and client setup.
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
@.planning/phases/1-foundation---recording-&-transcription/1-01-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-05-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Session model for transcription data and add Transcribe SDK</name>
  <files>
    prisma/schema.prisma
    prisma/migrations/
    package.json
    src/lib/aws/transcribe.ts
    .env
    src/lib/actions/session.ts
  </files>
  <action>
    Add new fields to the `Session` model in `prisma/schema.prisma`:
    - `transcriptionJobId: String?` (to store the AWS Transcribe job ID)
    - `transcriptJson: Json?` (to store the parsed transcription output including text, speaker labels, and word-level timestamps). Use `Json` type for Prisma compatibility.
    Generate and apply a new Prisma migration.
    Install `@aws-sdk/client-transcribe`.
    Create `src/lib/aws/transcribe.ts` to initialize `TranscribeClient` and add a placeholder for a `startTranscriptionJob` function.
    Add `AWS_TRANSCRIBE_OUTPUT_BUCKET` (if different from S3 upload bucket) and `AWS_TRANSCRIBE_IAM_ROLE_ARN` to `.env`.
    Update `src/lib/actions/session.ts` to handle these new fields (e.g., in `updateSession`).
  </action>
  <verify>
    `prisma/schema.prisma` includes `transcriptionJobId: String?` and `transcriptJson: Json?` in `Session` model.
    A new migration file is created and applied successfully.
    `npm list @aws-sdk/client-transcribe` shows installed.
    `src/lib/aws/transcribe.ts` initializes `TranscribeClient`.
    `.env` contains `AWS_TRANSCRIBE_IAM_ROLE_ARN` and `AWS_TRANSCRIBE_OUTPUT_BUCKET`.
    `src/lib/actions/session.ts`'s `updateSession` can accept these new fields.
  </verify>
  <done>
    Database schema is ready for transcription results, Transcribe SDK is set up, and session actions are updated.
  </done>
</task>

</tasks>

<verification>
1.  Ensure `AWS_TRANSCRIBE_IAM_ROLE_ARN` and `AWS_TRANSCRIBE_OUTPUT_BUCKET` are set in `.env`.
2.  Verify `npm install` for AWS Transcribe SDK completes successfully.
3.  Check the database (e.g., via Prisma Studio) that `Session` table has `transcriptionJobId` and `transcriptJson` columns.
</verification>

<success_criteria>
- Session model is updated to store transcription data.
- AWS Transcribe SDK is installed and configured.
- Environment variables for AWS Transcribe are set.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-06-SUMMARY.md`
</output>