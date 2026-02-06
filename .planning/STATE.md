# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Provide GMs with an organized, insightful, and searchable review of their TTRPG sessions, facilitated by a cost-optimized serverless architecture.
**Current focus:** Phase 4 - Authentication Migration

## Current Position

Phase: 4 of 8 (Authentication Migration)
Plan: 1 of TBD in current phase
Status: In progress
Last activity: 2026-02-06 — Completed 04-01-PLAN.md (Cognito Infrastructure Setup)

Progress: [███░░░░░░░] 38% (3/8 phases complete, v1.0 shipped, Phase 4: 1 plan complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 23 (22 in v1.0, 1 in v1.1)
- Average duration: 8 minutes (v1.1 Phase 4)
- Total execution time: ~1 day (v1.0), ~8 minutes (v1.1 to date)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Authentication | Complete | v1.0 | - |
| 2. Transcription & AI Integration | Complete | v1.0 | - |
| 3. Player Engagement & Insights | Complete | v1.0 | - |
| 4. Authentication Migration | 1 | 8 min | 8 min |

**Recent Trend:**
- v1.1 Phase 4 started: 1 plan complete (8 minutes)
- First plan established baseline velocity

*Updated after 04-01 completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.1: Migrate from PostgreSQL to DynamoDB for 65-82% cost reduction
- v1.1: Migrate from Auth.js database sessions to Cognito JWT tokens
- v1.1: Accept FilterExpression search (vs PostgreSQL FTS) for <50 sessions/campaign
- v1.1: Target $18-28/month cost (research indicates $5-12 achievable)
- v1.1: Zero-downtime migration using dual-write validation for 2+ weeks
- 04-01: Use custom:legacy_id attribute for PostgreSQL UUID mapping (enables Cognito ↔ DB correlation)
- 04-01: Exclude password hashes from export backup (security best practice, AUTH-06)
- 04-01: Require USER_PASSWORD_AUTH flow for Migration Lambda (enables password validation)

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

Last session: 2026-02-06 (plan 04-01 execution)
Stopped at: Completed 04-01-PLAN.md (Cognito Infrastructure Setup)
Resume file: None

Next step: User must create Cognito User Pool in AWS Console (follow infra/cognito-setup.md), then proceed to plan 04-02 (User Migration Lambda)

---
*Last updated: 2026-02-06 after 04-01 completion*
