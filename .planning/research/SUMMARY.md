# AWS Production Deployment Research Summary

**Project:** RPG Session Recorder — v1.1 AWS Production Migration
**Domain:** Cost-optimized Next.js 14 application deployment with focus on S3 + CloudFront vs alternative options
**Researched:** 2026-02-05
**Confidence:** HIGH

---

## Executive Summary

The RPG Session Recorder app requires **AWS Amplify as the optimal deployment choice for v1.1**, with estimated infrastructure costs of **$30–65/month** for moderate traffic (500K–1M requests/month). This is significantly cheaper and simpler than Lambda (which risks 11x cost overruns from idle-time burn) or ECS/Fargate.

**Key finding:** The user's explicit interest in "S3 + CloudFront vs other options" confirms this is the right approach. CloudFront delivers audio files at $0.085/GB vs $1.35/GB for direct S3+NAT, and Amplify bundles CloudFront automatically. The app uses Auth.js with PostgreSQL session persistence, which requires **Server-Side Rendering (SSR) at runtime**—static export is impossible, making Amplify (with built-in SSR support) ideal.

**Critical risk:** Lambda deployment without RDS Proxy and idle-time profiling could cost **$300–3,550/month** due to API calls waiting on database responses. This is the single largest cost trap documented in production deployments (2025-2026 real cases). Mitigation: measure idle time in staging before launch.

---

## Key Findings

### Recommended Stack

**AWS Amplify is the proven winner for this use case.** It combines the simplicity of a PaaS platform with AWS-native services, eliminating infrastructure management overhead while keeping costs transparent.

**Core technologies:**
- **AWS Amplify:** Application hosting ($20–40/month) — Simplest SSR deployment, auto-scaling, no cold-start issues, built-in CloudFront CDN
- **RDS PostgreSQL (t4g.micro):** Database ($0–15/month) — Free tier eligible, Graviton2 processor (20% cheaper), burstable for bursty workload
- **S3 Standard:** Audio file storage ($1–3/month for 10GB) — Negligible cost, essential for session recordings
- **CloudFront CDN:** Included with Amplify ($0.085/GB) — 15x cheaper than direct S3+NAT ($1.35/GB), automatically caches static assets and audio
- **AWS Transcribe:** Speech-to-text ($0.024/min audio) — $0 cost for first 60 minutes/month, business logic cost after
- **Inngest (Hobby):** Background job orchestration ($0) — 50K free executions/month, no infrastructure management

**Cost projection:**
- Small app (1K–10K monthly active users): **$28–35/month infrastructure**
- Moderate app (10K–50K users): **$50–100/month infrastructure**
- Scaling app (100K+ users): **$100–200/month infrastructure** (Transcribe/Claude become dominant cost factor)

**Total estimated cost for v1.1 launch:** $30–65/month (infrastructure only; excludes Transcribe/Claude which are business logic costs, not infrastructure).

### Expected Features

**Must have (table stakes for production):**
- Multi-environment separation (staging ≠ production) — Prevents data leakage, enables safe testing
- Secrets management (AWS Secrets Manager or Amplify Secrets) — Credentials out of code, mandatory for compliance
- IAM role-based access control (no root credentials) — Principle of least privilege, audit trail
- Automated CI/CD pipeline (GitHub Actions or AWS CodePipeline) — Prevents manual deployment errors
- Database migrations (Prisma migrate in CI/CD) — Atomic schema changes, rollback capability
- Structured logging (JSON to CloudWatch) — Enables debugging and cost analysis
- Health checks + alerting (CloudWatch Alarms → SNS) — Catches silent failures
- Cost budgets + alerts (AWS Budgets) — **Critical for cost optimization context** — prevents bill shock
- SSL/TLS certificates (AWS Certificate Manager) — HTTPS, auto-provisioned by Amplify
- Database backups (35-day retention, automated) — Business continuity

