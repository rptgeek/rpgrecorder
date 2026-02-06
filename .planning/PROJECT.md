# RPG Session Recorder and Summarizer

## What This Is
A complete TTRPG session recording and AI summarization platform that helps Game Masters capture, transcribe, summarize, and share their gameplay sessions. The system provides automatic transcription with speaker identification, AI-powered narrative summaries using Claude 3.5 Sonnet, player-specific recaps that filter GM-only information, and professional export/sharing capabilities.

## Core Value
Provide GMs with an organized, insightful, and searchable review of their TTRPG sessions, facilitating plot development, world-building, and NPC management, while offering tailored, player-facing recaps.

## How This Works
1.  **Pre-session Preparation:** GMs upload their existing campaign notes (e.g., plot outlines, NPC backstories, lore entries) in various formats (text, Markdown, PDF) to provide context.
2.  **In-session Recording:** During gameplay, GMs record voice notes to capture real-time events, player actions, and organic narrative progression.
3.  **Intelligent Processing:** Recorded voice notes are automatically transcribed. The system then processes these transcriptions alongside the pre-uploaded GM notes to identify and extract key information regarding plot development, world-building elements, and NPC interactions.
4.  **Dual Summarization:** Two distinct summaries are generated:
    *   **GM Summary:** A comprehensive recap integrating background information from GM notes (including elements not discovered by players, such as hidden plot hooks, full NPC motivations, and deeper lore) with the actual session events.
    *   **Player Summary:** A player-facing recap that exclusively details what the players experienced, saw, and did, without revealing any meta-game or GM-only information.
5.  **Interactive Review:** All session data, including original GM notes, transcribed audio, and both summaries, is presented in an interactive, searchable timeline view. This timeline highlights significant events with brief descriptions, supporting snippets from the transcript, and optional links back to the full transcript for deeper dives.
6.  **Export & Share:** Summaries (GM or Player versions) can be easily exported for printing or sharing with specific audiences (e.g., sending player recaps to the players).

## Constraints
*   None explicitly identified yet.

## Context

**Current State (v1.0 shipped 2026-02-05):**
- ~7,879 lines of TypeScript/React
- Tech stack: Next.js 14, Prisma, PostgreSQL (AWS RDS), AWS S3, AWS Transcribe, Claude 3.5 Sonnet (via AI SDK), Inngest
- All 13 v1 requirements delivered and production-ready
- 3 complete end-to-end user flows verified
- Security audit passed with all critical issues resolved

**Known Technical Debt:**
- Metrics field defined in schema but calculated on-demand (not persisted)
- Phase 1 and Phase 2 missing VERIFICATION.md documentation

## Target User
Tabletop Role-Playing Game Masters (GMs) who desire a structured system to assist with post-session analysis, continuity tracking, and player engagement.

## Current Milestone: v1.1 - Serverless Migration & Production Deployment

**Goal:** Migrate application to fully serverless AWS architecture for 65-82% cost reduction, then deploy to production with CI/CD automation.

**Target features:**
- Migrate authentication from Auth.js → AWS Cognito (JWT-based, client-side tokens)
- Migrate database from PostgreSQL/Prisma → DynamoDB single-table design
- Reimplement data access layer with AWS SDK DynamoDB client
- Redesign search from PostgreSQL FTS → DynamoDB attribute filtering
- Deploy serverless stack: Lambda (API routes) + S3 + CloudFront + Cognito + DynamoDB
- ECS Fargate Spot for background jobs (transcription/AI orchestration)
- GitHub Actions CI/CD pipeline for automated deployments
- Cost-optimized architecture targeting ~$18-28/month (vs $60-100 for previous architecture)

## Requirements

### Validated

- ✓ **AUTH-01**: User can create, log in to, and manage their account securely — v1.0
- ✓ **SESS-01**: User can create, edit, delete, and view their TTRPG sessions — v1.0
- ✓ **AUDIO-01**: System can record audio during a session — v1.0
- ✓ **AUDIO-02**: User can upload audio files for processing — v1.0
- ✓ **TRANS-01**: System automatically transcribes recorded/uploaded audio into text — v1.0
- ✓ **TRANS-02**: System can identify and differentiate speakers in the transcription — v1.0
- ✓ **REVIEW-01**: User can play back session audio synchronized with its transcript — v1.0
- ✓ **NOTES-01**: User can add basic manual notes to a session — v1.0
- ✓ **AI-01**: System automatically generates an AI-powered summary of the session — v1.0
- ✓ **SEARCH-01**: User can perform keyword searches within session transcripts — v1.0
- ✓ **DASH-01**: System provides a dashboard with an overview of sessions within a campaign — v1.0
- ✓ **RECAP-01**: System can generate player-specific recaps of a session — v1.0
- ✓ **METRICS-01**: System can provide basic session metrics (e.g., session length) — v1.0

### Active

(Requirements for v1.1 milestone will be defined in REQUIREMENTS.md after research phase)

### Out of Scope
- Dice roll tracking and analysis.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Primary focus on "later review" | User emphasized the importance of post-session analysis | ✓ Good - Delivered transcript playback, search, summaries, and metrics |
| Prioritize narrative elements over mechanics | User explicitly excluded dice rolls, focusing on plot, world, NPC | ✓ Good - AI summaries focus on narrative (NPCs, plot hooks, items, quotes) |
| GM notes to actively enhance summaries | User requested GM notes "enhance the session" for summaries | ⚠️ Deferred - Manual notes exist but not integrated into AI summarization (v2) |
| Dual summaries (GM/Player) | User requested distinct summaries for different audiences | ✓ Good - GM summary + player recap with AI-driven content filtering |
| Interactive timeline for review | User specifically requested timeline view with detail | ⚠️ Deferred - Transcript display works but not timeline format (v2) |
| Use Claude 3.5 Sonnet for AI | Best-in-class narrative understanding | ✓ Good - High quality structured summaries and recaps |
| PostgreSQL FTS for search | No external dependencies, good enough for v1 | ✓ Good - Works well for keyword search, semantic search for v2 |
| Inngest for background jobs | Keep UI responsive during long AI operations | ✓ Good - Smooth UX with async summarization |
| AWS Transcribe for transcription | Reliable, speaker diarization included | ✓ Good - Accurate transcription with speaker identification |

---
*Last updated: 2026-02-05 after v1.1 milestone start*
