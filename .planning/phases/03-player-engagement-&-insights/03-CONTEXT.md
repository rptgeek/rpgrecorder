# Phase 03 Context: Player Engagement & Insights

## Decisions
- **Recap Generation:** Use the AI's reasoning to distinguish between player-facing events and GM-only information based on the transcript. GM notes will be used as a primary directive to explicitly include or exclude specific details.
- **Metrics Location:** Session metrics (length, word count, speaker distribution) will be displayed on the existing Session detail page to provide immediate context.
- **Export Options:** Implement three ways to share player recaps:
  1. Copy-to-clipboard (formatted text).
  2. PDF generation.
  3. Shareable links (unique, public-but-obfuscated URLs).

## Claude's Discretion
- Visual representation of speaker distribution (e.g., simple CSS bar chart or breakdown).
- Specific PDF styling (should remain clean and readable for players).
- Obfuscation strategy for shareable links (e.g., NanoID).

## Deferred Ideas
- Multi-player specific recaps (different recaps for different players).
- Advanced analytics/trends across multiple sessions.
