---
phase: 1-foundation---recording-&-transcription
plan: 08
type: execute
wave: 5
depends_on: ["1-07", "1-14"]
files_modified:
  - src/components/TranscriptDisplay.tsx
  - src/app/sessions/[id]/page.tsx
autonomous: true

must_haves:
  truths:
    - "As the session audio plays, the corresponding words/phrases in the transcript are highlighted."
    - "Clicking on a word in the displayed transcript jumps the audio playback to that word's start time."
    - "The synchronized highlighting and jumping functionality is smooth and responsive."
  artifacts:
    - path: "src/components/TranscriptDisplay.tsx"
      provides: "Enhanced transcript display component with audio synchronization"
      min_lines: 150
  key_links:
    - from: "src/components/TranscriptDisplay.tsx"
      to: "HTML5 audio element"
      via: "timeupdate event listener and currentTime setter"
      pattern: "audioElement\.addEventListener\('timeupdate'"
    - from: "src/components/TranscriptDisplay.tsx"
      to: "session.transcriptJson"
      via: "parsing word-level timestamps"
      pattern: "word_timestamps"
---

<objective>
Enhance the session view UI to synchronize the displayed transcript with the audio playback, highlighting the current spoken words/phrases.

Purpose: Fulfill REVIEW-01, providing a rich and interactive review experience. This allows users to easily follow along with the audio and quickly navigate the transcript.
Output: An interactive transcript display where text highlights in sync with audio, and users can click on words to seek audio.
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
@.planning/phases/1-foundation---recording-&-transcription/1-07-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-14-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add state management for audio playback time</name>
  <files>
    src/app/sessions/[id]/page.tsx
    src/components/TranscriptDisplay.tsx
  </files>
  <action>
    In `src/app/sessions/[id]/page.tsx`, obtain a reference to the HTML5 `<audio>` element (e.g., using `useRef`).
    Pass the audio element or its `currentTime` to `TranscriptDisplay.tsx` as a prop, and update `currentTime` via `onTimeUpdate` event.
    Alternatively, manage the `currentTime` state within `TranscriptDisplay.tsx` by adding a `timeupdate` event listener directly to the audio element.
  </action>
  <verify>
    The `TranscriptDisplay` component receives the current playback time of the audio, and this value updates as the audio plays.
  </verify>
  <done>
    `TranscriptDisplay` component is aware of the current audio playback time.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement synchronized text highlighting</name>
  <files>
    src/components/TranscriptDisplay.tsx
  </files>
  <action>
    Modify `src/components/TranscriptDisplay.tsx` to:
    - Parse the `transcriptJson` (from Plan 14) to access word-level timestamps (start and end times for each word).
    - Based on the current audio `currentTime` (from Task 1), identify the word or phrase currently being spoken.
    - Apply a visual highlight (e.g., CSS class, inline style) to the currently spoken text segment.
    - Optimize rendering to avoid performance issues with frequent updates.
  </action>
  <verify>
    Play an audio file in a session.
    As the audio plays, the text in the `TranscriptDisplay` component highlights the spoken words accurately and smoothly.
  </verify>
  <done>
    Real-time, word-level synchronized text highlighting with audio playback is functional.
  </done>
</task>

<task type="auto">
  <name>Task 3: Implement click-to-seek functionality</name>
  <files>
    src/components/TranscriptDisplay.tsx
  </files>
  <action>
    Modify `src/components/TranscriptDisplay.tsx` to:
    - Make individual words or text segments clickable.
    - When a word is clicked, determine its start timestamp from the `transcriptJson`.
    - Set the `<audio>` element's `currentTime` to this timestamp, effectively jumping the audio to that point.
  </action>
  <verify>
    Click on various words within the displayed transcript.
    Verify that the audio player jumps to the corresponding part of the audio and continues playing from there.
    The highlighting should also adjust to the new audio position.
  </verify>
  <done>
    Users can click on words in the transcript to seek to the corresponding point in the audio.
  </done>
</task>

</tasks>

<verification>
1.  Ensure you have a session with audio and a completed transcript (Plan 07).
2.  Log in and navigate to the session page `/sessions/{your_session_id}`.
3.  Start playing the audio. Observe that the transcript text highlights in sync with the audio.
4.  Click on different words in the transcript. Verify that the audio playback jumps to the clicked word's position and continues playing, with highlighting adapting.
</verification>

<success_criteria>
- The session transcript automatically highlights text in sync with audio playback.
- Users can click on any word in the transcript to jump the audio playback to that specific point.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-08-SUMMARY.md`
</output>