---
phase: 1-foundation---recording-&-transcription
plan: 05
type: execute
wave: 2
depends_on: ["1-04", "1-03"] # Depends on presigned URL API and Session API to store S3 key
files_modified:
  - src/components/AudioRecorder.tsx
  - src/app/sessions/[id]/page.tsx # Or a parent component that includes the recorder
  - prisma/schema.prisma # To add audioStorageKey to Session
  - src/lib/actions/session.ts # To update session with audioStorageKey
autonomous: true

must_haves:
  truths:
    - "User can start and stop audio recording in the browser UI."
    - "Recorded audio is successfully uploaded directly to AWS S3 using a presigned URL."
    - "The S3 object key of the uploaded audio is saved to the corresponding session record in the database."
  artifacts:
    - path: "src/components/AudioRecorder.tsx"
      provides: "React component for recording and uploading audio"
      min_lines: 100
    - path: "prisma/schema.prisma"
      provides: "Updated Session model with audioStorageKey field"
      contains: "audioStorageKey: String?"
    - path: "src/lib/actions/session.ts"
      provides: "Function to update session with audioStorageKey"
      contains: "updateSession"
  key_links:
    - from: "src/components/AudioRecorder.tsx"
      to: "/api/upload/presigned-url"
      via: "fetch API"
      pattern: "fetch\('/api/upload/presigned-url'"
    - from: "src/components/AudioRecorder.tsx"
      to: "AWS S3"
      via: "direct POST request"
      pattern: "fetch\(presignedUrl.url, \{ method: 'POST'"
    - from: "src/components/AudioRecorder.tsx"
      to: "src/lib/actions/session.ts"
      via: "client action to update session"
      pattern: "updateSession\("
---

<objective>
Create a client-side component to record audio via the browser's MediaRecorder API and upload it directly to AWS S3 using a presigned URL.

Purpose: Provide the UI for AUDIO-01 and AUDIO-02, enabling users to capture and store session audio. This plan completes the full flow for audio capture and secure storage.
Output: A React component for audio recording with start/stop/upload functionality, and the associated backend updates to store the S3 key.
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
@.planning/phases/1-foundation---recording-&-transcription/1-03-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-04-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add audioStorageKey to Session model and update migration</name>
  <files>
    prisma/schema.prisma
    prisma/migrations/
  </files>
  <action>
    Add an optional `audioStorageKey: String?` field to the `Session` model in `prisma/schema.prisma`.
    Generate and apply a new Prisma migration to update the database schema.
    Update `src/lib/actions/session.ts` from Plan 03 to include `audioStorageKey` in `updateSession` if provided.
  </action>
  <verify>
    `prisma/schema.prisma` contains `audioStorageKey: String?` in `Session` model.
    A new migration file is created and applied successfully.
    `src/lib/actions/session.ts`'s `updateSession` function can accept and store an `audioStorageKey`.
  </verify>
  <done>
    Database schema and session update logic are ready to store S3 audio keys.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement Audio Recording UI with MediaRecorder</name>
  <files>
    src/components/AudioRecorder.tsx
  </files>
  <action>
    Create a new React component `src/components/AudioRecorder.tsx`.
    Implement UI for "Start Recording", "Stop Recording", and "Upload" buttons.
    Use `navigator.mediaDevices.getUserMedia` to access microphone.
    Instantiate `MediaRecorder` to capture audio (e.g., in `audio/webm` format).
    Store recorded audio chunks in a local state.
    Enable/disable buttons based on recording state.
  </action>
  <verify>
    The `AudioRecorder` component renders correctly.
    Clicking "Start Recording" starts recording (e.g., visual indicator).
    Clicking "Stop Recording" stops recording and makes "Upload" available.
  </verify>
  <done>
    Client-side audio recording functionality is implemented and ready to capture audio.
  </done>
</task>

<task type="auto">
  <name>Task 3: Integrate S3 Upload with Presigned URL and update Session</name>
  <files>
    src/components/AudioRecorder.tsx
    src/app/sessions/[id]/page.tsx
  </files>
  <action>
    Modify `src/components/AudioRecorder.tsx` to handle the upload process:
    - On "Upload", fetch a presigned URL from `/api/upload/presigned-url` (Plan 04), passing the session ID and desired filename/content type.
    - Perform a `POST` request directly to the S3 `url` returned by the presigned URL endpoint, including the `fields` and the recorded audio `Blob`.
    - Upon successful S3 upload, call `updateSession` from `src/lib/actions/session.ts` (Plan 03) to save the S3 object key (from the presigned `fields`) to the current session.
    Integrate `AudioRecorder` component into `src/app/sessions/[id]/page.tsx` or a relevant session creation/edit form.
  </action>
  <verify>
    Record audio, stop, and click "Upload".
    Verify that the audio file appears in the configured AWS S3 bucket.
    Verify that the `audioStorageKey` field for the corresponding session in the database is updated with the S3 object key.
  </verify>
  <done>
    Full client-side audio recording and direct S3 upload, with S3 key stored in the session, is functional.
  </done>
</task>

</tasks>

<verification>
1.  Log in to the application.
2.  Create a new session (if no UI yet, manually via API).
3.  Navigate to the session page or a page containing the `AudioRecorder` component.
4.  Start recording, speak for a few seconds, then stop recording.
5.  Click the "Upload" button.
6.  Verify in the AWS S3 console that a new audio file has been uploaded to your bucket.
7.  Verify in your database (e.g., using Prisma Studio or a database client) that the `audioStorageKey` for the corresponding session has been updated with the S3 object key.
</verification>

<success_criteria>
- The client-side application can record audio.
- Recorded audio can be uploaded directly to AWS S3.
- The link to the S3 stored audio (S3 object key) is correctly saved in the session database record.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-05-SUMMARY.md`
</output>
