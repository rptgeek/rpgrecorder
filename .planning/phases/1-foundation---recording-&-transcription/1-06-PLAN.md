---
phase: 1-foundation---recording-&-transcription
plan: 06
type: execute
wave: 2
depends_on: ["1-01", "1-04", "1-05"] # Needs database for storage, S3 for audio, and audio key from session
files_modified:
  - src/lib/aws/transcribe.ts
  - src/app/api/transcribe-webhook/route.ts # or a background job/polling mechanism
  - prisma/schema.prisma
  - src/lib/actions/session.ts # To trigger transcription and update results
  - .env
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
    - "Backend can initiate an AWS Transcribe job for an S3 audio file."
    - "The transcription job includes speaker diarization."
    - "Transcription results (full text, word-level timestamps, speaker labels) are successfully parsed and stored in the session record in the database."
  artifacts:
    - path: "src/lib/aws/transcribe.ts"
      provides: "AWS Transcribe client and utility functions for transcription"
      min_lines: 40
    - path: "src/app/api/transcribe-webhook/route.ts"
      provides: "Endpoint to receive Transcribe completion notifications (or polling logic)"
      min_lines: 30
    - path: "prisma/schema.prisma"
      provides: "Updated Session model to store transcription data"
      contains: ["transcriptJson: JsonB?", "transcriptionJobId: String?"]
  key_links:
    - from: "src/lib/actions/session.ts"
      to: "src/lib/aws/transcribe.ts"
      via: "call startTranscriptionJob"
      pattern: "startTranscriptionJob"
    - from: "src/lib/aws/transcribe.ts"
      to: "AWS Transcribe Service"
      via: "@aws-sdk/client-transcribe"
      pattern: "new TranscribeClient()"
    - from: "src/app/api/transcribe-webhook/route.ts"
      to: "src/lib/actions/session.ts"
      via: "call updateSessionWithTranscript"
      pattern: "updateSessionWithTranscript"
---

<objective>
Implement backend logic to initiate AWS Transcribe jobs for S3-stored audio files and store the transcription results, including speaker diarization.

Purpose: Automate the transcription process for AUDIO-02, TRANS-01, and TRANS-02. This ensures that recorded audio is automatically converted into text with speaker identification, a core feature of the application.
Output: Server-side functions to trigger transcription jobs, a mechanism to process Transcribe results, and the database schema updated to store transcription data.
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
@.planning/phases/1-foundation---recording-&-transcription/1-04-SUMMARY.md
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
  </files>
  <action>
    Add new fields to the `Session` model in `prisma/schema.prisma`:
    - `transcriptionJobId: String?` (to store the AWS Transcribe job ID)
    - `transcriptJson: JsonB?` (to store the parsed transcription output including text, speaker labels, and word-level timestamps).
    Generate and apply a new Prisma migration.
    Install `@aws-sdk/client-transcribe`.
    Create `src/lib/aws/transcribe.ts` to initialize `TranscribeClient` and add a placeholder for a `startTranscriptionJob` function.
    Add `AWS_TRANSCRIBE_OUTPUT_BUCKET` (if different from S3 upload bucket) and `AWS_TRANSCRIBE_IAM_ROLE_ARN` to `.env`.
  </action>
  <verify>
    `prisma/schema.prisma` includes new fields for `Session`.
    New migration successfully applied.
    `npm list @aws-sdk/client-transcribe` shows installed.
    `src/lib/aws/transcribe.ts` initializes `TranscribeClient`.
    `.env` contains `AWS_TRANSCRIBE_IAM_ROLE_ARN`.
  </verify>
  <done>
    Database schema is ready for transcription results, and Transcribe SDK is set up.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement AWS Transcribe job initiation</name>
  <files>
    src/lib/aws/transcribe.ts
    src/lib/actions/session.ts
  </files>
  <action>
    In `src/lib/aws/transcribe.ts`, implement `startTranscriptionJob(sessionId: string, audioKey: string, userId: string)`:
    - This function should use `TranscribeClient.send(new StartTranscriptionJobCommand(...))` to initiate a transcription job.
    - Set `LanguageCode` (e.g., `en-US`), `MediaFormat` (e.g., `webm`).
    - Enable `SpeakerDiarization` (e.g., `MaxSpeakers: 5`, `ShowSpeakerLabels: true`).
    - Specify an `OutputBucketName` (can be the same S3 bucket or a different one for outputs).
    - Crucially, specify the `OutputKey` (where Transcribe will write the JSON result to S3) and `DataAccessRoleArn` (the IAM role Transcribe uses to write to S3).
    - Store the `TranscriptionJobId` in the `Session` record.
    Modify `src/lib/actions/session.ts` to call `startTranscriptionJob` after an `audioStorageKey` is saved (e.g., as part of the `updateSession` flow or a dedicated `triggerTranscription` function).
  </action>
  <verify>
    `src/lib/aws/transcribe.ts` exports `startTranscriptionJob` and calls `StartTranscriptionJobCommand`.
    Calling this function via `src/lib/actions/session.ts` results in a new transcription job appearing in the AWS Transcribe console.
    The `transcriptionJobId` field in the database `Session` table is populated.
  </verify>
  <done>
    Backend can successfully initiate AWS Transcribe jobs with speaker diarization.
  </done>
</task>

<task type="auto">
  <name>Task 3: Process Transcribe results and store in database</name>
  <files>
    src/app/api/transcribe-webhook/route.ts # Or polling logic in a background job
    src/lib/actions/session.ts
    src/lib/aws/s3.ts # To read transcribe output
  </files>
  <action>
    Implement an API route `src/app/api/transcribe-webhook/route.ts` (or equivalent background job logic if polling).
    This endpoint will receive notifications from AWS (e.g., via S3 event or SNS if configured) when a transcription job completes.
    It should:
    - Fetch the transcription output JSON file from the specified S3 `OutputBucketName` using `src/lib/aws/s3.ts`.
    - Parse the JSON output, extracting the full transcript text, speaker labels, and word-level timestamps.
    - Extract the `sessionId` from the job name or metadata (if included when starting the job).
    - Update the corresponding `Session` record in the database, populating `transcriptJson` with the parsed data.
    - Implement error handling for failed transcription jobs.
  </action>
  <verify>
    After an audio file is transcribed by AWS, the `transcriptJson` field for the corresponding session in the database is populated with valid JSON containing transcription data (text, speaker labels, word-level timestamps).
  </verify>
  <done>
    Full pipeline for processing AWS Transcribe results and storing them in the database is complete.
  </done>
</task>

</tasks>

<verification>
1.  Ensure AWS IAM roles and permissions are correctly set up for Transcribe to read from S3 and write output to S3.
2.  Upload an audio file via the application (using Plan 05's UI).
3.  Monitor the AWS Transcribe console to confirm a job starts and completes successfully.
4.  If using a webhook, trigger a test notification (if possible) or manually check the API route.
5.  Check the database for the corresponding session:
    - Verify `transcriptionJobId` is populated.
    - Verify `transcriptJson` contains the full transcript, including speaker labels and word-level timestamps.
</verification>

<success_criteria>
- AWS Transcribe integration is fully functional.
- Audio files uploaded to S3 are automatically transcribed with speaker diarization.
- The complete, parsed transcription data is stored in the database, linked to its session.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-06-SUMMARY.md`
</output>
