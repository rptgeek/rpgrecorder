# Feature Landscape

**Domain:** TTRPG Session Recording, Transcription, Summarization, and Insight Generation
**Researched:** 2024-05-20

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User Authentication & Authorization | Secure access, personalize experience | Medium | Standard for any user-facing application; ensures GMs and players access only their relevant data. |
| Session Management (CRUD) | Organize and control sessions | Low | Users need to create, view, update, and delete their recording sessions. |
| Audio Recording & Upload | Core input mechanism | Medium | Directly captures game data; robust handling of various audio sources and file sizes. |
| Automatic Transcription (STT) | Transforms audio into usable text | High | Essential for all subsequent AI processing and text-based search. Accuracy is critical. |
| Basic Session Playback & Text Sync | Review sessions efficiently | Medium | Allows GMs to listen to audio while following along with the synchronized transcript. |
| Basic Note-Taking (GM) | Augment AI with manual insights | Low | GMs need to add their own observations or correct minor transcript errors. |
| Text Search (Keyword) | Find specific moments/topics | Medium | Ability to quickly locate mentions of characters, spells, or plot points within a transcript. |
| Speaker Identification | Understand who said what | High | Differentiating players/GM is crucial for context in TTRPGs; improves summarization and recaps. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-Powered Summarization | Saves GM time, highlights key events | High | Automatically generates concise summaries of plot developments, character interactions, and session outcomes. |
| Entity Extraction & Tracking | Organizes game world data | High | Identifies and tracks characters (PCs/NPCs), locations, items, organizations, and custom tags across sessions, building a living campaign wiki. |
| Semantic Search | Finds relevant content by meaning | High | Allows GMs to search for concepts ("What did they decide about the ancient artifact?") even if specific keywords aren't used. |
| GM Dashboard & Campaign Overview | Holistic campaign management | Medium | Provides a centralized view of recurring themes, NPC arcs, player tendencies, and overall plot progression across sessions. |
| Player-Specific Recaps | Engages players, saves GM prep | Medium | Generates personalized summaries for each player, focusing on their character's actions, decisions, and impact. |
| Customizable Summarization & Recap Parameters | Tailors output to specific needs | Medium | GMs can adjust settings to prioritize combat, role-playing, plot, or specific characters in summaries/recaps. |
| Plot Hook & Loose End Identification | Aids in world-building & improv | High | AI assists GMs in identifying unresolved narrative threads, foreshadowing, or potential future story elements. |
| Session Metrics & Analytics | Insights into game flow | Medium | Provides basic data on session length, speaking time distribution among players, and pacing trends. |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full Virtual Tabletop (VTT) functionality | Scope creep, resource drain, deviates from core value | Focus on providing insights and organization *for* the game, not *how* the game is played. Integrate with VTTs if needed. |
| Over-reliance on manual tagging/categorization | Defeats the purpose of AI automation | Use AI for automatic extraction; provide simple tools for GMs to *refine* or *add* to AI-generated insights, not manually build them. |
| Real-time transcription with no post-processing | Sacrifices accuracy for a feature not aligned with post-session review | Prioritize high accuracy for post-session review. Offer near-real-time only if quality can be maintained and user expectation is managed. |
| Complex social networking features | Distraction from core utility, not a social app | Keep communication features minimal and focused on session logistics or sharing summaries. Avoid general-purpose social feeds. |

## Feature Dependencies

```mermaid
graph TD
    A[User Authentication] --> B[Session Management]
    B --> C[Audio Recording & Upload]
    C --> D[Automatic Transcription (STT)]
    D --> E[Basic Session Playback & Text Sync]
    D --> F[Text Search (Keyword)]
    D --> G[Speaker Identification]
    D --> H[AI-Powered Summarization]
    D --> I[Entity Extraction & Tracking]
    H --> J[GM Dashboard & Campaign Overview]
    I --> J
    H --> K[Player-Specific Recaps]
    I --> K
    F --> L[Semantic Search]
    H --> L
    I --> L
    J --> M[Plot Hook & Loose End Identification]
    J --> N[Session Metrics & Analytics]
    H --> O[Customizable Summarization Parameters]
    K --> O
    E --> P[Basic Note-Taking (GM)]
```

## MVP Recommendation

For MVP, prioritize:
1.  **User Authentication & Authorization:** Fundamental for any multi-user app.
2.  **Session Management (CRUD):** Users need to create and manage their recording sessions.
3.  **Audio Recording & Upload:** The primary input mechanism.
4.  **Automatic Transcription (STT):** The crucial step to transform audio into processable data.
5.  **Basic Session Playback & Text Sync:** Allows users to review the transcribed session.
6.  **AI-Powered Summarization (Foundational):** The core value proposition, even if basic, demonstrates the product's potential.

Defer to post-MVP:
-   **Semantic Search:** Requires solid AI summarization and entity extraction first.
-   **Player-Specific Recaps:** Builds on successful general summarization.
-   **Plot Hook & Loose End Identification:** Advanced AI feature, refine core AI first.
-   **Complex GM Dashboard features:** Can be iterated on after core data is established.

## Sources

-   Analysis of existing TTRPG tools (e.g., Owlbear Rodeo, Foundry VTT - for what *not* to be).
-   Market research into AI summarization tools and their typical features.
-   General best practices for user-centric application design.
