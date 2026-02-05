---
phase: 1-foundation---recording-&-transcription
plan: 03
type: execute
wave: 2
depends_on: ["1-01", "1-02"]
files_modified:
  - src/app/api/sessions/route.ts
  - src/app/api/sessions/[id]/route.ts
  - src/lib/actions/session.ts
  - src/validation/session.ts
autonomous: true

must_haves:
  truths:
    - "Authenticated users can create new sessions."
    - "Authenticated users can retrieve a list of their own sessions."
    - "Authenticated users can retrieve details of a specific session they own."
    - "Authenticated users can update details of a specific session they own."
    - "Authenticated users can delete a specific session they own."
    - "Unauthorized users cannot create, view, update, or delete sessions."
  artifacts:
    - path: "src/app/api/sessions/route.ts"
      provides: "API endpoints for creating and listing sessions"
      min_lines: 30
      exports: ["POST", "GET"]
    - path: "src/app/api/sessions/[id]/route.ts"
      provides: "API endpoints for retrieving, updating, and deleting a single session"
      min_lines: 40
      exports: ["GET", "PUT", "PATCH", "DELETE"]
    - path: "src/lib/actions/session.ts"
      provides: "Server-side functions for session CRUD operations"
      min_lines: 50
    - path: "src/validation/session.ts"
      provides: "Validation schemas for session input data"
      min_lines: 10
  key_links:
    - from: "src/app/api/sessions/route.ts"
      to: "src/lib/actions/session.ts"
      via: "import and call"
      pattern: "import \{.*\} from "@/lib/actions/session";"
    - from: "src/lib/actions/session.ts"
      to: "prisma.session"
      via: "Prisma Client"
      pattern: "prisma\.session"
    - from: "src/app/api/sessions/route.ts"
      to: "Auth.js session"
      via: "getServerSession"
      pattern: "getServerSession\(authConfig\)"
---

<objective>
Develop a robust API for creating, viewing, editing, and deleting TTRPG sessions, protected by authentication.

Purpose: Provide backend functionality for SESS-01, allowing users to manage their game sessions. This API will be the backbone for all session-related UI interactions.
Output: RESTful API endpoints for session CRUD operations, secured by authentication.
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
    `src/validation/session.ts` contains `createSessionSchema` and `updateSessionSchema`.
  </verify>
  <done>
    Server-side logic for session management with owner-based authorization is complete.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create API routes for session list and creation</name>
  <files>
    src/app/api/sessions/route.ts
  </files>
  <action>
    Create `src/app/api/sessions/route.ts`.
    Implement a `POST` method to create new sessions, utilizing `getServerSession` from Auth.js (Plan 02) to get the user ID, and calling `createSession` from `src/lib/actions/session.ts`.
    Implement a `GET` method to list all sessions owned by the authenticated user, calling `getSessions`.
    Return appropriate HTTP status codes (200, 201, 400, 401, 500).
  </action>
  <verify>
    `curl -X POST -H "Authorization: Bearer <token>" -d '{"name":"Test Session"}' /api/sessions` returns 201.
    `curl -X GET -H "Authorization: Bearer <token>" /api/sessions` returns a list of sessions.
    Unauthenticated requests return 401.
  </verify>
  <done>
    API endpoints for creating and listing sessions are functional and protected.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create API routes for single session operations</name>
  <files>
    src/app/api/sessions/[id]/route.ts
  </files>
  <action>
    Create `src/app/api/sessions/[id]/route.ts`.
    Implement `GET`, `PUT`/`PATCH`, and `DELETE` methods.
    Each method must:
    - Use `getServerSession` to verify authentication and retrieve `userId`.
    - Extract `id` from the URL parameters.
    - Call the corresponding function from `src/lib/actions/session.ts` (`getSessionById`, `updateSession`, `deleteSession`).
    - Return appropriate HTTP status codes (200, 400, 401, 403, 404, 500).
    Ensure proper error handling, especially for unauthorized access (403 Forbidden) and non-existent sessions (404 Not Found).
  </action>
  <verify>
    `curl -X GET -H "Authorization: Bearer <token>" /api/sessions/<session_id>` returns session details.
    `curl -X PUT -H "Authorization: Bearer <token>" -d '{"name":"Updated Name"}' /api/sessions/<session_id>` returns 200.
    `curl -X DELETE -H "Authorization: Bearer <token>" /api/sessions/<session_id>` returns 200.
    Attempting to access another user's session returns 403.
  </verify>
  <done>
    API endpoints for retrieving, updating, and deleting individual sessions are functional and protected.
  </done>
</task>

</tasks>

<verification>
1.  Log in as a test user.
2.  Use `curl` or a client (e.g., Postman/Insomnia) to test:
    - POST `/api/sessions` to create a session (expect 201).
    - GET `/api/sessions` to list sessions (expect 200 and the created session).
    - GET `/api/sessions/<id>` for the created session (expect 200).
    - PUT `/api/sessions/<id>` to update the session (expect 200).
    - DELETE `/api/sessions/<id>` to delete the session (expect 200).
3.  Attempt all operations as an unauthenticated user or a user who doesn't own the session (expect 401 or 403).
</verification>

<success_criteria>
- A complete and secure RESTful API for session CRUD operations is available.
- All session API endpoints correctly authenticate users and authorize actions based on session ownership.
- Input data is validated at the API level.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-03-SUMMARY.md`
</output>
