# Feature Landscape: DynamoDB Single-Table Migration

**Domain:** Serverless Database Migration
**Researched:** 2026-02-06

---

## Table Stakes

Features users expect in a campaign management app. Missing = product feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User login/signup | Core functionality | Low | Cognito handles; Auth.js integration |
| Create campaigns | Core functionality | Low | DynamoDB PutItem |
| List campaigns | Core functionality | Low | DynamoDB Query with composite SK |
| Create sessions | Core functionality | Low | DynamoDB PutItem + S3 upload |
| List sessions | Core functionality | Low | DynamoDB Query with hierarchy |
| View session transcript | Core functionality | Medium | S3 fetch + DynamoDB metadata |
| Generate summaries | Core functionality | High | AI service call (existing Inngest) |
| Session sharing | v1.0 feature | Low | Keep share token in DynamoDB |
| Search sessions | Core functionality | Medium | FilterExpression (MVP), OpenSearch (v2) |

---

## Differentiators

Features that set product apart in serverless space.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cost transparency | $5-12/month vs $500+/month | Low | Dashboard showing real AWS costs |
| Zero vendor lock-in | Can migrate to any serverless provider | Medium | Export data script; open DynamoDB schema |
| Fine-grained access control | User A cannot see User B data (IAM) | Medium | Cognito sub → DynamoDB PK partition |

---

## Anti-Features

What NOT to build during migration. Common mistakes in serverless adoption.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Support multi-tenancy per table | Adds GSI complexity, security risk | Single table per customer |
| Global secondary indexes (MVP) | Costs extra WCU per write; not needed | Design queries around composite SK |
| Real-time WebSockets in Lambda | Cold starts destroy UX | Use polling or EventBridge for async |
| Full-text search in DynamoDB | Requires complex scan logic | Use FilterExpression (MVP), add OpenSearch later |
| Store transcripts inline | Item size explodes beyond 400KB | Always pointer to S3 (proven pattern) |
| Keep PostgreSQL "just in case" | Creates sync nightmares; doubles costs | Backup RDS 2 weeks post-migration |

---

## Feature Dependencies

Access patterns that support table stakes.

```
User Login (Cognito)
  ↓
User Profile (DynamoDB METADATA)
  ↓
Campaigns List (Query begins_with CAMPAIGN#)
  ↓
Sessions List (Query begins_with SESSION#)
  ├─ Session Details (GetItem)
  ├─ Transcript Fetch (S3 GET)
  └─ Summaries (Query begins_with SUMMARY#)
```

---

## MVP Implementation Checklist

### Phase 1: Authentication (Week 1-2)
- [ ] Cognito User Pool created
- [ ] Auth.js v5 with Cognito provider
- [ ] Signup/login/password reset working

### Phase 2: Database (Week 2-3)
- [ ] DynamoDB table created
- [ ] Data migrated from PostgreSQL
- [ ] Dual-write code deployed

### Phase 3: API Routes (Week 3-4)
- [ ] All CRUD operations use DynamoDB
- [ ] S3 pointer pattern for transcripts
- [ ] Search via FilterExpression

### Phase 4: Deployment (Week 4-5)
- [ ] OpenNext builds Next.js for Lambda
- [ ] CloudFront caching configured
- [ ] Lambda cold starts <500ms

### Phase 5: Cutover (Week 5-6)
- [ ] Gradual traffic shift (10% → 100%)
- [ ] All v1.0 features work identically
- [ ] Cost tracking shows $5-12/month

---

## Sources

- [AWS DynamoDB Design Patterns](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-foundations.html)
- [Auth.js v5 Cognito Provider](https://authjs.dev/getting-started/providers/cognito)

---

*Feature Landscape Research: DynamoDB Single-Table Migration*
*Researched: 2026-02-06*