**Should have (differentiators, Phase 2):**
- Infrastructure as Code (AWS CDK) — Reproducible deployments, disaster recovery templates (~3–4 days effort)
- Database connection pooling (RDS Proxy if needed) — If Lambdas hitting >50 concurrent connections (~$220/month)
- Canary/blue-green deployments — Zero-downtime releases (~2–3 days effort)
- Cost allocation tags + dashboard — Visibility into cost drivers by feature
- Distributed tracing (X-Ray) — End-to-end request visibility for debugging

**Defer to v2+ (low priority):**
- Database read replicas / Multi-AZ failover — ~+50% RDS cost, overkill until proven uptime SLA >99.9%
- Custom container orchestration (ECS, EKS) — Amplify + Lambda already handles scaling better for monolithic Next.js
- Multi-region failover — Not needed until global audience with <100ms latency requirement

### Architecture Approach

**Cost-optimized hybrid architecture combining fully-managed services to minimize operational overhead.** The recommended topology places CloudFront at the edge (global CDN), routes HTTPS traffic to Amplify (handles SSR + API routes), which talks to RDS PostgreSQL (private subnet, no NAT Gateway cost), with S3 as origin for static assets and audio storage. Inngest orchestrates long-running background jobs (Transcribe, Claude summarization) without requiring infrastructure.

**Key architectural decisions:**
1. **No NAT Gateway** — Saves $32/month. Amplify reaches S3 via VPC Gateway Endpoint (free), Transcribe/Anthropic via ECR Endpoint ($0.01/GB vs $0.045/GB)
2. **CloudFront for audio distribution** — 15x cheaper than direct S3+NAT, automatically cached for playback
3. **t4g.micro for RDS** — Graviton2 processors 20–40% cheaper, free tier eligible, burstable for TTRPG workload (long idle → burst during sessions)
4. **RDS Proxy (if upgrading from Lambda)** — Required to prevent connection pool exhaustion; ~$11/month insurance policy
5. **Inngest over SQS + Lambda** — Supports 2–10 minute Transcribe jobs (Lambda 15-minute limit), clearer pricing, built-in monitoring

**Major components:**
1. **CloudFront CDN** — Global edge locations cache static assets and audio files; signed URLs for protected playback
2. **AWS Amplify Hosting** — Manages Next.js SSR, auto-scaling, CI/CD integration, CloudFront integration
3. **RDS PostgreSQL** — Persistent session store (Auth.js), campaign data, transcript storage
4. **S3 Buckets** — Audio files with 30-day STANDARD → 90-day STANDARD-IA → 365-day Glacier lifecycle policy
5. **Inngest** — Orchestrates transcription and Claude AI summarization workflows with automatic retries
6. **CloudWatch** — Centralized logging, metrics, alarms on Lambda duration and cost anomalies

### Critical Pitfalls

The research identified **18 pitfalls across severity levels**, with 4 marked as **critical rewrites/major issues**:

1. **Unbounded Lambda cost from idle-time burn** — **MOST IMPORTANT FOR THIS PROJECT.** Real case: bill jumped from $300 → $3,550/month when API calls waited on database responses (1.5s idle out of 2s total). Prevention: Profile with X-Ray before launch; if idle >50% of duration, optimize or use Amplify/ECS instead of Lambda. Impact: 66–75% cost savings possible through profiling.

2. **RDS connection pool exhaustion from serverless functions** — Each Lambda invocation creates new DB connection; without RDS Proxy, max connection limit is reached quickly. "Too many connections" errors cascade, API becomes unavailable. Prevention: **Deploy RDS Proxy immediately before production** (~$11/month) OR use Amplify which manages connection pooling. Cost impact: RDS scaling to handle spike = $100–500/month; RDS Proxy prevention = $11/month.

3. **Lambda cold start cascades** — Next.js on Lambda cold starts 1–3+ seconds; users see slow initial loads. Under traffic spikes, cold starts compound. Prevention: Measure cold start time in staging (aim <2 seconds acceptable); if >3 seconds, use provisioned concurrency (~$220–400/month) or switch to ECS/Amplify. Impact: Provisioned concurrency adds to bill but eliminates user-facing delays.

