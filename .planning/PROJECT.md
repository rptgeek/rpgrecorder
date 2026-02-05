# RPG Session Recorder and Summarizer

## What This Is
A tool designed to help Tabletop Role-Playing Game Masters (GMs) record and summarize their sessions for efficient review, improved world-building, and consistent narrative development.

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

## Target User
Tabletop Role-Playing Game Masters (GMs) who desire a structured system to assist with post-session analysis, continuity tracking, and player engagement.

## Requirements

### Validated
(None yet — ship to validate)

### Active

- [ ] **REC-01**: System can accept and process pre-session GM notes in text, Markdown, and PDF formats.
- [ ] **REC-02**: System can record and transcribe in-session voice notes.
- [ ] **REC-03**: System can identify and extract plot development elements from session data.
- [ ] **REC-04**: System can identify and extract world-building elements from session data.
- [ ] **REC-05**: System can identify and extract NPC interactions from session data.
- [ ] **SUM-01**: System can generate a comprehensive GM summary, integrating GM notes (including un-discovered elements) and transcribed session data.
- [ ] **SUM-02**: System can generate a player-facing summary based solely on player-experienced session data.
- [ ] **REV-01**: System can present session data and summaries in an interactive, searchable timeline view.
- [ ] **REV-02**: Timeline view displays brief event descriptions, snippets, and links to full transcripts.
- [ ] **EXP-01**: System can export GM and Player summaries for printing or sharing.

### Out of Scope
- Dice roll tracking and analysis.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Primary focus on "later review" | User emphasized the importance of post-session analysis | Prioritizes robust review features and summarization quality |
| Prioritize narrative elements over mechanics | User explicitly excluded dice rolls, focusing on plot, world, NPC | System design will center on NLP and content understanding, not combat logs |
| GM notes to actively enhance summaries | User requested GM notes "enhance the session" for summaries | Requires intelligent integration of pre-session context into summary generation |
| Dual summaries (GM/Player) | User requested distinct summaries for different audiences | Summarization logic must differentiate content based on target recipient |
| Interactive timeline for review | User specifically requested timeline view with detail | Core UI for review will be a dynamic, chronological presentation of events |

---
*Last updated: Thursday, February 5, 2026 after initialization*
