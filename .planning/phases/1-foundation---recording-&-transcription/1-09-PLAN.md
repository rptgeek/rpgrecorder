---
phase: 1-foundation---recording-&-transcription
plan: 09
type: execute
wave: 4
depends_on: ["1-01", "1-03", "1-12", "1-07"]
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/
  - src/lib/actions/session.ts
  - src/app/api/sessions/[id]/route.ts
  - src/app/sessions/[id]/page.tsx
  - src/components/NotesEditor.tsx
autonomous: true

must_haves:
  truths:
    - "Users can add notes to a session via the UI."
    - "Saved notes persist and are displayed when the session is re-accessed."
    - "Users can edit existing notes for a session."
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Updated Session model with `notes` field"
      contains: "notes: String?"
    - path: "src/lib/actions/session.ts"
      provides: "Updated function to handle saving/retrieving session notes"
      contains: "updateSession"
    - path: "src/app/sessions/[id]/page.tsx"
      provides: "Session detail page integrated with notes editor"
    - path: "src/components/NotesEditor.tsx"
      provides: "UI component for editing and displaying session notes"
      min_lines: 50
  key_links:
    - from: "src/components/NotesEditor.tsx"
      to: "Session API"
      via: "client action to update session"
      pattern: "updateSession\("
    - from: "src/lib/actions/session.ts"
      to: "prisma.session.notes"
      via: "Prisma update"
      pattern: "prisma\.session\.update"
---

<objective>
Integrate a basic functionality for users to add, edit, and save manual notes for a session.

Purpose: Fulfill NOTES-01, providing a simple way for GMs to add personal annotations and context to their sessions.
Output: An editable notes section on the session page, with data persistence.
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
@.planning/phases/1-foundation---recording-&-transcription/1-07-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-12-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add `notes` field to Session model and migration</name>
  <files>
    prisma/schema.prisma
    prisma/migrations/
  </files>
  <action>
    Add an optional `notes: String?` field to the `Session` model in `prisma/schema.prisma`.
    Generate and apply a new Prisma migration to update the database schema.
    Update `src/validation/session.ts` (Plan 03) to include `notes` as an optional string field in `updateSessionSchema`.
  </action>
  <verify>
    `prisma/schema.prisma` contains `notes: String?` in `Session` model.
    A new migration file is created and applied successfully.
    `src/validation/session.ts` includes `notes` in relevant schemas.
  </verify>
  <done>
    Database schema is updated to store session notes, and validation is ready.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update Session API and server actions for notes</name>
  <files>
    src/lib/actions/session.ts
    src/app/api/sessions/[id]/route.ts
  </files>
  <action>
    Modify `updateSession` function in `src/lib/actions/session.ts` (Plan 03) to accept and save the `notes` field when provided.
    Ensure `getSessionById` also retrieves the `notes` field.
    Update the `PUT`/`PATCH` API route in `src/app/api/sessions/[id]/route.ts` (Plan 12) to handle incoming `notes` data from the request body and pass it to `updateSession`.
  </action>
  <verify>
    API endpoint for updating a session (`PUT`/`PATCH` `/api/sessions/[id]`) can successfully receive and save `notes` data.
    API endpoint for retrieving a session (`GET` `/api/sessions/[id]`) returns the saved `notes`.
  </verify>
  <done>
    Backend API and server actions are updated to support CRUD operations for session notes.
  </done>
</task>

<task type="auto">
  <name>Task 3: Implement Notes Editor UI component</name>
  <files>
    src/components/NotesEditor.tsx
    src/app/sessions/[id]/page.tsx
  </files>
  <action>
    Create a `src/components/NotesEditor.tsx` component that:
    - Accepts the current session's notes as a prop.
    - Provides a textarea or a simple rich text editor for users to input/edit notes.
    - Includes a "Save" button.
    - On save, it should call an action (e.g., passed as a prop, or directly call `updateSession` from client component) to persist the changes via the Session API (Plan 12).
    Integrate this `NotesEditor` component into the `src/app/sessions/[id]/page.tsx` (Plan 07).
  </action>
  <verify>
    On the session page, a notes section is visible and editable.
    Enter some text, click "Save". Reload the page and verify the notes are still present.
    Edit the notes, save again, and verify changes persist.
  </verify>
  <done>
    A functional UI component for adding and editing session notes is integrated into the session view.
  </done>
</task>

</tasks>

<verification>
1.  Ensure you have a session (from previous plans).
2.  Log in and navigate to the session page `/sessions/{your_session_id}`.
3.  Locate the new notes editor component.
4.  Type some text into the notes editor and click the "Save" button.
5.  Refresh the page (or navigate away and back). Verify that the notes you entered are still displayed.
6.  Edit the notes, save, and confirm the updated content persists.
</verification>

<success_criteria>
- Users can add, edit, and save manual notes for any given session.
- Session notes are persistently stored in the database and retrieved correctly.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-09-SUMMARY.md`
</output>