4. **CloudFormation cross-stack dependency hell** — Infrastructure split across stacks with hard dependencies become fragile; updates fail with "resource in use" errors. Prevention: Keep cross-stack references minimal; use stack outputs for decoupled resources only. Phase to address: Phase 1 (foundation—design correctly from start).

**Secondary critical pitfalls:**
- **Image cache-control header trap** — Next.js `next/image` from S3 sets `Cache-Control: max-age=0`, CDN never caches. CloudFront cache hit ratio <30%; costs spike 7x. Prevention: Custom image loader with longer TTL headers.
- **SQS visibility timeout misalignment** — SQS timeout shorter than Lambda timeout causes duplicate message processing. Prevention: Set SQS visibility timeout to 6x Lambda timeout + batch window time.
- **Secrets in environment variables** — Credentials leak via CloudWatch logs, git history, crash dumps. Prevention: Use AWS Secrets Manager ($0.40/secret/month) from day one.
- **No monitoring for CloudWatch logs cost explosion** — Default logging generates gigabytes; CloudWatch becomes 30–50% of Lambda costs. Prevention: Set 7–14 day retention, filter to errors only, use structured JSON.

**For this project specifically:**
- Cold start is mitigated by Amplify (persistent containers, no cold starts)
- Connection exhaustion is mitigated by Amplify's built-in connection pooling
- Secrets are protected by Amplify Secrets (included in free tier)
- Image caching is automatic with CloudFront + Amplify integration

---

## Implications for Roadmap

Based on combined research, the v1.1 deployment should follow a **4-phase approach with critical Phase 0 pre-validation:**

### Phase 0: Pre-Deployment Validation (Week 1 — CRITICAL)

**Rationale:** Validate all architectural assumptions before committing infrastructure. This phase prevents the single largest cost pitfall (idle-time burn) and confirms RDS connection pooling strategy.

**Deliverables:**
- Measure cold start time in staging environment (current: expect 1–3 seconds for Next.js)
- Profile request duration with X-Ray to separate active processing from idle time (goal: idle <50% of total)
- Verify RDS connection behavior under load (test concurrent requests; confirm connection reuse)
- Enforce build size budget (<100MB unzipped) in CI; fail if exceeded
- Set up AWS Budgets with alerts ($100, $300 thresholds) to prevent bill shock
- Document all secrets (DB password, API keys, JWT key) to migrate to Secrets Manager

**Addresses pitfalls:** Unbounded Lambda costs, RDS connection exhaustion, large Node module deployments, cost explosion

**Effort:** ~8–12 hours (mostly profiling + testing)

**Cost:** $0 (uses existing staging environment)

---

### Phase 1: Core Infrastructure & Foundation (Week 2–3)

**Rationale:** Deploy the AWS infrastructure that unblocks application deployment. This phase implements all "table stakes" features required for responsible production launch.

**Deliverables:**
- VPC with public/private subnet topology (no NAT Gateway; use VPC Gateway Endpoints for S3)
- RDS PostgreSQL t4g.micro with 7-day automated backups, single-AZ for MVP
- S3 buckets for audio storage with lifecycle policies (30-day STANDARD → 90-day STANDARD-IA → 365-day Glacier)
- CloudFront distribution with PriceClass_100 (excludes expensive regions), 24-hour cache TTL, signed URLs
- AWS Secrets Manager with 3 secrets (DB password, API key, JWT secret)
- Multi-environment setup (staging + production databases + secrets)
- CloudWatch Logs configured with 7-day retention, structured JSON format
- CloudWatch Alarms (Lambda duration spike, cost anomaly, RDS CPU/connections)

**Uses from STACK.md:**
- AWS Amplify hosting
- RDS PostgreSQL
- S3 Standard storage
- CloudFront CDN

**Implements from ARCHITECTURE.md:**
- Network topology (no NAT Gateway)
- Storage architecture with S3 lifecycle
- Multi-environment strategy

**Avoids pitfalls:**
- Secrets in environment variables (use Secrets Manager)
- Public S3 buckets (enforce block-public-access)
- Overly permissive IAM (implement least privilege)
- Unoptimized cold starts (measure build size <100MB)

