---
phase: 1-foundation---recording-&-transcription
plan: 03
type: execute
wave: 2
depends_on: ["1-01", "1-02"]
files_modified:
  - src/lib/actions/session.ts
  - src/validation/session.ts
autonomous: true

must_haves:
  truths:
    - "Session CRUD operations are defined as server actions."
    - "Input validation schemas for sessions are defined."
    - "Session actions enforce user ownership."
  artifacts:
    - path: "src/lib/actions/session.ts"
      provides: "Server-side functions for session CRUD operations"
      min_lines: 50
    - path: "src/validation/session.ts"
      provides: "Validation schemas for session input data"
      min_lines: 10
  key_links:
    - from: "src/lib/actions/session.ts"
      to: "prisma.session"
      via: "Prisma Client"
      pattern: "prisma\.session"
---

<objective>
Define server-side actions for session CRUD operations and implement input validation.

Purpose: Establish the core business logic for managing TTRPG sessions, ensuring data integrity and security, ready for API exposure.
Output: Encapsulated Prisma interactions for sessions, and Zod schemas for session data validation.
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
@.planning/phases/1-foundation---recording-&-transcription/1-02-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement Session CRUD server actions and validation</name>
  <files>
    src/lib/actions/session.ts
    src/validation/session.ts
  </files>
  <action>
    Create `src/lib/actions/session.ts` containing functions for:
    - `createSession(data: { name: string, description?: string }, userId: string)`
    - `getSessions(userId: string)`
    - `getSessionById(id: string, userId: string)`
    - `updateSession(id: string, data: { name?: string, description?: string }, userId: string)`
    - `deleteSession(id: string, userId: string)`
    These functions should interact with `prisma.session` from Plan 01.
    Implement basic input validation using Zod in `src/validation/session.ts` for session name and description.
    Ensure all operations include `userId` checks to prevent unauthorized access.
  </action>
  <verify>
    `src/lib/actions/session.ts` contains all required CRUD functions.
    `src/validation/session.ts` contains `createSessionSchema` and `updateSessionSchema` using Zod.
    Functions in `src/lib/actions/session.ts` correctly filter/validate based on `userId`.
  </verify>
  <done>
    Server-side logic for session management with owner-based authorization and input validation is complete.
  </done>
</task>

</tasks>

<verification>
1.  Using a test script or environment, call each function in `src/lib/actions/session.ts` directly.
2.  Verify that `createSession` creates a session linked to the correct user.
3.  Verify `getSessions` returns only the sessions for the specified user.
4.  Verify `getSessionById`, `updateSession`, and `deleteSession` only work for sessions owned by the specified user and return appropriate errors/null otherwise.
5.  Test `src/validation/session.ts` with valid and invalid data to ensure schemas work.
</verification>

<success_criteria>
- Core business logic for session creation, retrieval, update, and deletion is implemented.
- User ownership is enforced within these server actions.
- Zod validation schemas are defined for session data.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-03-SUMMARY.md`
</output>