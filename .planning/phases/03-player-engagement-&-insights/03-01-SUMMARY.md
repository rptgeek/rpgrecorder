---
phase: 03-player-engagement-&-insights
plan: 01
subsystem: Player Engagement & Insights
tags: [Next.js, Prisma, AWS Transcribe, Metrics, UI]
requires: [02-05]
provides: [session-metrics, speaker-management]
metrics:
  duration: 45m
  completed: 2026-02-06
---

# Phase 03 Plan 01: Session Metrics and Speaker Mapping Summary

Implemented the data foundation for session insights and the visual representation of speaker statistics.

## Key Deliverables

- **Database Schema Update**: Added `shareToken`, `playerRecap`, `speakerNames`, and `metrics` fields to the `Session` model.
- **Metrics Parser**: Created a utility to extract total duration, word count, and speaker-specific statistics from AWS Transcribe JSON output.
- **Speaker Statistics Component**: A new UI component that visualizes speaker distribution with progress bars and allows renaming speaker IDs to meaningful names.
- **Enhanced Session Detail Page**: Integrated session metrics (length, word count) and the speaker mapping UI into the main session review experience.
- **Dynamic Transcript Labels**: Updated the transcript display to reflect custom speaker names immediately after they are renamed.

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 & 2| Update Schema and Parser | 0c4c296 | prisma/schema.prisma, src/lib/metrics/parser.ts, package.json |
| 3    | Display Metrics and Speaker Mapping UI | e0fb9ef | src/app/sessions/[id]/page.tsx, src/components/SpeakerStats.tsx, src/components/TranscriptDisplay.tsx, src/lib/actions/session.ts, src/validation/session.ts |

## Deviations from Plan

- **Task 1 & 2 Integration**: Since the schema changes and parser were already partially implemented in the filesystem but not committed, they were verified and committed as a single unit to establish the baseline for Phase 03.
- **Transcript Synchronization**: Extended the task to include updating `TranscriptDisplay` to ensure custom speaker names are shown throughout the transcript, not just in the stats component.

## Decisions Made

- **Speaker Renaming Persistence**: Decided to store speaker name mappings in a `Json` field (`speakerNames`) on the `Session` model for simplicity and flexibility, rather than creating a separate `Speaker` table.
- **In-place Editing**: Implemented speaker renaming as an in-place edit on the session detail page to minimize context switching for the GM.

## Self-Check: PASSED
