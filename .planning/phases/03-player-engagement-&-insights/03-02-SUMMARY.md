# Summary: AI Player Recaps (Plan 03-02)

Implemented the AI logic and UI for generating player-facing session recaps that selectively filter GM information.

## Accomplishments

- **Selective AI Recap Prompt**: Created `src/lib/ai/recap.ts` using Claude 3.5 Sonnet. The system prompt instructs the AI to act as a TTRPG Archivist and use GM notes to filter out secrets.
- **Inngest Integration**: Integrated recap generation into the `session/transcription.completed` Inngest workflow. Recaps are generated and saved to the `playerRecap` field in the database.
- **Player Recap UI**: Created `src/components/PlayerRecapView.tsx` with Markdown support. Updated the session detail page to include the recap view and a "Regenerate" button.
- **Trigger Endpoint**: Added `src/app/api/inngest/events/route.ts` to allow manual regeneration of recaps from the UI.

## Verification Results

- AI recap correctly omits notes marked as "Secret" or directed to be hidden.
- Recaps are automatically generated after transcription completion.
- GMs can manually trigger recap regeneration.

## Commits

- `c1d11a8`: feat(03-02): implement selective AI recap prompt
- `5aa2d4b`: feat(03-02): integrate recap generation into inngest
- `d55876f`: feat(03-02): implement player recap view UI
