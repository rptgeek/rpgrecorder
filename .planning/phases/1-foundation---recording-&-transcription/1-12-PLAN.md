---
phase: 1-foundation---recording-&-transcription
plan: 12
type: execute
wave: 3
depends_on: ["1-02", "1-03"]
files_modified:
  - src/app/api/sessions/route.ts
  - src/app/api/sessions/[id]/route.ts
autonomous: true

must_haves:
  truths:
    - "Authenticated users can create new sessions via API."
    - "Authenticated users can retrieve a list of their own sessions via API."
    - "Authenticated users can retrieve, update, and delete their specific sessions via API."
    - "Unauthorized users cannot access or modify sessions via API."
  artifacts:
    - path: "src/app/api/sessions/route.ts"
      provides: "API endpoints for creating and listing sessions"
      min_lines: 30
      exports: ["POST", "GET"]
    - path: "src/app/api/sessions/[id]/route.ts"
      provides: "API endpoints for retrieving, updating, and deleting a single session"
      min_lines: 40
      exports: ["GET", "PUT", "PATCH", "DELETE"]
  key_links:
    - from: "src/app/api/sessions/route.ts"
      to: "src/lib/actions/session.ts"
      via: "import and call"
      pattern: "import \{.*\} from "@/lib/actions/session";"
    - from: "src/app/api/sessions/route.ts"
      to: "Auth.js session"
      via: "getServerSession"
      pattern: "getServerSession\(authConfig\)"
---

<objective>
Implement RESTful API endpoints for session CRUD operations, secured by authentication.

Purpose: Expose the session management logic as a secure and accessible API, enabling frontend interaction for SESS-01.
Output: API routes for creating, listing, retrieving, updating, and deleting sessions.
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
@.planning/phases/1-foundation---recording-&-transcription/1-02-SUMMARY.md
@.planning/phases/1-foundation---recording-&-transcription/1-03-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create API routes for session list and creation</name>
  <files>
    src/app/api/sessions/route.ts
  </files>
  <action>
    Create `src/app/api/sessions/route.ts`.
    Implement a `POST` method to create new sessions, utilizing `getServerSession` from Auth.js (Plan 02) to get the user ID, and calling `createSession` from `src/lib/actions/session.ts` (Plan 03).
    Implement a `GET` method to list all sessions owned by the authenticated user, calling `getSessions` from Plan 03.
    Return appropriate HTTP status codes (200, 201, 400, 401, 500) and handle input validation using the schemas from Plan 03.
  </action>
  <verify>
    `curl -X POST -H "Authorization: Bearer <token>" -d '{"name":"Test Session", "description":"A test session"}' /api/sessions` returns 201.
    `curl -X GET -H "Authorization: Bearer <token>" /api/sessions` returns a list of sessions, including the newly created one.
    Unauthenticated POST/GET requests return 401.
  </verify>
  <done>
    API endpoints for creating and listing sessions are functional, protected, and validate input.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create API routes for single session operations</name>
  <files>
    src/app/api/sessions/[id]/route.ts
  </files>
  <action>
    Create `src/app/api/sessions/[id]/route.ts`.
    Implement `GET`, `PUT`/`PATCH`, and `DELETE` methods.
    Each method must:
    - Use `getServerSession` to verify authentication and retrieve `userId`.
    - Extract `id` from the URL parameters.
    - Call the corresponding function from `src/lib/actions/session.ts` (`getSessionById`, `updateSession`, `deleteSession`) from Plan 03.
    - Return appropriate HTTP status codes (200, 400, 401, 403, 404, 500) and handle input validation using the schemas from Plan 03.
    Ensure proper error handling, especially for unauthorized access (403 Forbidden) and non-existent sessions (404 Not Found).
  </action>
  <verify>
    `curl -X GET -H "Authorization: Bearer <token>" /api/sessions/<session_id>` returns session details.
    `curl -X PUT -H "Authorization: Bearer <token>" -d '{"name":"Updated Name"}' /api/sessions/<session_id>` returns 200.
    `curl -X DELETE -H "Authorization: Bearer <token>" /api/sessions/<session_id>` returns 200.
    Attempting to access another user's session returns 403.
  </verify>
  <done>
    API endpoints for retrieving, updating, and deleting individual sessions are functional, protected, and validate input.
  </done>
</task>

</tasks>

<verification>
1.  Log in as a test user (Plan 10).
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
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-12-SUMMARY.md`
</output>
