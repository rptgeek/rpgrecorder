# Requirements: RPG Session Recorder and Summarizer

**Defined:** 2026-02-06
**Core Value:** Provide GMs with an organized, insightful, and searchable review of their TTRPG sessions, facilitated by a cost-optimized serverless architecture.

## v1.1 Requirements (Serverless Migration)

Requirements for serverless architecture migration and AWS deployment.

### Authentication Migration

- [ ] **AUTH-02**: Cognito User Pool created with proper configuration (password policy, MFA optional, token expiry)
- [ ] **AUTH-03**: Auth.js v5 integrated with Cognito provider for JWT-based authentication
- [ ] **AUTH-04**: Just-in-time password migration Lambda implemented for zero-downtime user migration
- [ ] **AUTH-05**: User session handling migrated from database sessions to JWT tokens
- [ ] **AUTH-06**: User data export and backup completed before migration cutover

### Database Migration

- [ ] **DATA-01**: DynamoDB single-table schema designed with composite sort keys for all access patterns
- [ ] **DATA-02**: S3 pointer architecture implemented for transcripts (avoiding 400KB item size limit)
- [ ] **DATA-03**: PostgreSQL to DynamoDB ETL pipeline created for one-time data migration
- [ ] **DATA-04**: Dual-write validation system running for 2+ weeks before cutover
- [ ] **DATA-05**: Data integrity validation suite confirms 100% data parity between PostgreSQL and DynamoDB
- [ ] **DATA-06**: Rollback mechanism tested and documented for emergency PostgreSQL restoration

### Search Implementation

- [ ] **SEARCH-02**: DynamoDB FilterExpression implemented for keyword search on session names and metadata
- [ ] **SEARCH-03**: Search performance validated for campaigns with <50 sessions

### Code Migration

- [ ] **CODE-01**: Auth.js database adapter replaced with Cognito SDK integration
- [ ] **CODE-02**: All Prisma queries replaced with DynamoDB SDK queries using DocumentClient
- [ ] **CODE-03**: API routes updated to use DynamoDB access patterns (PK/SK queries)
- [ ] **CODE-04**: S3 transcript storage and retrieval integrated with DynamoDB pointer references
- [ ] **CODE-05**: Type definitions updated for DynamoDB entity schemas

### Serverless Deployment

- [ ] **DEPLOY-01**: Infrastructure as Code implemented with SST or CDK for all AWS resources
- [ ] **DEPLOY-02**: Next.js application deployed to Lambda using OpenNext adapter
- [ ] **DEPLOY-03**: CloudFront CDN configured for static assets and Lambda@Edge routing
- [ ] **DEPLOY-04**: API Gateway configured for API routes with Cognito authorizer
- [ ] **DEPLOY-05**: GitHub Actions CI/CD pipeline automated for deployments
- [ ] **DEPLOY-06**: Environment secrets managed via AWS Secrets Manager or Parameter Store
- [ ] **DEPLOY-07**: CloudWatch monitoring dashboard and alarms configured for Lambda, DynamoDB, and errors
- [ ] **DEPLOY-08**: ECS Fargate Spot configured for background transcription jobs

### Migration Execution

- [ ] **MIGRATE-01**: Feature flags implemented for gradual rollout (read/write toggles)
- [ ] **MIGRATE-02**: Data cutover runbook created and tested with team
- [ ] **MIGRATE-03**: Incident response procedures documented with rollback steps
- [ ] **MIGRATE-04**: User communication plan executed (migration timeline, password reset if needed)
- [ ] **MIGRATE-05**: Production traffic gradually migrated (10% → 50% → 100%)
- [ ] **MIGRATE-06**: PostgreSQL RDS decommissioned after 2 weeks of stable DynamoDB operation

## v1.0 Requirements (Validated)

These requirements were delivered in v1.0 and must continue working after migration:

- ✓ **AUTH-01**: User can create, log in to, and manage their account securely — v1.0 (migrating to Cognito in v1.1)
- ✓ **SESS-01**: User can create, edit, delete, and view their TTRPG sessions — v1.0
- ✓ **AUDIO-01**: System can record audio during a session — v1.0
- ✓ **AUDIO-02**: User can upload audio files for processing — v1.0
- ✓ **TRANS-01**: System automatically transcribes recorded/uploaded audio into text — v1.0
- ✓ **TRANS-02**: System can identify and differentiate speakers in the transcription — v1.0
- ✓ **REVIEW-01**: User can play back session audio synchronized with its transcript — v1.0
- ✓ **NOTES-01**: User can add basic manual notes to a session — v1.0
- ✓ **AI-01**: System automatically generates an AI-powered summary of the session — v1.0
- ✓ **SEARCH-01**: User can perform keyword searches within session transcripts — v1.0 (reimplementing in v1.1)
- ✓ **DASH-01**: System provides a dashboard with an overview of sessions within a campaign — v1.0
- ✓ **RECAP-01**: System can generate player-specific recaps of a session — v1.0
- ✓ **METRICS-01**: System can provide basic session metrics (e.g., session length) — v1.0

## v2.0+ Requirements (Future)

Deferred to future milestones after serverless migration is stable.

- **SEARCH-04**: OpenSearch integration for advanced semantic search (deferred for cost optimization)
- **SEARCH-05**: Semantic search using embeddings and vector similarity
- **NOTES-02**: GM notes integration with AI summarization (enhance summaries with context)
- **UI-01**: Timeline view for interactive session review
- **ENTITY-01**: Entity tracking across sessions (NPCs, locations, items)
- **METRICS-02**: Persist metrics in database (currently calculated on-demand)

## Out of Scope

Explicitly excluded from v1.1 to maintain focus on serverless migration.

| Feature | Reason |
|---------|--------|
| OpenSearch for advanced search | Adds $50-100/month cost; DynamoDB FilterExpression sufficient for MVP |
| Multi-AZ RDS deployment | Not applicable; migrating to DynamoDB |
| Read replicas | Not applicable; DynamoDB handles read scaling automatically |
| OAuth/SSO integration | Can add to Cognito in v1.2 after base auth is stable |
| GraphQL API | REST API with Lambda is simpler for v1.1; can add later |
| Real-time collaboration | Not a v1.1 priority; WebSockets can be added in v2.0 |
| Mobile app | Web-first; mobile later |
| Dice roll tracking | Explicitly excluded per PROJECT.md decisions |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be filled by roadmapper) | | |

**Coverage:**
- v1.1 requirements: 32 total
- Mapped to phases: (pending roadmap)
- Unmapped: (pending roadmap)

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after serverless migration scope definition*
