# RPG Session Recorder and Summarizer Roadmap

## Overview

This roadmap outlines the phased development for the TTRPG Session Recorder and Summarizer, focusing on delivering core value incrementally. It begins with establishing a robust foundation for session recording and transcription, progresses to integrating AI-powered summarization and efficient search, and concludes with features for player engagement and basic session insights. Each phase is designed to deliver a coherent, verifiable capability to the user.

## Phases

### Phase 1: Foundation - Recording & Transcription

**Goal:** Users can securely manage their game sessions and accurately capture/transcribe audio content.

**Dependencies:** None

**Requirements:**
- AUTH-01: User can create, log in to, and manage their account securely.
- SESS-01: User can create, edit, delete, and view their TTRPG sessions.
- AUDIO-01: System can record audio during a session.
- AUDIO-02: User can upload audio files for processing.
- TRANS-01: System automatically transcribes recorded/uploaded audio into text.
- TRANS-02: System can identify and differentiate speakers in the transcription.
- REVIEW-01: User can play back session audio synchronized with its transcript.
- NOTES-01: User can add basic manual notes to a session.

**Success Criteria:**
1.  User can successfully create an account, log in, and log out securely.
2.  User can create a new session, record audio directly within the application, and see it successfully transcribed.
3.  User can upload an existing audio file (e.g., MP3, WAV) and view its automatically generated transcript.
4.  User can view a session transcript with clearly differentiated speakers and play back the original audio synchronized with the highlighted text.
5.  User can add, edit, and save basic manual notes associated with a specific session.

**Plans:** 9 plans
- [ ] 1-01-PLAN.md — Database & Prisma Setup
- [ ] 1-02-PLAN.md — Auth.js Integration
- [ ] 1-03-PLAN.md — Session Management API
- [ ] 1-04-PLAN.md — AWS S3 Presigned URL API
- [ ] 1-05-PLAN.md — Client-side Audio Recording & S3 Upload UI
- [ ] 1-06-PLAN.md — AWS Transcribe Integration & Data Storage
- [ ] 1-07-PLAN.md — Session View UI & Basic Transcript Display
- [ ] 1-08-PLAN.md — Synchronized Transcript Playback
- [ ] 1-09-PLAN.md — Basic Manual Notes Feature

### Phase 2: Core Value - AI Summarization & Search

**Goal:** Users can quickly grasp the essence of their sessions through AI-generated summaries and efficiently find specific content using keyword search.

**Dependencies:** Phase 1

**Requirements:**
- AI-01: System automatically generates an AI-powered summary of the session.
- SEARCH-01: User can perform keyword searches within session transcripts.
- DASH-01: System provides a dashboard with an overview of sessions within a campaign.

**Success Criteria:**
1.  User can view an AI-generated summary for any completed session that accurately reflects the key events and outcomes.
2.  User can perform a keyword search within a session's transcript and see all occurrences highlighted, with context.
3.  User can access a dashboard that presents an overview of their created campaigns and lists the sessions within each campaign.

### Phase 3: Player Engagement & Insights

**Goal:** Users can provide tailored recaps to players and gain basic statistical insight into their game sessions.

**Dependencies:** Phase 2

**Requirements:**
- RECAP-01: System can generate player-specific recaps of a session.
- METRICS-01: System can provide basic session metrics (e.g., session length).

**Success Criteria:**
1.  User can generate a distinct summary (recap) of a session specifically for players, which omits GM-only information.
2.  User can view basic analytical metrics for each session, such as total duration, word count, and number of unique speakers.

## Progress

| Phase | Status |
|-------|--------|
| 1     | Planned |
| 2     | Pending |
| 3     | Pending |