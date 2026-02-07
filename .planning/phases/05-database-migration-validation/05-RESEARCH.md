## RESEARCH COMPLETE

**Phase:** 05 - Database Migration & Validation
**Confidence:** MEDIUM (Investigation interrupted by time limit)

### Key Findings

- **Standard Stack:** **ElectroDB** or **DynamoDB Toolbox** are the current SOTA for TypeScript single-table design. ElectroDB is recommended for superior type safety and query building. Use **AWS SDK v3** for all interactions.
- **Migration Strategy:** A **Dual-Write** pattern is mandatory for the requested 2-week validation period. Use **AWS Database Migration Service (DMS)** for the initial "seed" migration and keep it running for CDC (Change Data Capture) if custom app-layer dual-writes are too complex for the initial phase.
- **Transcript Storage:** The **S3 Pointer Pattern** is critical. Store the S3 URI/Key in DynamoDB and the actual content in S3 to bypass the 400KB item limit.
- **Search:** `FilterExpression` is acceptable for <50 sessions per campaign but carries a cost: DynamoDB reads the items *before* filtering, so "scanned" vs "returned" count affects performance/cost.

---

### Phase 05: Database Migration & Validation - Research Content

<user_constraints>
## User Constraints

### Locked Decisions
- Migrate from PostgreSQL to DynamoDB for 65-82% cost reduction.
- Accept FilterExpression search (vs PostgreSQL FTS) for <50 sessions/campaign.
- Zero-downtime migration using dual-write validation for 2+ weeks.
- Transcript >400KB item size limit: Prevented by S3 pointer pattern.
- Data inconsistency during dual-write: Mitigated by nightly validation + 2 week validation window.
- Sort key format chaos: Prevented by TypeScript helpers + unit tests.

### Claude's Discretion
- Library selection for single-table design (e.g., ElectroDB vs. DynamoDB Toolbox).
- Specific ETL pipeline technology (e.g., DMS, Glue, or custom Lambda).

### Deferred Ideas (OUT OF SCOPE)
- None specified.
</user_constraints>

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `electrodb` | Latest | Single-Table Modeling | Best-in-class TypeScript support, prevents sort-key errors. |
| `@aws-sdk/client-dynamodb` | v3 | Core AWS Client | Modular, tree-shakeable, current standard. |
| `aws-dms` | Service | ETL / Data Sync | Managed service for CDC and bulk migration. |

## Architecture Patterns

### Single-Table Schema
- **PK (Partition Key):** `USER#[userId]` or `CAMP#[campaignId]`
- **SK (Sort Key):** `METADATA`, `SESS#[sessionId]`, or `CAMP#[campaignId]`
- **GSI1:** For reverse lookups (e.g., Session to Campaign if needed).

### S3 Pointer Pattern
- Store `transcriptStorageKey` in the DynamoDB item.
- Application layer handles the fetch from S3 when `transcript` is requested.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sort Key Concatenation | Template Literals | ElectroDB | Prevents formatting mismatches and "sort key chaos". |
| Data Migration | Custom Scripts | AWS DMS | Handles retries, checkpointing, and CDC automatically. |
| Search (Basic) | Custom Indexing | FilterExpression | Requirements allow for small-scale search without ElasticSearch/OpenSearch. |

## Common Pitfalls

- **Pitfall: Hot Partitions.** Writing too many sessions to a single Campaign PK simultaneously. *Prevention:* Ensure Partition Keys are well-distributed (User ID is usually safe).
- **Pitfall: GSI Eventual Consistency.** Reading from a GSI immediately after a write. *Prevention:* Use Strong Consistency on PK/SK reads or accept lag.
- **Pitfall: FilterExpression Costs.** Filters happen *after* the read. A query with a filter still consumes RCU for all items scanned.

## Code Examples (ElectroDB)

```typescript
import { Entity } from 'electrodb';

const Sessions = new Entity({
  model: { entity: 'session', version: '1', service: 'rpg' },
  attributes: {
    sessionId: { type: 'string' },
    campaignId: { type: 'string' },
    name: { type: 'string' },
    transcriptS3Key: { type: 'string' }, // S3 Pointer
  },
  indexes: {
    byCampaign: {
      pk: { field: 'pk', template: 'CAMP#${campaignId}' },
      sk: { field: 'sk', template: 'SESS#${sessionId}' }
    }
  }
});
```