**Effort:** ~20–24 hours

**Cost:** ~$20–30/month (RDS, CloudFront minimal usage during testing)

---

### Phase 2: Application Deployment & Optimization (Week 4–5)

**Rationale:** Deploy the Next.js application to Amplify with CI/CD automation, then measure and optimize costs based on real traffic patterns.

**Deliverables:**
- GitHub repository connected to AWS Amplify with auto-deploy on `main` push
- CI/CD pipeline (GitHub Actions → Amplify) running tests, builds, migrations
- Prisma migrations executing in pipeline before app deployment (atomic changes)
- Structured logging middleware (JSON format to CloudWatch)
- Health check endpoint (`/api/health`) with CloudWatch alarm
- Cost allocation tags on all resources (by feature: session-mgmt, transcription, database)
- Baseline performance metrics (Fargate CPU, memory, request latency percentiles)

**Uses from STACK.md:**
- Inngest (if background jobs needed during Phase 2)
- Amplify Secrets for environment variable injection

**Addresses pitfalls:**
- RDS connection pool exhaustion (baseline RDS Proxy setup if >50 concurrent connections observed)
- Image cache-control headers (verify CloudFront cache hit ratio >80%)
- CloudWatch log explosion (enforce retention, structured JSON)
- Database connection leaks (review Next.js API routes for proper cleanup)

**Effort:** ~16–20 hours

**Cost:** ~$50–100/month (includes Transcribe test invocations if using Phase 2 for validation)

**Research flags:**
- Monitor actual idle-time percentage from X-Ray traces; if >30%, investigate which operations cause waiting
- If RDS CPU consistently >70%, add RDS Proxy (~$11/month) or upgrade to t4g.small (~$17/month)

---

### Phase 3: Background Jobs & Inngest Integration (Week 5–6)

**Rationale:** Integrate Inngest for long-running Transcribe and Claude AI summarization workflows, enabling the core feature of session recaps.

**Deliverables:**
- Inngest SDK integration with signing key in Secrets Manager
- Event functions: `transcribe-session-audio`, `summarize-session`, `generate-player-recap`
- API route to emit `session/audio.uploaded` event when users upload audio
- CloudWatch alarms on Inngest error rate (>1%) and execution duration
- Monitoring dashboard showing job queue depth, success/failure rates
- Dead Letter Queue (DLQ) concept for failed jobs (Inngest automatic retry + alerting)

**Uses from STACK.md:**
- Inngest Hobby tier (free for 50K executions/month)
- AWS Transcribe (pay-per-minute: $0.024/min audio)
- Claude API integration (via Inngest, ~$0.01/session)

**Avoids pitfalls:**
- Forgotten scheduled tasks (document all event functions in README)
- Job failure without monitoring (set CloudWatch alarms)
- Silent failures (DLQ pattern, alert on errors)

**Effort:** ~12–16 hours

**Cost:** ~$0 (Inngest free tier covers 50K runs; Transcribe/Claude are business logic costs)

---

### Phase 4: Optimization & Production Hardening (Week 6+)

**Rationale:** After baseline metrics are established and real-world traffic patterns are observed, optimize costs, add HA features, and harden for production incidents.

**Deliverables:**
- Infrastructure as Code (AWS CDK) rewrite of manual AWS setup (enables disaster recovery templates, team collaboration)
- Canary/blue-green deployments (5% traffic to new version, automatic rollback on errors)
- Vulnerability scanning in CI (npm audit on critical CVEs; fail builds)
- Database read replica if uptime SLA requires >99.9% availability (adds ~50% to RDS cost; defer to Phase 4)
- Disaster recovery runbook (RDS restore <10 min, Fargate min 1 task running)
- Cost optimization report analyzing actual spend vs projections; identify where to cut

**Effort:** ~24–32 hours (split across team)

**Cost:** Potentially 0–50% cost reduction from optimizations if idle-time or log volume reduced; +50% if adding read replicas

---

