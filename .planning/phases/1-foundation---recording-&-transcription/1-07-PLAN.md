---
phase: 1-foundation---recording-&-transcription
plan: 07
type: execute
wave: 4
depends_on: ["1-12", "1-06", "1-13"]
files_modified:
  - src/app/sessions/[id]/page.tsx
  - src/components/TranscriptDisplay.tsx
  - src/components/SessionDetail.tsx # Or similar wrapper
autonomous: true

must_haves:
  truths:
    - "Navigating to a specific session URL displays its details."
    - "The session's full transcribed text, with speaker labels, is visible on the page."
    - "The session's original audio can be played back using an embedded audio player."
  artifacts:
    - path: "src/app/sessions/[id]/page.tsx"
      provides: "Dynamic page for individual session view"
      min_lines: 50
    - path: "src/components/TranscriptDisplay.tsx"
      provides: "Component to render session transcript with speaker labels"
      min_lines: 40
    - path: "src/components/SessionDetail.tsx"
      provides: "Component to display session metadata"
      min_lines: 30
  key_links:
    - from: "src/app/sessions/[id]/page.tsx"
      to: "Session API"
      via: "fetch session data"
      pattern: "getSessionById"
    - from: "src/app/sessions/[id]/page.tsx"
      to: "S3 audio file"
      via: "HTML5 audio element src"
      pattern: "<audio src=.*\.webm"
    - from: "src/components/TranscriptDisplay.tsx"
      to: "session.transcriptJson"
      via: "props"
      pattern: "transcriptJson="
---

<objective>
Create a dedicated UI page to display a specific session's details and its raw transcribed text.

Purpose: Provide a basic view for SESS-01 and an initial display for TRANS-01 results, laying groundwork for REVIEW-01. This allows users to see their session data and raw transcripts.
Output: A Next.js page that fetches and displays session details, the full transcript with speaker labels, and an embedded audio player for the session's audio.
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
@.planning/phases/1-foundation---recording-&-transcription/1-12-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-06-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-13-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create dynamic session detail page</name>
  <files>
    src/app/sessions/[id]/page.tsx
  </files>
  <action>
    Create a new dynamic Next.js page at `src/app/sessions/[id]/page.tsx`.
    This page should:
    - Fetch the session details (name, description, `audioStorageKey`, `transcriptJson`) using `getSessionById` from `src/lib/actions/session.ts` (Plan 12).
    - Handle cases where the session is not found or the user is not authorized.
    - Display the session's name and description.
    - Implement a method to generate a presigned download URL for the `audioStorageKey` (can reuse/adapt logic from Plan 11 or create a new endpoint).
    - Embed an HTML5 `<audio>` element with the generated presigned URL as its `src`.
  </action>
  <verify>
    Navigating to `/sessions/{valid_session_id}` displays session name, description, and an audio player.
    The audio player can play the session's audio.
    Navigating to an invalid session ID or unauthorized session shows an error/redirect.
  </verify>
  <done>
    A functional Next.js page for displaying individual session details and playing audio is implemented.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement basic transcript display component</name>
  <files>
    src/components/TranscriptDisplay.tsx
    src/app/sessions/[id]/page.tsx
  </files>
  <action>
    Create `src/components/TranscriptDisplay.tsx` component.
    This component should accept the `transcriptJson` (from Plan 06's schema update) as a prop.
    Parse the `transcriptJson` to extract the full text and speaker segments.
    Render the transcript text, clearly differentiating between speakers (e.g., "Speaker 1: ...", "Speaker 2: ...").
    Integrate this component into `src/app/sessions/[id]/page.tsx` to display the session's transcript.
  </action>
  <verify>
    The `TranscriptDisplay` component correctly renders the full transcribed text.
    Speaker labels (e.g., "Speaker 0", "Speaker 1") are visible and correctly delineate different speakers' turns.
  </verify>
  <done>
    A component for displaying the session transcript with speaker differentiation is implemented and integrated.
  </done>
</task>

</tasks>

<verification>
1.  Ensure you have a session with both uploaded audio (Plan 13) and a completed transcription (Plan 14).
2.  Log in to the application and navigate to `/sessions/{your_session_id}`.
3.  Verify that the session's name, description, and an audio player are visible.
4.  Play the audio and confirm it works.
5.  Scroll through the page and verify that the full transcript is displayed, with distinct labels for each speaker's turn.
</verification>

<success_criteria>
- A dedicated page for viewing session details, including an audio player and the full transcript with speaker labels, is accessible and functional.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-07-SUMMARY.md`
</output>