# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Provide GMs with an organized, insightful, and searchable review of their TTRPG sessions, facilitated by a cost-optimized serverless architecture.
**Current focus:** Phase 5 - Database Migration & Validation

## Current Position

Phase: 6 of 8 (Production Deployment)
Plan: 06-01 (Core Infrastructure & Foundation) in progress
Status: In progress (executing 06-01)
Last activity: 2026-02-07 — Started execution of 06-01 (Core Infrastructure & Foundation)

Progress: [█████░░░░░] 62.5% (5/8 phases complete)


## Performance Metrics

**Velocity:**
- Total plans completed: 26 (22 in v1.0, 4 in v1.1)
- Average duration: 10 minutes (v1.1 Phase 4)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Authentication | Complete | v1.0 | - |
| 2. Transcription & AI Integration | Complete | v1.0 | - |
| 3. Player Engagement & Insights | Complete | v1.0 | - |
| 4. Authentication Migration | Complete | 40 min | 10 min |
| 5. Database Migration | 0 | - | - |

**Recent Trend:**
- v1.1 Phase 4 started: 3 plans complete (25 minutes)
- Velocity trend: 8 min → 5 min → 12 min per plan

*Updated after 04-03 completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- New Decision: No data needs to be migrated from PostgreSQL; focus directly on making the application work with the new DynamoDB backend.
- New Decision: Forgo dual-write validation for PostgreSQL to DynamoDB migration as the project is not yet in production, and proceed with a one-time data migration.
- v1.1: Migrate from PostgreSQL to DynamoDB for 65-82% cost reduction
- v1.1: Migrate from Auth.js database sessions to Cognito JWT tokens
- v1.1: Accept FilterExpression search (vs PostgreSQL FTS) for <50 sessions/campaign
- v1.1: Target $18-28/month cost (research indicates $5-12 achievable)
- v1.1: Zero-downtime migration using dual-write validation for 2+ weeks
- 04-01: Use custom:legacy_id attribute for PostgreSQL UUID mapping (enables Cognito ↔ DB correlation)
- 04-01: Exclude password hashes from export backup (security best practice, AUTH-06)
- 04-01: Require USER_PASSWORD_AUTH flow for Migration Lambda (enables password validation)
- 04-02: Use bcrypt 5.x for Lambda compatibility (6.x has native module issues)
- 04-02: Set Lambda max connections to 1 (efficient for single-threaded Lambda instances)
- 04-02: Set Lambda timeout to 10 seconds (bcrypt is CPU-intensive)
- 04-02: Suppress welcome emails for migrated users (better UX for existing users)
- 04-03: Lazy-load JWT verifier and Cognito client (prevents build errors when env vars not set)
- 04-03: Use 60-second token expiry buffer (prevents race conditions with in-flight requests)
- 04-03: Use account.expires_at for token expiration (avoids TypeScript type errors)

### Pending Todos

None yet.

### Blockers/Concerns

**From Research:**
- Dual-write transaction semantics: Need to define atomic write boundary if DynamoDB succeeds but S3 fails
- FilterExpression performance baseline: Measure actual RCU costs with realistic dataset during Phase 5
- Transcript size validation: Validate against actual session recordings (research estimates 10-100KB)
- Cost monitoring dashboard: Include in Phase 5 to track daily AWS costs

**Migration Risks (mitigated):**
- Transcript >400KB item size limit: Prevented by S3 pointer pattern
- Data inconsistency during dual-write: Mitigated by nightly validation + 2 week validation window
- Sort key format chaos: Prevented by TypeScript helpers + unit tests

## Session Continuity

Last session: 2026-02-06 (plan 04-03 execution)
Stopped at: Completed 04-03-PLAN.md (Auth.js Cognito Provider Integration)
Resume file: None

Next step: Execute plan 06-01 (Core Infrastructure & Foundation)

---
*Last updated: 2026-02-06 after 04-03 completion*