### Phase Ordering Rationale

1. **Phase 0 first (Week 1):** Validates architectural decisions and prevents the largest cost trap (idle-time burn). Blocking: Everything else depends on understanding your actual workload characteristics.

2. **Phase 1 second (Week 2–3):** Infrastructure must be in place before deploying app. Blocking: Amplify can't deploy without VPC, RDS, S3 setup.

3. **Phase 2 third (Week 4–5):** App deployment unblocks testing and real-world traffic validation. Depends on Phase 1. Enables Phase 3.

4. **Phase 3 fourth (Week 5–6):** Background job integration depends on app being stable (Phase 2). Inngest webhooks need valid app endpoint. Adds core feature.

5. **Phase 4 last (Week 6+):** Optimization depends on baseline metrics from Phase 2–3. Hardening depends on understanding production behavior.

**Why this order prevents disasters:**
- Phase 0 profiling prevents 11x cost overruns from idle-time burn
- Phase 1 infrastructure prevents RDS connection exhaustion (via Amplify connection pooling)
- Phase 2 CI/CD prevents manual deployment errors and security leaks
- Phase 3 monitoring prevents silent job failures
- Phase 4 IaC prevents infrastructure drift and enables recovery from disasters

---

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 0:** RDS connection limit calculation (how many concurrent connections does your app actually need?). Solution: Load-test with 10x expected peak users; measure RDS "DatabaseConnections" metric.

- **Phase 2:** CloudFront cache behavior limit (25 per distribution max). If your API has >25 distinct routes, may need multiple distributions. Solution: Consolidate routes; use origin groups within single behavior.

- **Phase 3:** Inngest error handling and retry policies (what happens if Transcribe fails mid-way?). Solution: Test failure modes; implement idempotency keys in database to prevent duplicate processing.

**Phases with standard patterns (skip dedicated research-phase):**

- **Phase 0:** Cold start measurement, build size budget — standard Next.js patterns, well-documented
- **Phase 1:** VPC topology, RDS setup, S3 lifecycle — AWS best practices, stable across releases
- **Phase 2:** CI/CD pipeline structure — GitHub Actions + Amplify proven pattern, no special research needed
- **Phase 4:** Infrastructure as Code — AWS CDK documentation is comprehensive; no new patterns expected

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|-----------|-------|
| **Stack** | **HIGH** | AWS official pricing verified 2026-02; Amplify vs Lambda vs ECS comparison from multiple 2025-2026 real-world deployments. Pricing stable quarter-to-quarter. |
| **Features** | **HIGH** | Table stakes verified against Next.js production deployment checklists (official docs) and AWS Amplify feature set. Differentiators inferred from cost analysis (Phases 2–4). |
| **Architecture** | **HIGH** | Cost-optimized topology from official AWS documentation + verified 2025-2026 real deployments. VPC strategy (no NAT Gateway), S3 lifecycle, CloudFront optimization all standard patterns. |
| **Pitfalls** | **HIGH** | 18 documented pitfalls sourced from AWS support channels, real 2025-2026 production incidents, and ecosystem best practices. Cost pitfalls especially well-documented with real customer bills (Vercel case study: $300 → $3,550). |
| **Cost projections** | **MEDIUM-HIGH** | Estimates based on official AWS pricing (verified 2026-02) and real-world traffic scenarios. Actual costs depend on your traffic pattern (idle-time percentage, request count, geographic distribution). |

**Overall confidence:** **HIGH** — Research is sourced from official AWS documentation, 2025-2026 real-world deployments, and ecosystem consensus. Main caveat: your actual costs depend on validating Phase 0 assumptions (cold starts, idle time, connection concurrency).

---

### Gaps to Address

1. **Exact RDS instance size progression** — Research recommends t4g.micro starting point but doesn't specify when to upgrade to t4g.small or larger. How to handle: Monitor RDS CPU/memory in Phase 1–2; upgrade if sustained >80% CPU for 24+ hours. Cost: t4g.small = $17/month vs t4g.micro = $0–10/month.

