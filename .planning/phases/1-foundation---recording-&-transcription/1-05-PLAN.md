---
phase: 1-foundation---recording-&-transcription
plan: 05
type: execute
wave: 2
depends_on: ["1-01", "1-03"] # Needs database setup and session actions to update new fields
files_modified:
  - src/components/AudioRecorder.tsx
  - prisma/schema.prisma
  - prisma/migrations/
  - src/lib/actions/session.ts
autonomous: true

must_haves:
  truths:
    - "Session model includes a field to store the S3 object key for audio."
    - "Client-side audio recording UI is functional."
    - "Recorded audio can be played back client-side."
  artifacts:
    - path: "src/components/AudioRecorder.tsx"
      provides: "React component for recording audio"
      min_lines: 100
    - path: "prisma/schema.prisma"
      provides: "Updated Session model with audioStorageKey field"
      contains: "audioStorageKey: String?"
    - path: "src/lib/actions/session.ts"
      provides: "Function to update session with audioStorageKey"
      contains: "updateSession"
---

<objective>
Update the Session model to store S3 audio keys and develop a client-side component for audio recording.

Purpose: Prepare the database for audio storage and provide the initial UI for capturing audio, fulfilling part of AUDIO-01.
Output: An updated Prisma schema, a new migration, and a functional React component for recording audio.
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
@.planning/phases/1-foundation---recording-&-transcription/1-03-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add audioStorageKey to Session model and update migration</name>
  <files>
    prisma/schema.prisma
    prisma/migrations/
    src/lib/actions/session.ts
  </files>
  <action>
    Add an optional `audioStorageKey: String?` field to the `Session` model in `prisma/schema.prisma`.
    Generate and apply a new Prisma migration to update the database schema.
    Update `src/lib/actions/session.ts` (Plan 03) to include `audioStorageKey` in `updateSession`'s accepted data if provided, and ensure `createSession` can optionally receive it.
  </action>
  <verify>
    `prisma/schema.prisma` contains `audioStorageKey: String?` in `Session` model.
    A new migration file is created and applied successfully.
    `src/lib/actions/session.ts`'s `updateSession` function can accept and store an `audioStorageKey` without errors.
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
    Implement UI for "Start Recording", "Stop Recording", and optionally "Play" buttons.
    Use `navigator.mediaDevices.getUserMedia` to access microphone.
    Instantiate `MediaRecorder` to capture audio (e.g., in `audio/webm` format).
    Store recorded audio chunks in a local state and combine them into a Blob when recording stops.
    Enable/disable buttons based on recording state and availability of recorded audio.
  </action>
  <verify>
    The `AudioRecorder` component renders correctly.
    Clicking "Start Recording" requests microphone access and starts recording.
    Clicking "Stop Recording" stops recording and makes recorded audio available (e.g., via a play button).
    Recorded audio can be played back client-side.
  </verify>
  <done>
    Client-side audio recording functionality is implemented and ready to capture audio blobs.
  </done>
</task>

</tasks>

<verification>
1.  Verify the `audioStorageKey` field exists in the `Session` model in your database schema.
2.  Test the `AudioRecorder` component in isolation:
    - Mount the component in a test environment or simple page.
    - Click "Start Recording", speak, then click "Stop Recording".
    - Click "Play" and verify recorded audio plays back.
</verification>

<success_criteria>
- The client-side application can record audio.
- The `Session` model is updated to store the S3 object key for audio.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-05-SUMMARY.md`
</output>