# Phase 02: Core Value - AI Summarization & Search - Research

**Researched:** 2025-02-05
**Domain:** AI Summarization, Full-Text Search, Campaign Management
**Confidence:** HIGH

## Summary

This phase focuses on extracting value from the transcripts generated in Phase 01. Research confirms that **Claude 3.5 Sonnet** (via AWS Bedrock or API) is the current gold standard for long-form narrative summarization due to its 200k token context window and high reasoning capabilities. For search, **PostgreSQL Full-Text Search (FTS)** is the recommended path over external engines for the MVP, provided it is implemented with proper indexing (`tsvector` and GIN indexes).

**Primary recommendation:** Use Claude 3.5 Sonnet for summarization and PostgreSQL native FTS (via Prisma Raw SQL) for keyword search.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Anthropic Claude 3.5 Sonnet | Latest | Summarization | 200k context window fits 99% of TTRPG sessions (up to ~150k words) in one call. |
| PostgreSQL FTS | 15+ | Keyword Search | Native to the existing DB, extremely performant with GIN indexes, supports ranking and snippets. |
| AWS Bedrock | - | LLM Hosting | Seamless integration with existing AWS infrastructure used in Phase 01. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| LangChain / Vercel AI SDK | Latest | LLM Orchestration | Simplifies streaming and prompt management in Next.js. |
| Inngest / Upstash QStash | Latest | Background Jobs | Recommended for handling long-running LLM calls (30s+) to avoid Vercel/Next.js timeouts. |

**Installation:**
```bash
npm install @ai-sdk/anthropic ai
# or if using Bedrock
npm install @aws-sdk/client-bedrock-runtime
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── ai/
│   │   ├── prompts.ts      # Structured prompts for TTRPG
│   │   └── summarize.ts    # Summarization logic
│   └── search/
│       └── postgres.ts     # FTS Raw SQL queries
└── app/
    ├── dashboard/          # Campaign overview
    └── api/
        ├── search/         # Search endpoint
        └── summarize/      # Background trigger for AI
```

### Pattern 1: PostgreSQL FTS with Prisma
Prisma's preview `fullTextSearchPostgres` does not support indexes. For performance, use Raw SQL.
**What:** Add a `search_vector` column to the `Session` table.
**Example:**
```sql
-- Migration or Manual Setup
ALTER TABLE "Session" ADD COLUMN "transcript_text" TEXT;
ALTER TABLE "Session" ADD COLUMN "search_vector" tsvector;
CREATE INDEX idx_session_search_vector ON "Session" USING GIN (search_vector);

-- Update trigger
CREATE FUNCTION session_search_vector_update() RETURNS trigger AS $$
BEGIN
  new.search_vector := to_tsvector('english', coalesce(new.name, '') || ' ' || coalesce(new.transcript_text, ''));
  RETURN new;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_session_search_vector_update
BEFORE INSERT OR UPDATE ON "Session"
FOR EACH ROW EXECUTE FUNCTION session_search_vector_update();
```

### Anti-Patterns to Avoid
- **Client-side Search:** Don't pull all transcripts to the client for searching. TTRPG transcripts can be megabytes in size.
- **Synchronous LLM Calls:** Don't call the LLM directly in a standard API route without handling timeouts (30s+). Use background jobs or streaming.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI Summarization | Custom LSTM/small LLM | Claude 3.5 Sonnet | TTRPG sessions require high reasoning and long context. |
| Keyword Search | `LIKE %query%` | Postgres FTS | `LIKE` is slow and doesn't support ranking/stemming (e.g., "fighting" matching "fight"). |
| Job Queue | Custom polling | Inngest / QStash | Handles retries and long durations out-of-the-box. |

## Common Pitfalls

### Pitfall 1: Token Limits
**What goes wrong:** A 6-hour session might exceed 200k tokens.
**How to avoid:** Implement a basic check. If tokens > 180k, use a "map-reduce" approach (summarize chunks first, then summarize summaries).

### Pitfall 2: LLM Hallucinations in Lore
**What goes wrong:** The AI invents NPCs or forgets key items.
**How to avoid:** Provide "System Context" including the Campaign description and existing known NPCs in the prompt.

### Pitfall 3: Search JSON directly
**What goes wrong:** Searching inside the `transcriptJson` column is slow and complex.
**How to avoid:** Maintain a flattened `transcriptText` column updated during the transcription completion phase.

## Code Examples

### Summarization Prompt Pattern
```typescript
const prompt = `
You are an expert TTRPG Archivist. 
Below is a transcript of a gaming session. 
Please provide a summary including:
1. Executive Summary (2-3 paragraphs)
2. Key NPCs Met & Their Roles
3. Important Items/Loot Found
4. Significant Plot Hooks & Unresolved Threads
5. Notable "Quotes" or Memorable Moments

Transcript:
${transcriptText}
`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GPT-3.5 (4k) | Claude 3.5 (200k)| 2024 | Can process entire 4-hour sessions in one go. |
| Manual DB Search | Vector Search (RAG) | 2023 | Vector search is better for "meaning", but keyword search (FTS) is often preferred by players for "finding that one thing a character said". |

**Note on Vector Search:** While RAG is popular, it is likely overkill for SEARCH-01 (keyword search). Stick to FTS for MVP.

## Open Questions

1. **How to handle multi-speaker diarization?**
   - AWS Transcribe provides speaker labels (Speaker 0, Speaker 1). The LLM can often infer who is who if the players say each other's names, but a "Speaker Mapping" UI might be needed in Phase 3.
   - Recommendation: Pass speaker labels to the LLM; it's surprisingly good at context.

## Sources

### Primary (HIGH confidence)
- [Anthropic Claude Docs](https://docs.anthropic.com/en/docs/about-claude/models) - Model capabilities and context windows.
- [PostgreSQL FTS Docs](https://www.postgresql.org/docs/current/textsearch.html) - Official documentation on `tsvector` and ranking.
- [Prisma Raw SQL Guide](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access) - Recommended way to handle FTS.

### Metadata
**Confidence breakdown:**
- Standard stack: HIGH - Industry standard for 2025.
- Architecture: HIGH - Proven patterns for Next.js/Postgres.
- Pitfalls: MEDIUM - Based on common LLM implementation issues.

**Research date:** 2025-02-05
**Valid until:** 2025-05-05 (Fast-moving AI domain)