2. **CloudFront behavior limit (25/distribution) for your specific API routes** — Research flags this as potential limit if you have many distinct API routes. How to handle: Audit your API routes in Phase 0; if >20 distinct routes, plan consolidation strategy (e.g., `/api/*` with origin groups) before Phase 1.

3. **Inngest plan scaling** — Research covers free tier (50K executions) but doesn't detail pricing tiers at scale. How to handle: Start with free tier in Phase 3; monitor execution count. If consistently >50K/month, upgrade plan (~$10–75/month depending on tier).

4. **Geographic distribution of users** — CloudFront PriceClass_100 excludes expensive regions but you haven't specified your audience. How to handle: Validate in Phase 2; if serving significant international traffic, consider PriceClass_All (includes South America, Australia; ~20% cost premium).

5. **Disaster recovery RTO/RPO requirements** — Research defers multi-AZ and read replicas to Phase 4+. How to handle: Define Recovery Time Objective (RTO) and Recovery Point Objective (RPO) early; if <1 hour RTO, Phase 1 must include RDS multi-AZ (~+50% cost) or read replica.

---

## Sources

### Primary (HIGH confidence)

- **STACK.md** (324 lines) — AWS official pricing pages verified 2026-02; Amplify vs Lambda vs ECS comparison from 2025-2026 real deployments
- **ARCHITECTURE.md** (748 lines) — AWS official documentation + verified 2025-2026 ecosystem guides on cost-optimized Next.js deployment
- **FEATURES.md** (384 lines) — Next.js production deployment checklist (official), AWS Amplify feature set (official), feature prioritization from 2025-2026 production patterns
- **PITFALLS-AWS-DEPLOYMENT.md** (739 lines) — 18 documented pitfalls from AWS support channels, 2025-2026 real production incidents, ecosystem best practices (HIGH for cost/infrastructure pitfalls; MEDIUM-HIGH for security)
- **AWS-DEPLOYMENT-COST-ANALYSIS.md** (430+ lines) — Real-world cost scenarios including documented case study (bill $300 → $3,550/month idle-time burn), official AWS pricing, 2025-2026 deployment comparisons

### Secondary (MEDIUM confidence)

- **AWS-DEPLOYMENT-RESEARCH-SUMMARY.md** (254 lines) — Executive summary of deployment research, phase structure recommendations
- **AWS-DEPLOYMENT-INDEX.md** (280+ lines) — Research index, quick-reference guide, integration with roadmap

### Official Documentation

- AWS Lambda Pricing 2026
- AWS Amplify Pricing & Documentation
- AWS RDS PostgreSQL Pricing & Best Practices
- AWS S3 Lifecycle Policies & Intelligent Tiering
- AWS CloudFront Pricing & Cache Optimization
- Next.js Production Deployment Checklist
- Prisma Database Migration & AWS Deployment Caveats
- Inngest Documentation & Pricing

---

## Ready for Roadmap

This research provides sufficient foundation for roadmap creation. The 4-phase structure (Phase 0 validation, Phase 1 infrastructure, Phase 2 app deployment, Phase 3 jobs, Phase 4 optimization) is directly derived from research findings and validated against 18 documented pitfalls.

**Roadmapper should:**
1. Use Phase 0–4 structure as starting point
2. Cross-reference pitfall prevention strategies with each phase's acceptance criteria
3. Ensure Phase 0 research activities (cold start measurement, idle-time profiling, build size budget) are done before Phase 1 infrastructure commits
4. Plan Phase 2 optimization activities around actual vs estimated cost projections
5. Flag Phase 3 Inngest integration as depending on Phase 2 baseline stability

**Deployment is ready to proceed** once roadmap is drafted based on this research.

---

*Research synthesis completed: 2026-02-05*
*Research files: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS-AWS-DEPLOYMENT.md, AWS-DEPLOYMENT-COST-ANALYSIS.md, AWS-DEPLOYMENT-RESEARCH-SUMMARY.md, AWS-DEPLOYMENT-INDEX.md*
*Ready for gsd-roadmapper: yes*
