---
phase: 1-foundation---recording-&-transcription
plan: 10
type: execute
wave: 2
depends_on: ["1-02"]
files_modified:
  - src/middleware.ts
  - src/app/page.tsx
  - src/app/protected/page.tsx
  - src/components/auth-forms.tsx
autonomous: true

must_haves:
  truths:
    - "Users can successfully register and log in via UI forms."
    - "Users can log out through UI."
    - "Protected routes are inaccessible without authentication and redirect to login."
  artifacts:
    - path: "src/components/auth-forms.tsx"
      provides: "UI components for sign-in/sign-up/sign-out"
      min_lines: 50
    - path: "src/middleware.ts"
      provides: "Middleware for route protection"
      min_lines: 10
  key_links:
    - from: "src/components/auth-forms.tsx"
      to: "/api/auth/signin"
      via: "signIn('credentials', ...)"
      pattern: "signIn\('credentials'"
    - from: "src/middleware.ts"
      to: "src/auth.ts"
      via: "NextAuth(authConfig)"
      pattern: "NextAuth(authConfig)"
---

<objective>
Implement basic authentication UI components and route protection middleware using Auth.js.

Purpose: Provide user-facing authentication mechanisms and enforce access control to application routes.
Output: Login/signup forms, logout functionality, and middleware that protects specified routes.
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement basic login/signup UI and logout functionality</name>
  <files>
    src/app/page.tsx
    src/app/protected/page.tsx
    src/components/auth-forms.tsx
  </files>
  <action>
    Create `src/components/auth-forms.tsx` with React components for user sign-in and sign-up forms that interact with the Auth.js API routes (Plan 02).
    Add a sign-out button component.
    Create a simple `src/app/protected/page.tsx` that can only be accessed by authenticated users for testing purposes.
    Update `src/app/page.tsx` to include links to login/signup or a logout button if authenticated, using `useSession` and `signIn`/`signOut` from `next-auth/react`.
  </action>
  <verify>
    The login and signup forms are rendered and can submit data.
    The logout button is visible when authenticated.
    Interacting with forms/buttons triggers Auth.js client-side functions.
  </verify>
  <done>
    Basic authentication UI components are implemented and integrated into the application.
  </done>
</task>

<task type="auto">
  <name>Task 2: Protect routes with `src/middleware.ts`</name>
  <files>
    src/middleware.ts
  </files>
  <action>
    Implement `src/middleware.ts` to protect application routes (e.g., `/protected`, `/sessions`).
    Configure the middleware to redirect unauthenticated users to a login page (e.g., `/api/auth/signin`).
    Ensure that `_next/*` and `api/auth/*` routes are excluded from middleware protection.
  </action>
  <verify>
    Navigating to `/protected` as an unauthenticated user redirects to `/api/auth/signin`.
    Navigating to `/protected` as an authenticated user successfully displays the content.
    `_next/static/` assets and `/api/auth/` routes are accessible without authentication.
  </verify>
  <done>
    Route protection middleware is implemented and working correctly.
  </done>
</task>

</tasks>

<verification>
1.  Attempt to register a new user via the UI (`auth-forms.tsx`). Verify user is created in the database.
2.  Log in with the newly created user. Verify successful login and ability to access `/protected`.
3.  Log out. Verify redirection and inability to access `/protected`.
4.  Attempt to access `/protected` without logging in. Verify redirection to login.
</verification>

<success_criteria>
- User authentication (sign-up, sign-in, sign-out) is fully functional via the UI.
- Application routes can be protected, redirecting unauthenticated users.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-10-SUMMARY.md`
</output>
