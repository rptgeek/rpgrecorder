# Phase 03: Player Engagement & Insights - Research

**Researched:** 2024-02-06
**Domain:** TTRPG Session Metrics, AI Recap Generation, PDF Export, Public Sharing
**Confidence:** HIGH

## Summary

Phase 03 focuses on transforming raw session data into player-facing value and GM insights. The core technical challenges involve selective AI summarization (filtering GM secrets), calculating metrics from speaker diarization data, and implementing secure, public-but-obfuscated sharing of recaps.

**Primary recommendation:** Use `@react-pdf/renderer` for client-side PDF generation and `nanoid` for secure shareable links. Extend the existing Inngest workflow to generate player recaps using a specialized prompt that treats GM notes as a priority filter.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Recap Generation:** Use the AI's reasoning to distinguish between player-facing events and GM-only information based on the transcript. GM notes will be used as a primary directive to explicitly include or exclude specific details.
- **Metrics Location:** Session metrics (length, word count, speaker distribution) will be displayed on the existing Session detail page to provide immediate context.
- **Export Options:** Implement three ways to share player recaps:
  1. Copy-to-clipboard (formatted text).
  2. PDF generation.
  3. Shareable links (unique, public-but-obfuscated URLs).

### Claude's Discretion
- Visual representation of speaker distribution (e.g., simple CSS bar chart or breakdown).
- Specific PDF styling (should remain clean and readable for players).
- Obfuscation strategy for shareable links (e.g., NanoID).

### Deferred Ideas (OUT OF SCOPE)
- Multi-player specific recaps (different recaps for different players).
- Advanced analytics/trends across multiple sessions.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-pdf/renderer` | ^3.4 | PDF Generation | The standard for React-based PDF creation. Allows using React components to define layout. |
| `nanoid` | ^5.0 | Unique IDs | Industry standard for secure, URL-friendly, non-sequential unique identifiers. |
| `lucide-react` | (existing) | Icons | Consistent iconography for export/share buttons. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` / `tailwind-merge` | (existing) | Styling | For dynamic bar charts and speaker distribution visuals. |

**Installation:**
```bash
npm install @react-pdf/renderer nanoid
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── sessions/
│   │   └── [id]/           # Existing session detail (GM view)
│   └── share/
│       └── [shareToken]/    # New public recap view (Player view)
├── lib/
│   ├── ai/
│   │   └── recap.ts         # Player recap prompt logic
│   └── metrics/
│       └── parser.ts        # AWS Transcribe JSON parser
└── components/
    ├── PDFRecap.tsx         # @react-pdf/renderer document
    └── SpeakerStats.tsx     # Visual breakdown of session metrics
```

### Pattern 1: Selective AI Recapping
**What:** Using a two-pass approach or a single-pass with high-priority directives to filter "GM Secrets" from player-facing summaries.
**When to use:** Whenever generating content that players will see.
**Logic:** The system prompt should explicitly define the "Player POV" and use the `notes` field as a negative/positive filter (e.g., "If notes mention 'Secret', redact from recap").

### Anti-Patterns to Avoid
- **Generating PDF on Server (Heavily):** `@react-pdf/renderer` can be slow on the server and requires specific Node.js environments. Use client-side generation for export buttons to save server resources.
- **Sequential Share IDs:** Never use auto-incrementing IDs for public sharing. Always use NanoID or UUID to prevent "enumeration attacks" where players could guess other sessions' recaps.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF Layout | Custom HTML to PDF | `@react-pdf/renderer` | Handling page breaks, fonts, and headers in custom HTML-to-Canvas is extremely difficult. |
| Unique Tokens | `Math.random().toString()` | `nanoid` | Cryptographic security and collision resistance. |
| Clipboard Copy | Custom DOM selection | `navigator.clipboard.writeText` | Modern, reliable browser API. |

## Common Pitfalls

### Pitfall 1: SSR Mismatch with `@react-pdf/renderer`
**What goes wrong:** Next.js tries to render the PDF component on the server, resulting in "window is not defined" or "DOMMatrix is not defined".
**How to avoid:** Use `next/dynamic` with `{ ssr: false }` for any component that renders a `PDFViewer` or uses PDF primitives.

### Pitfall 2: Large Transcript Context Window
**What goes wrong:** Large TTRPG sessions (4+ hours) can produce transcripts exceeding 100k words.
**How to avoid:** Claude 3.5 Sonnet handles 200k tokens, but for extremely long sessions, consider summarizing segments first or extracting key events before the final recap pass.

## Code Examples

### AI Recap Prompt
```typescript
const systemPrompt = `
  You are an expert TTRPG Archivist. Your task is to provide a narrative player-facing recap of a session transcript.
  
  Campaign Context: ${campaignDescription}
  GM Directives (IMPORTANT): ${gmNotes}

  Rules:
  1. Narrative Voice: Engaging, immersive prose.
  2. Perspective: Only include what characters actually experienced in the transcript.
  3. Secret Filtering: Use GM Directives to EXPLICITLY EXCLUDE secrets. If a note says "The King is a vampire (Secret)", do not mention it.
  4. Format: 
     # The Story So Far (Prose)
     # Accomplishments (Bullet points)
     # Unresolved Threads (Player-known mysteries only)
`;
```

### Metrics Parsing (AWS Transcribe)
```typescript
// Source: Official AWS Transcribe JSON Structure
export function calculateSpeakerDistribution(transcriptJson: any) {
  const segments = transcriptJson.results.audio_segments || [];
  const stats: Record<string, { duration: number; words: number }> = {};

  segments.forEach((seg: any) => {
    const speaker = seg.speaker_label;
    const duration = parseFloat(seg.end_time) - parseFloat(seg.start_time);
    const words = seg.transcript.split(/\s+/).length;

    if (!stats[speaker]) stats[speaker] = { duration: 0, words: 0 };
    stats[speaker].duration += duration;
    stats[speaker].words += words;
  });

  return stats;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side HTML-to-PDF | Client-side React-to-PDF | 2023/24 | Faster UI response, lower server load. |
| Basic Summary | Selective/Filtered Recap | 2024 (LLMs) | Allows GMs to share AI output safely without spoilers. |

## Open Questions

1. **Speaker Identification:** Does the user want to map "spk_0" to actual character names? 
   - *Recommendation:* Provide a simple UI in Phase 3 to "Rename Speaker" (e.g., spk_0 -> "Kaelen (Paladin)").
2. **PDF Fonts:** Standard fonts are safe, but TTRPG players love thematic fonts.
   - *Recommendation:* Stick to standard readable fonts for Phase 3, allow custom styling in a later polish phase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are mature and tested with Next.js.
- Architecture: HIGH - NanoID + Public routes is a common secure pattern.
- Pitfalls: MEDIUM - SSR issues with PDF libraries are common but well-documented.

**Research date:** 2024-02-06
**Valid until:** 2024-05-06
