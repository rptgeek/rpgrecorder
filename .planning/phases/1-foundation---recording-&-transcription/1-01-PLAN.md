---
phase: 1-foundation---recording-&-transcription
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/
  - .env
  - package.json
autonomous: true
user_setup:
  - service: PostgreSQL
    why: "Database for all application data"
    env_vars:
      - name: DATABASE_URL
        source: "Your PostgreSQL database connection string (e.g., 'postgresql://user:password@host:port/database')"
    dashboard_config:
      - task: "Ensure PostgreSQL database is running and accessible"
        location: "Local setup or cloud provider dashboard"

must_haves:
  truths:
    - "PostgreSQL database is connected and initialized by Prisma."
    - "User and Session tables exist in the database with defined schemas."
    - "Prisma Client can interact with the database."
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Database schema definitions for User and Session models"
      min_lines: 30
      contains: ["model User", "model Session"]
    - path: "prisma/migrations/{timestamp}_initial_migration/migration.sql"
      provides: "SQL script for initial database setup"
      min_lines: 10
      contains: ["CREATE TABLE "User"", "CREATE TABLE "Session""]
    - path: "node_modules/.prisma/client/index.d.ts"
      provides: "Generated Prisma Client for type safety"
  key_links:
    - from: "prisma/schema.prisma"
      to: "PostgreSQL database"
      via: "DATABASE_URL environment variable"
      pattern: "url = env("DATABASE_URL")"
    - from: "src/lib/prisma.ts (or similar)"
      to: "database"
      via: "new PrismaClient()"
      pattern: "new PrismaClient()"
---

<objective>
Initialize Prisma with a PostgreSQL database and define the core `User` and `Session` models.

Purpose: Establish the foundational data layer for authentication and session management. This plan ensures that the database schema is correctly set up for subsequent phases.
Output: Configured Prisma client, `schema.prisma` with `User` and `Session` models, and initial migration files.
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: Initialize Prisma and configure PostgreSQL</name>
  <files>
    package.json
    prisma/schema.prisma
    .env
  </files>
  <action>
    Install Prisma client and Prisma CLI. Initialize Prisma in the project.
    Configure `prisma/schema.prisma` to use PostgreSQL as the provider.
    Add a `DATABASE_URL` entry to `.env` if it doesn't exist, with a placeholder for the PostgreSQL connection string.
  </action>
  <verify>
    `npm list @prisma/client` and `npm list prisma` show installed packages.
    `prisma/schema.prisma` contains `provider = "postgresql"`.
    `.env` contains `DATABASE_URL=`.
  </verify>
  <done>
    Prisma is installed and configured to connect to a PostgreSQL database.
  </done>
</task>

<task type="auto">
  <name>Task 2: Define User and Session models</name>
  <files>
    prisma/schema.prisma
  </files>
  <action>
    Add `User` and `Session` models to `prisma/schema.prisma`.
    The `User` model should include fields like `id`, `email`, `name`, `password` (hashed).
    The `Session` model should include fields like `id`, `name`, `description`, `createdAt`, `updatedAt`, and a relation to `User` for ownership.
    Ensure `id` fields are `String @id @default(cuid())` or `String @id @default(uuid())` and `email` in `User` is `@unique`.
  </action>
  <verify>
    `prisma/schema.prisma` contains valid `model User { ... }` and `model Session { ... }` definitions.
    Fields `id`, `email`, `name` (for User) and `id`, `name`, `description`, `userId`, `createdAt`, `updatedAt` (for Session) are present with correct types and relations.
  </verify>
  <done>
    `User` and `Session` models are correctly defined in `schema.prisma`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Generate and apply initial database migration</name>
  <files>
    prisma/migrations/
  </files>
  <action>
    Generate a new Prisma migration named `initial_migration`.
    Apply the generated migration to the configured PostgreSQL database. This will create the `User` and `Session` tables.
  </action>
  <verify>
    `npx prisma migrate dev --name initial_migration` runs successfully.
    `npx prisma db push` (or `migrate deploy`) runs successfully.
    Connect to the PostgreSQL database and verify that `User` and `Session` tables exist.
  </verify>
  <done>
    Database is migrated with `User` and `Session` tables, ready for data.
  </done>
</task>

</tasks>

<verification>
Verify that `DATABASE_URL` is set in `.env` and points to a running PostgreSQL instance.
Confirm that `npm install` and `npx prisma generate` runs without errors.
Check the PostgreSQL database directly to ensure `User` and `Session` tables are created as per `schema.prisma`.
</verification>

<success_criteria>
- Prisma is fully configured and connected to a PostgreSQL database.
- `User` and `Session` models are defined and reflected as tables in the database.
- Initial data migration has been successfully applied.
</success_criteria>

<output>
After completion, create `.planning/phases/1-foundation---recording-&-transcription/1-01-SUMMARY.md`
</output>