# Phase 3: Player Engagement & Insights - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two capabilities:
1. **Player-specific recaps** - AI-generated summaries tailored for players that omit GM-only information
2. **Session analytics** - Basic metrics dashboard showing session statistics and trends

The focus is on helping GMs share session outcomes with players and gain insights into their campaign through data.

</domain>

<decisions>
## Implementation Decisions

### Player Recap Content Filtering
- **AI infers from context** - System automatically detects what's GM-only vs player-visible
- **Filter out these content types:**
  - Hidden NPC motivations & secrets
  - Future plot hooks & unresolved threads
  - GM's improvised vs planned content notes
- **Party-level knowledge** - Include everything the party knows collectively, not individual character perspectives
- **Discovered secrets** - Once players learn secrets in-game, include them in player recaps

### Recap Presentation & Tone
- **Multiple format options** - GM can choose between:
  - Narrative prose (story-like flow)
  - Structured sections (organized by topic)
  - Bullet points timeline (chronological list)
- **Genre-aware tone** - AI detects and matches the game genre/tone automatically
- **Moderate detail level** - Target 1-2 pages per recap
- **Include memorable quotes** - Feature standout lines, epic moments, funny exchanges

### Session Metrics & Visualization
- **Comprehensive metrics** across four categories:
  - **Time metrics**: Session duration, talk time per speaker, pause times
  - **Engagement metrics**: Word count, unique speakers, speaking distribution
  - **Content metrics**: NPCs mentioned, locations visited, items acquired
  - **Narrative metrics**: Plot hooks introduced/resolved, decisions made, conflicts encountered
- **Mixed visualization** - Key numbers prominently displayed, charts for complex/comparative data
- **Dual views** - Toggle between single session view and historical trends across campaign
- **Location** - Metrics appear on session detail page alongside transcript/summary

### Sharing & Delivery Method
- **Four sharing methods available:**
  - **Public shareable link** - Anyone can view without logging in
  - **PDF export** - Download for email or printing
  - **Private in-app viewing** - Players log in to view their assigned recaps
  - **Copy to clipboard** - Formatted text for Discord, Slack, etc.
- **Link expiration** - Public links expire after configurable time period (GM sets duration)
- **PDF branding** - Branded with campaign theme, name, logo, and thematic styling
- **Read-only access** - Players view but cannot comment or react to recaps

### Claude's Discretion
- Specific AI prompts for content filtering logic
- Chart library and visualization implementation choices
- PDF generation library and template layout details
- Link expiration default duration
- Error handling and edge cases

</decisions>

<specifics>
## Specific Ideas

- The system should feel like a "game master's assistant" - handling the tedious recap writing so GMs can focus on preparing the next session
- Player recaps should feel like a professional recap you'd get from a TV show recap site - clear, engaging, spoiler-free
- Metrics should give GMs actionable insights (e.g., "Player X barely spoke this session" or "Combat took 60% of session time")

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 03-player-engagement-insights*
*Context gathered: 2026-02-05*
