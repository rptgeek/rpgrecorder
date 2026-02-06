# Roadmap: RPG Session Recorder and Summarizer

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-02-05)
- 🚧 **v1.1 Serverless Migration & Production Deployment** - Phases 4-8 (in progress)
- 📋 **v2.0 Advanced Features** - Phases 9+ (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) - SHIPPED 2026-02-05</summary>

### Phase 1: Foundation & Authentication
**Goal**: Users can securely access their accounts and manage TTRPG sessions
**Plans**: Complete
**Status**: Shipped

### Phase 2: Transcription & AI Integration
**Goal**: System automatically transcribes audio and generates AI-powered summaries
**Plans**: Complete
**Status**: Shipped

### Phase 3: Player Engagement & Insights
**Goal**: Users can search transcripts, share sessions, and view player-specific recaps
**Plans**: Complete
**Status**: Shipped

</details>

### 🚧 v1.1 Serverless Migration & Production Deployment (In Progress)

**Milestone Goal:** Migrate to fully serverless AWS architecture for 65-82% cost reduction, then deploy to production with zero downtime.

#### Phase 4: Authentication Migration
**Goal**: User authentication migrated from Auth.js database sessions to AWS Cognito JWT tokens
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. Users can sign up and log in using Cognito with JWT tokens stored client-side
  2. Existing user passwords work without forced resets (just-in-time migration)
  3. User sessions persist across browser restarts using JWT refresh tokens
  4. All user data exported and backed up before migration cutover
  5. Cognito "sub" claim available as stable partition key for DynamoDB
**Plans**: TBD

Plans:
- [ ] 04-01: TBD during planning

#### Phase 5: Database Migration & Validation
**Goal**: All application data migrated from PostgreSQL to DynamoDB with validated consistency
**Depends on**: Phase 4 (Cognito provides partition key)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, SEARCH-02, SEARCH-03
**Success Criteria** (what must be TRUE):
  1. DynamoDB single-table schema deployed with composite sort keys for all access patterns
  2. All transcripts stored in S3 with DynamoDB pointers (no items exceed 50KB)
  3. One-time migration script successfully transfers all PostgreSQL data to DynamoDB
  4. Dual-write system running for 2+ weeks with <1% data mismatch detected
  5. Nightly validation confirms 100% data parity between PostgreSQL and DynamoDB
  6. Keyword search works on session names and metadata using DynamoDB FilterExpression
  7. Rollback procedure tested and documented for emergency PostgreSQL restoration
**Plans**: TBD

Plans:
- [ ] 05-01: TBD during planning

#### Phase 6: API Cutover to DynamoDB
**Goal**: All API endpoints read and write exclusively from DynamoDB (PostgreSQL retired)
**Depends on**: Phase 5 (data synchronized and validated)
**Requirements**: CODE-01, CODE-02, CODE-03, CODE-04, CODE-05
**Success Criteria** (what must be TRUE):
  1. All API routes query DynamoDB using Query (not Scan) for efficient access
  2. Auth.js Cognito adapter replaces database adapter (no database sessions)
  3. All CRUD operations (campaigns, sessions, transcripts, summaries) work identically to v1.0
  4. S3 transcript retrieval integrated with DynamoDB pointer references
  5. Dual-write disabled (single-write to DynamoDB only) after validation period
**Plans**: TBD

Plans:
- [ ] 06-01: TBD during planning

#### Phase 7: Serverless Deployment
**Goal**: Application deployed to serverless AWS infrastructure (Lambda + CloudFront + API Gateway)
**Depends on**: Phase 6 (API verified on DynamoDB)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06, DEPLOY-07, DEPLOY-08
**Success Criteria** (what must be TRUE):
  1. Next.js application deployed to Lambda using OpenNext adapter with <500ms cold start
  2. CloudFront CDN serves static assets with edge caching configured
  3. API Gateway routes requests to Lambda with Cognito JWT authorizer
  4. GitHub Actions pipeline automatically deploys on main branch push
  5. AWS Secrets Manager stores all environment secrets (API keys, database URLs)
  6. CloudWatch dashboard shows Lambda invocations, DynamoDB metrics, and error rates
  7. ECS Fargate Spot configured for background transcription/AI jobs via Inngest
  8. Test deployment verified in staging environment before production
**Plans**: TBD

Plans:
- [ ] 07-01: TBD during planning

#### Phase 8: Traffic Migration & Production Cutover
**Goal**: Production traffic fully migrated to serverless stack with cost targets achieved
**Depends on**: Phase 7 (serverless platform deployed)
**Requirements**: MIGRATE-01, MIGRATE-02, MIGRATE-03, MIGRATE-04, MIGRATE-05, MIGRATE-06
**Success Criteria** (what must be TRUE):
  1. Feature flags enable gradual rollout (10% → 50% → 100% traffic to serverless)
  2. CloudWatch confirms error rates <0.1% and API latency <500ms at 100% traffic
  3. Monthly AWS costs verified at $5-12/month (below $18-28 target)
  4. All 13 v1.0 features work identically after migration (zero regressions)
  5. PostgreSQL RDS decommissioned after 2 weeks of stable serverless operation
  6. Incident response runbook tested with successful rollback drill
**Plans**: TBD

Plans:
- [ ] 08-01: TBD during planning

### 📋 v2.0 Advanced Features (Planned)

**Milestone Goal:** Enhanced search, entity tracking, and timeline visualization.

Requirements deferred to v2.0:
- SEARCH-04, SEARCH-05: OpenSearch integration for semantic search
- NOTES-02: GM notes integration with AI summarization
- UI-01: Timeline view for session review
- ENTITY-01: Entity tracking across sessions
- METRICS-02: Persist metrics in database

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5 → 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | Complete | Complete | 2026-02-05 |
| 2. Transcription & AI Integration | v1.0 | Complete | Complete | 2026-02-05 |
| 3. Player Engagement & Insights | v1.0 | Complete | Complete | 2026-02-05 |
| 4. Authentication Migration | v1.1 | 0/TBD | Not started | - |
| 5. Database Migration & Validation | v1.1 | 0/TBD | Not started | - |
| 6. API Cutover to DynamoDB | v1.1 | 0/TBD | Not started | - |
| 7. Serverless Deployment | v1.1 | 0/TBD | Not started | - |
| 8. Traffic Migration & Production Cutover | v1.1 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-06 after v1.1 roadmap creation*
