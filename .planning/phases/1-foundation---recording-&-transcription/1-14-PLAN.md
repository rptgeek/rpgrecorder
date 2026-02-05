---
phase: 1-foundation---recording-&-transcription
plan: 14
type: execute
wave: 3
depends_on: ["1-06", "1-12", "1-13"]
files_modified:
  - src/lib/aws/transcribe.ts
  - src/lib/actions/session.ts
  - src/app/api/transcribe-webhook/route.ts
  - src/lib/aws/s3.ts
autonomous: true
user_setup:
  - service: AWS Transcribe
    why: "Speech-to-text transcription and speaker diarization"
    env_vars: [] # Covered in 1-06
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
    - "Transcribe webhook receives notifications and processes results."
    - "Transcription results (full text, word-level timestamps, speaker labels) are successfully parsed and stored in the session record in the database."
  artifacts:
    - path: "src/lib/aws/transcribe.ts"
      provides: "Functions to start Transcribe jobs"
      min_lines: 40
    - path: "src/app/api/transcribe-webhook/route.ts"
      provides: "Endpoint to receive Transcribe completion notifications"
      min_lines: 30
  key_links:
    - from: "src/lib/actions/session.ts"
      to: "src/lib/aws/transcribe.ts"
      via: "call startTranscriptionJob"
      pattern: "startTranscriptionJob"
    - from: "src/app/api/transcribe-webhook/route.ts"
      to: "src/lib/actions/session.ts"
      via: "call updateSessionWithTranscript"
      pattern: "updateSessionWithTranscript"
---

<objective>
Implement the logic to initiate AWS Transcribe jobs and handle the completion webhook to store transcription results.

Purpose: Automate the speech-to-text conversion and store the rich transcription data (including speaker diarization) for review, fulfilling TRANS-01 and TRANS-02.
Output: Functions to trigger transcription jobs after audio upload, and an API endpoint to receive and process Transcribe completion notifications.
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
@.planning/phases/1-foundation---recording-&-transcription/1-06-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-12-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-13-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement AWS Transcribe job initiation</name>
  <files>
    src/lib/aws/transcribe.ts
    src/lib/actions/session.ts
  </files>
  <action>
    In `src/lib/aws/transcribe.ts` (from Plan 06), implement `startTranscriptionJob(sessionId: string, audioKey: string, userId: string)`:
    - This function should use `TranscribeClient.send(new StartTranscriptionJobCommand(...))` to initiate a transcription job.
    - Set `LanguageCode` (e.g., `en-US`), `MediaFormat` (e.g., `webm`).
    - Enable `SpeakerDiarization` (e.g., `MaxSpeakers: 5`, `ShowSpeakerLabels: true`).
    - Specify an `OutputBucketName` (can be the same S3 bucket or a different one for outputs from Plan 06).
    - Crucially, specify the `OutputKey` (where Transcribe will write the JSON result to S3) and `DataAccessRoleArn` (the IAM role Transcribe uses to write to S3, from Plan 06).
    - Store the `TranscriptionJobId` in the `Session` record by calling `updateSession` from `src/lib/actions/session.ts` (Plan 12).
    Modify `src/lib/actions/session.ts` to call `startTranscriptionJob` after an `audioStorageKey` is saved (e.g., as part of the `updateSession` flow or a dedicated `triggerTranscription` function after successful upload from Plan 13).
  </action>
  <verify>
    Calling `startTranscriptionJob` (e.g., manually via a test) results in a new transcription job appearing in the AWS Transcribe console.
    The `transcriptionJobId` field in the database `Session` table is populated for the corresponding session.
  </verify>
  <done>
    Backend can successfully initiate AWS Transcribe jobs with speaker diarization and update session with job ID.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement Transcribe webhook to process results</name>
  <files>
    src/app/api/transcribe-webhook/route.ts
    src/lib/aws/s3.ts
    src/lib/actions/session.ts
  </files>
  <action>
    Implement an API route `src/app/api/transcribe-webhook/route.ts`. This endpoint will receive notifications from AWS (e.g., via SNS configured outside this plan, or S3 event if setup) when a transcription job completes.
    It should:
    - Fetch the transcription output JSON file from the specified S3 `OutputBucketName` using `src/lib/aws/s3.ts` (from Plan 04).
    - Parse the JSON output, extracting the full transcript text, speaker labels, and word-level timestamps.
    - Extract the `sessionId` from the job name or metadata (if included when starting the job in Task 1).
    - Update the corresponding `Session` record in the database, populating `transcriptJson` with the parsed data by calling `updateSession` from `src/lib/actions/session.ts` (Plan 12).
    - Implement error handling for failed transcription jobs.
  </action>
  <verify>
    After an audio file is transcribed by AWS, and the webhook is triggered, the `transcriptJson` field for the corresponding session in the database is populated with valid JSON containing transcription data (text, speaker labels, word-level timestamps).
  </verify>
  <done>
    Full pipeline for processing AWS Transcribe results via webhook and storing them in the database is complete.
  </done>
</task>

</tasks>

<verification>
1.  Ensure AWS IAM roles and permissions are correctly set up for Transcribe to read from S3 and write output to S3 (from Plan 06).
2.  Upload an audio file via the application (using Plan 13).
3.  Monitor the AWS Transcribe console to confirm a job starts and completes successfully.
4.  If using a webhook, you may need to manually trigger a test notification (or set up SNS/SQS outside this plan) to test the `transcribe-webhook` route.
5.  Check the database for the corresponding session:
    - Verify `transcriptionJobId` is populated (from Task 1).
    - Verify `transcriptJson` contains the full transcript, including speaker labels and word-level timestamps (from Task 2).
</verification>

<success_criteria>
- AWS Transcribe job initiation is functional and integrates with the session update flow.
- The Transcribe webhook correctly processes results and updates the session in the database.
- Audio files uploaded to S3 are automatically transcribed with speaker diarization, and data is stored.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-14-SUMMARY.md`
</output>
