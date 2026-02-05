---
phase: 1-foundation---recording-&-transcription
plan: 13
type: execute
wave: 3
depends_on: ["1-05", "1-11", "1-12"]
files_modified:
  - src/components/AudioRecorder.tsx
  - src/app/sessions/[id]/page.tsx
autonomous: true

must_haves:
  truths:
    - "Recorded audio is successfully uploaded directly to AWS S3 using a presigned URL."
    - "The S3 object key of the uploaded audio is saved to the corresponding session record in the database."
  artifacts:
    - path: "src/components/AudioRecorder.tsx"
      provides: "Enhanced React component with S3 upload functionality"
      min_lines: 100
    - path: "src/app/sessions/[id]/page.tsx"
      provides: "Session page integrating the AudioRecorder component"
      min_lines: 30
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
Implement the client-side logic to upload recorded audio to AWS S3 using presigned URLs and integrate the recorder into the session UI.

Purpose: Complete the full client-to-cloud audio capture and storage pipeline, linking audio to its session. This is critical for AUDIO-02 and preparing for transcription.
Output: A fully functional audio recorder that uploads to S3 and updates the database, integrated into the session details page.
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
@.planning/phases/1-foundation---recording-&-transcription/1-05-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-11-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-12-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement S3 Upload Logic in AudioRecorder component</name>
  <files>
    src/components/AudioRecorder.tsx
  </files>
  <action>
    Modify `src/components/AudioRecorder.tsx` (from Plan 05) to handle the upload process:
    - When an "Upload" action is triggered, fetch a presigned URL from `/api/upload/presigned-url` (Plan 11). This request should include the session ID and desired filename/content type.
    - Perform a `POST` request directly to the S3 `url` returned by the presigned URL endpoint, including the `fields` and the recorded audio `Blob`.
    - Upon successful S3 upload, call `updateSession` from `src/lib/actions/session.ts` (via an API route or client action from Plan 12) to save the S3 object key (from the presigned `fields`) to the current session.
  </action>
  <verify>
    Mock or run a test: Trigger the upload logic in `AudioRecorder.tsx`.
    Verify that the component makes a request to `/api/upload/presigned-url`.
    Verify that it then attempts a POST request to the S3 URL.
    Verify that upon successful S3 upload, the `updateSession` function is called with the `audioStorageKey`.
  </verify>
  <done>
    Client-side logic for direct S3 upload using presigned URLs and updating the session is implemented.
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate AudioRecorder component into Session Page</name>
  <files>
    src/app/sessions/[id]/page.tsx
  </files>
  <action>
    Integrate the `AudioRecorder.tsx` component (from Plan 05) into `src/app/sessions/[id]/page.tsx` (the detailed session view or a relevant session creation/edit form).
    Ensure the component receives necessary props like `sessionId` and a callback for when the upload is complete.
  </action>
  <verify>
    Navigate to `src/app/sessions/[id]/page.tsx` in a browser.
    The `AudioRecorder` component is visible and renders correctly within the page.
  </verify>
  <done>
    The audio recorder UI is successfully integrated into the session details page.
  </done>
</task>

</tasks>

<verification>
1.  Log in to the application (Plan 10).
2.  Create a new session (e.g., via the UI, if available, or API from Plan 12).
3.  Navigate to the session page containing the `AudioRecorder` component (Plan 13, Task 2).
4.  Start recording, speak for a few seconds, then stop recording.
5.  Click the "Upload" button.
6.  Verify in the AWS S3 console that a new audio file has been uploaded to your bucket.
7.  Verify in your database (e.g., using Prisma Studio or a database client) that the `audioStorageKey` for the corresponding session has been updated with the S3 object key.
</verification>

<success_criteria>
- The client-side application can record audio and upload it directly to AWS S3.
- The link to the S3 stored audio (S3 object key) is correctly saved in the session database record.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-13-SUMMARY.md`
</output>
