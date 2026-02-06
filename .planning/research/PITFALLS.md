# Domain Pitfalls: DynamoDB Single-Table Migration

**Domain:** Serverless Database Migration
**Researched:** 2026-02-06

---

## Critical Pitfalls

### Pitfall 1: Transcript Storage Exceeds 400KB Item Limit

**What goes wrong:** Storing 100KB+ transcripts inline in DynamoDB items causes item size to exceed 400KB hard limit. PutItem fails. Data loss.

**Prevention:**
- Use S3 pointer pattern: DynamoDB stores reference, not content
- Validate item sizes during Phase 2 testing
- Test with realistic transcripts (10-100KB)
- CloudWatch alert on items >200KB

**Example:**
```typescript
// RIGHT: Transcript pointer
{ PK: "USER#123", SK: "SESSION#xyz", 
  transcriptS3Key: "s3://bucket/xyz.txt", contentLength: 87000 }
```

---

### Pitfall 2: Data Inconsistency During Dual-Write Migration

**What goes wrong:** Writes go to PostgreSQL but not DynamoDB (or vice versa). Read cutover happens with stale/missing data.

**Prevention:**
- Validation script: compare PostgreSQL ↔ DynamoDB nightly
- Atomic writes: if either DB fails, fail entire request
- Run Phase 2 for 2+ weeks minimum
- Alert on >1% record mismatches

---

### Pitfall 3: Composite Sort Key Format Becomes Unmanageable

**What goes wrong:** SK format is undocumented or inconsistent. Different code paths use different formats. Queries fail silently.

**Prevention:**
- Document format explicitly:
  `ENTITY_TYPE#parent_id#[parent_id]#[subtype]`
- Use helper functions (no hardcoded SKs)
- TypeScript enums for entity types
- Unit tests for all SK combinations

---

## Moderate Pitfalls

### Pitfall 1: Search Performance with FilterExpression

**What goes wrong:** FilterExpression applies AFTER read. Scanning 100 sessions to filter 2 costs 100 RCU, not 2 RCU.

**Prevention:**
- Use FilterExpression only for <100 items
- Document: "Search works well for <50 sessions/campaign"
- Plan OpenSearch for v1.2 if scaling
- CloudWatch alert: average RCU per search > 10

### Pitfall 2: Partition Hot Spot (Power User Scenario)

**What goes wrong:** One user creates 10,000 sessions. All share partition key USER#power-user. Throttling occurs.

**Prevention:**
- Monitor partition distribution (CloudWatch)
- For power users, consider sharding: USER#<userId>#SHARD#<num>
- DynamoDB auto-scaling handles most cases

---

## Minor Pitfalls

- **Forgetting eventually consistent reads:** 50% cost savings if using ConsistentRead: false
- **Not using batch operations:** BatchGetItem 50x cheaper than 50 GetItem calls

---

## Phase-Specific Warnings

| Phase | Pitfall | Mitigation |
|-------|---------|-----------|
| Phase 1 | Password migration fails | Use just-in-time Lambda trigger |
| Phase 2 | Data drift between DBs | Nightly validation script + 2-week window |
| Phase 3 | Cutover errors missed | Monitor error logs + latency at 10%/50%/100% |
| Phase 4 | PostgreSQL backup not tested | Verify restoration before deletion |

---

## Recovery Procedures

**Data Loss:** Stop writes → Restore from PostgreSQL → Fix dual-write bug → Re-migrate

**Performance Degrades:** Check CloudWatch metrics → Optimize queries → Add caching

**Cost Spikes:** Identify expensive operations → Switch from Scan to Query → Use S3 for large items

---

*Domain Pitfalls Research: DynamoDB Single-Table Migration*
*Researched: 2026-02-06*
