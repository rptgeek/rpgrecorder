# Infrastructure & DevOps Features for AWS Production Deployment

**Domain:** Next.js production infrastructure and deployment automation
**Researched:** 2026-02-05
**Confidence:** HIGH (verified with official AWS, Prisma, and Next.js documentation)
**Context:** Moving from local development to AWS production with cost-optimization priority

---

## Feature Landscape

This research categorizes infrastructure features by necessity tier, cost implications, and complexity. Context: Current stack is Next.js 14 + Prisma + PostgreSQL + existing AWS services (S3, Transcribe, Inngest).

### Table Stakes (Must Have for Production)

Features without which the application cannot responsibly run in production. Missing any = security breach or operational failure risk.

| Feature | Why Required | Complexity | Cost Impact | Notes |
|---------|--------------|------------|-------------|-------|
| **Multi-environment separation** (dev, staging, prod) | Prevents configuration leakage, enables safe testing, isolates production data | MEDIUM | LOW | Distinct VPCs/subnets, separate database instances, environment-scoped credentials. RDS costs roughly $50-100/month baseline per environment. |
| **Database backup & recovery** | Business continuity, data protection, disaster recovery compliance | LOW | MEDIUM | RDS automated backups (35-day retention) included in RDS cost. Manual snapshots to S3 are negligible. |
| **Secrets management** (API keys, DB passwords, JWT keys) | Prevents credential leakage, satisfies compliance, eliminates `.env` in code | MEDIUM | LOW | AWS Secrets Manager: ~$0.40/secret/month. Alternately use Amplify Secrets (free tier included). Prisma requires SSL/TLS config for RDS. |
| **IAM role-based access control** | Principle of least privilege enforcement, prevents privilege escalation, audit trail | MEDIUM | NONE | Zero-cost. Setup effort is medium. Use temporary credentials (STS) not long-lived keys. |
| **Automated CI/CD pipeline** | Prevents manual deployment errors, enables rapid rollback, auditable release process | MEDIUM-HIGH | LOW-MEDIUM | GitHub Actions free for public repos. AWS CodePipeline ~$1/active pipeline/month. CodeBuild: pay-per-build (~$0.005/minute). |
| **Environment variable management** (distinct per environment) | Prevents hardcoding, enables safe rollout changes, supports multi-tenancy | LOW | NONE | Use Amplify, CodePipeline, or Lambda environment variables (all free/included). Next.js NEXT_PUBLIC_ prefix distinction critical. |
| **Structured logging** (JSON format to CloudWatch) | Essential for debugging production issues, enables cost analysis, supports alerting | MEDIUM | LOW | CloudWatch Logs: ~$0.50/GB ingested. Structured JSON logs dramatically reduce disk space vs. text logs. |
| **Health checks & alerting** (auto-restart, notification on failure) | Catches silent failures, enables on-call response, prevents cascading outages | LOW | LOW | CloudWatch Alarms free up to 10; SNS ~$0.50/million notifications. Auto-restart via ASG or container orchestration. |
| **Database migration strategy** (Prisma migrate in CI/CD) | Safe schema rollout, rollback capability, prevents downtime from manual migrations | MEDIUM | NONE | Prisma migrate deploy in CI/CD pipeline (automated). Requires careful ordering: migrate *before* app deploy. |
| **SSL/TLS certificates** (HTTPS) | Encrypts data in transit, required by modern browsers, may be compliance requirement | LOW | NONE | AWS Certificate Manager issues free certificates. Amplify/ALB auto-provision. |
| **Cost budgets & alerts** | Prevents runaway bills, enables proactive optimization, catches misconfigurations | LOW | NONE | AWS Budgets: free. SNS alerting cheap. Without this, $300/month can become $3000/month silently. |

**Dependency chain:** Secrets Mgmt → CI/CD → Multi-env → Logging → Alerting. Start with Secrets, enable CI/CD, branch from there.

---

### Differentiators (Optional, High-Value Features)

Features that improve operations/cost/developer experience but aren't technically blocking. Reasonable MVP omits these; add post-launch.

| Feature | Value Proposition | Complexity | Cost Impact | When to Add | Notes |
|---------|-------------------|------------|-------------|-------------|-------|
| **Infrastructure as Code (IaC)** (CDK, Terraform, or CloudFormation) | Reproducible deployments, version-controlled infrastructure, team collaboration, disaster recovery | MEDIUM-HIGH | NONE | Phase 2 (after v1.1 launch) | AWS CDK (TypeScript) is fastest learning curve for Next.js teams. Terraform more portable cross-cloud. CloudFormation is native but verbose. Recommendation: **AWS CDK** for cost-optimized teams (bridges code + IaC). |
| **Database connection pooling** (PgBouncer, RDS Proxy) | Reduces database connection overhead, enables Lambdas to scale without connection exhaustion | MEDIUM | MEDIUM | If Lambdas hitting >50 concurrent connections or seeing connection timeouts | RDS Proxy: ~$0.30/hour (roughly $220/month). PgBouncer (self-managed): free but requires ops. For Prisma on Lambda, RDS Proxy is safer. |
| **Container registry & image scanning** (ECR) | Enables ECS/EKS deployments, security scanning, image versioning | LOW | LOW | If deploying to ECS/Fargate instead of Lambda/Amplify | ECR: ~$0.10/million API calls. Scanning free. Useful for multi-service apps; overkill for monolithic Next.js. |
| **CloudFront CDN for static assets** (or Amplify automatic) | Reduces origin load, improves global latency, saves egress bandwidth | LOW | MEDIUM | Immediately if serving high-traffic international users | CloudFront: $0.085/GB (varies by region). Amplify includes CloudFront automatically. Manual CDN helps if static assets are large. |
| **Distributed tracing** (X-Ray) | End-to-end request visibility, debugging cross-service latency issues, performance analysis | MEDIUM | LOW-MEDIUM | Phase 2, after baseline monitoring is working | X-Ray: ~$0.50/million trace records. Most teams start with CloudWatch Logs + Metrics. |
| **Automated database backups to S3** (cross-region for DR) | Disaster recovery outside AWS region, long-term archival, compliance | LOW | LOW | Post-launch for v1.1+ if disaster recovery is requirement | RDS snapshots to S3: free snapshot, then S3 storage (~$0.023/GB/month). Cross-region replication adds cost. |
| **Canary/blue-green deployments** | Zero-downtime releases, instant rollback, gradual traffic shifting | MEDIUM-HIGH | NONE | Phase 2, after v1.0 stability; enables confidence in frequent deploys | CodeDeploy or Amplify traffic shifting. Setup overhead medium but enables safe rapid iterations. |
| **Cost allocation tags & dashboard** | Visibility into which features drive cost, enables resource optimization | LOW | NONE | Phase 2 after first month of production data | Mandatory for growth; helps distinguish session mgmt costs vs. transcription vs. database. |
| **Vulnerability scanning & secrets detection** | Catches hardcoded credentials, vulnerable dependencies in build pipeline | LOW | NONE-LOW | Before Phase 1 launch if possible; cheap insurance | GitHub Dependabot free. AWS CodeArtifact scanning ~$0.05/scan. truffleHog for git history. |
| **Database read replicas** (RDS multi-AZ secondary) | High availability failover, read traffic distribution, reduced single-point-of-failure risk | MEDIUM | MEDIUM-HIGH | Post-launch only if uptime requirement is strict (>99.9%) | Multi-AZ adds ~50% to RDS cost. Enables automatic failover in 1-2 minutes. Overkill for MVP. |

**Recommendation:** Launch with Table Stakes only. Post-v1.0, add: IaC (CDK), Cost Tags, Canary Deploys. RDS Proxy only if Lambda cold starts become problematic.

---

### Anti-Features (Avoid These, Trap Common to AWS/Next.js Deployments)

Features that seem necessary but create more problems than they solve, or indicate architectural misalignment.

| Anti-Feature | Why Requested | Why Problematic | Better Alternative |
|--------------|---------------|-----------------|-------------------|
| **Storing secrets in environment variables** (without a secrets manager) | Faster to set up initially, visible in deployment logs/error messages | Credentials leak via CloudWatch logs, git history, process listings, crash dumps; no rotation; no audit trail | Use AWS Secrets Manager ($0.40/secret/month) or Amplify Secrets. Rotate programmatically. |
| **Manual database migrations** (developer SSH into prod RDS) | Faster than setting up CI/CD, simpler for one-off schema changes | Prone to mistakes, no rollback, no audit trail, breaks if developer unavailable, locks database tables during migration | Automate Prisma migrate in CI/CD pipeline ALWAYS. Build->Test->Migrate->Deploy as single atomic operation. |
| **Monolithic CloudFormation templates** (all resources in one 10k+ line YAML) | Simpler to "manage" when small, everything in one place | Becomes unmaintainable, slow to deploy, hard to update one component, team collaboration nightmare | Use AWS CDK (breaks into logical modules/constructs) or split CloudFormation into stacks. Terraform also scales better. |
| **Logging everything to stdout** without structured format | Simple initially, straightforward debugging in dev | Becomes impossible to parse at scale, hard to filter errors, log volume explodes cost, useless for alerting | Use JSON structured logging. Middleware in Next.js app to format logs → stdout → CloudWatch Logs. Parse JSON server-side. |
| **Using root AWS credentials** for applications | Faster to implement, doesn't require IAM setup | Exposes full account privileges, unrecoverable if leaked, fails compliance audits, enables account takeover | Use IAM service roles attached to Lambda/ECS/Amplify. Temporary credentials via STS. Root account → only account creation, then lock away. |
| **Storing database connection string in code/config files** | "It's only for staging" (famous last words) | Connection string leaks password, enables privilege escalation, breaks when DB password rotates, visible in logs | Inject DATABASE_URL via environment variable from Secrets Manager. Prisma reads from env at runtime. |
| **Real-time database monitoring** (polling CloudWatch every 30 seconds) | Seems like "being proactive" | Unnecessary cost, alert fatigue, doesn't prevent failures, generates excess log noise | CloudWatch Alarms with sensible thresholds (not every 30s). Sampling-based monitoring. Alerts only on exceptions. |
| **Lambda concurrent execution limits set to 1** (trying to force sequentiality) | Sounds like "safety" | Causes your app to fail under any traffic, every request queues, timeouts, negative user experience | Set limits realistic to your expected load. Use SQS if you need request ordering. Let Lambda scale naturally, set budget alerts instead. |
| **Keeping separate GitHub repositories for different environments** | Seemed like "isolation" | Merging code between envs is painful, easy to have drift, deployment process fragmented, hard to track who deployed what | Single repo with branch-per-environment (dev→staging→main). Same code, different config. Simplifies audit trail. |
| **Building custom deployment orchestration scripts** | Seemed faster than learning CDK/Terraform | Scripts drift from actual infrastructure, fail in corner cases, no state tracking, team can't maintain them, become legacy code | Use managed CI/CD (GitHub Actions → CodePipeline → CodeBuild). Let AWS handle orchestration. Scripts become maintenance burden. |

**Core principle:** If a "shortcut" adds operational burden later, it's not a shortcut. Upfront cost of automation pays off immediately in production.

---

## Feature Dependencies

```
[Cost Budgets & Alerts]
    └──requires──> [CloudWatch Metrics]
                       └──requires──> [Structured Logging]
                           └──requires──> [Secrets Manager]
                               └──requires──> [Multi-env separation]

[CI/CD Pipeline]
    ├──requires──> [Secrets Management]
    ├──requires──> [Database Migrations]
    └──enhances──> [Health Checks & Alerting]

[IaC (CDK/Terraform)]
    ├──enhances──> [CI/CD Pipeline] (codifies infrastructure)
    └──enables──> [Multi-environment separation] (reproducible per-env setup)

[Database Connection Pooling (RDS Proxy)]
    └──requires──> [Multi-environment separation] (separate proxy per env)

[Distributed Tracing (X-Ray)]
    └──enhances──> [Logging] (shows where requests spend time)

[Database Replicas/Multi-AZ]
    └──requires──> [Database Backups] (prerequisites for HA)
```

### Dependency Notes

- **Secrets Management is the foundation:** All other automation depends on secrets being external + rotatable. Without this, you can't safely implement CI/CD.
- **Multi-env separation enables testing:** You can't responsibly use CI/CD without staging. Staging requires separate resources (DB, secrets, IAM roles).
- **Database migrations + CI/CD are inseparable:** Prisma migrate MUST run in pipeline before app deploys. Without this, you have downtime or rollback issues.
- **Structured Logging is prerequisite for Alerting:** Raw text logs can't be parsed for error patterns. JSON logs → CloudWatch Insights → Alarms.
- **IaC enhances but doesn't block:** You can launch without IaC (manual AWS console), but IaC saves time if you need disaster recovery or team scaling.
- **CloudFront/CDN is orthogonal:** Doesn't depend on other features; use if serving international users or large static assets.

---

## MVP Definition

### Launch With (v1.0 → Production)

Minimum viable production deployment. Everything below is **blocking** for responsible launch.

- [ ] **Multi-environment separation** — Staging ≠ Production. Isolates risk, enables safe testing. (MEDIUM effort, ~1 day)
- [ ] **Secrets Management** (AWS Secrets Manager or Amplify Secrets) — Credentials out of code. ($0.40/secret/mo). (LOW effort, ~2 hours)
- [ ] **IAM roles** (not root credentials) — Apps assume roles with least privilege. (MEDIUM effort, ~4 hours)
- [ ] **CI/CD pipeline** (GitHub Actions or AWS CodePipeline) — Automated deploy on git push. Prevents manual mistakes. (MEDIUM effort, ~1-2 days)
- [ ] **Database migrations** (Prisma migrate in CI/CD) — Schema changes atomic with app deploy. (LOW effort, ~4 hours; high value)
- [ ] **Structured logging** (JSON to CloudWatch) — Enables debugging + cost tracking. (LOW effort, ~2 hours)
- [ ] **Health checks + basic alerting** (CloudWatch Alarms → SNS email) — Get paged when app fails. (LOW effort, ~2 hours)
- [ ] **Cost budgets + alerts** (AWS Budgets) — Catch runaway costs immediately. **Critical for cost optimization.** (LOW effort, ~30 min)
- [ ] **SSL/TLS** (AWS Certificate Manager) — HTTPS auto-provisioned. (NONE, auto-managed by Amplify/ALB)

**Total effort:** ~30 hours setup. **Total cost:** ~$200-300/month baseline (RDS + storage + minimal Lambda).

### Add After Validation (v1.1 → Maturing)

Once core is stable and you have production data, add these features to improve operations.

- [ ] **Infrastructure as Code** (AWS CDK) — Codify infrastructure, enable disaster recovery templates. (MEDIUM-HIGH effort, ~3-4 days; high ROI)
  - *Trigger:* When you've manually created resources and want to reproduce them quickly, or team is scaling.
- [ ] **Database connection pooling** (RDS Proxy) — If Lambdas hit connection limits or seeing timeout errors. (~$220/month)
  - *Trigger:* Error logs show "too many connections" or Lambda initialization slowdown.
- [ ] **Canary/blue-green deployments** — Zero-downtime releases, instant rollback. (MEDIUM effort, ~2-3 days)
  - *Trigger:* Once you're deploying >1x/week; want confidence in rapid iteration.
- [ ] **Cost allocation tags + dashboard** — Visibility into cost drivers. (LOW effort, ~1 day; essential for scaling)
  - *Trigger:* After first month, use to understand where money goes (session mgmt? transcription? database?).
- [ ] **Distributed tracing** (X-Ray) — End-to-end request visibility, debug slow features. (MEDIUM effort, ~1-2 days)
  - *Trigger:* When baseline monitoring (CloudWatch Logs/Metrics) isn't enough to diagnose latency.
- [ ] **Vulnerability scanning** (GitHub Dependabot, CodeArtifact) — Automated dependency security checks. (LOW effort, ~2 hours; should be v1.0 if possible)
  - *Trigger:* Before any regulatory audit; cheap insurance.

### Future Consideration (v2+, Post-PMF)

Defer until you've proven product-market fit and have clear usage patterns.

- [ ] **Database read replicas / Multi-AZ failover** — HA setup, automatic failover. (~+50% RDS cost)
  - *Why defer:* Expensive, overkill until uptime SLA > 99.9%. Single-AZ with backups sufficient for MVP.
- [ ] **Custom container orchestration** (ECS, EKS) — Instead of Amplify/Lambda. (HIGH effort, significant ops burden)
  - *Why defer:* Amplify + Lambda faster to market. Migrate only if Amplify becomes bottleneck (rare).
- [ ] **Database read scaling** (sharding, replicas for analytics) — Splits write workload. (HIGH complexity)
  - *Why defer:* RDS scales well to 10M+ rows. Shard only when analysis shows write bottleneck.
- [ ] **Multi-region failover** — Production in 2+ regions. (HIGH complexity, HIGH cost)
  - *Why defer:* Single-region sufficient unless serving global audience with <100ms latency requirement.

---

## Feature Prioritization Matrix

| Feature | User Value | Impl. Cost | Risk if Missing | Priority | Why |
|---------|------------|-----------|-----------------|----------|-----|
| Multi-environment separation | HIGH | MEDIUM | CRITICAL (data leak) | **P1** | Prevent production incidents. |
| Secrets management | HIGH | LOW | CRITICAL (credential leak) | **P1** | Security + compliance blocker. |
| CI/CD pipeline | HIGH | MEDIUM | HIGH (manual errors) | **P1** | Operability + safety. |
| Database backups | HIGH | LOW | HIGH (data loss) | **P1** | Business continuity. |
| IAM roles | HIGH | MEDIUM | CRITICAL (privilege escalation) | **P1** | Security + audit trail. |
| Structured logging | MEDIUM | LOW | MEDIUM (hard to debug) | **P1** | Cost + observability. |
| Health checks | MEDIUM | LOW | MEDIUM (silent failures) | **P1** | Operational resilience. |
| Cost budgets | MEDIUM | NONE | MEDIUM (bill shock) | **P1** | Cost control critical per context. |
| Database migrations (Prisma) | HIGH | LOW | HIGH (schema drift) | **P1** | Data integrity. |
| IaC (CDK) | MEDIUM | HIGH | MEDIUM (hard to reproduce) | **P2** | Nice post-launch. |
| Connection pooling (RDS Proxy) | LOW | MEDIUM | LOW (scales eventually) | **P2** | Needed if hitting connection limits. |
| Canary deployments | MEDIUM | MEDIUM | LOW (slower rollback) | **P2** | Confidence, not necessity. |
| Distributed tracing | LOW | MEDIUM | LOW (harder to debug) | **P3** | Post-validation optimization. |
| Database read replicas | LOW | HIGH | LOW (high availability luxury) | **P3** | Defer until uptime SLA strict. |

**Priority key:**
- **P1:** Must have for v1.0 launch. Blocking.
- **P2:** Should add by v1.1. Improves operations.
- **P3:** Post-PMF. Optimization.

---

## Cost Implications by Feature (Cost-Optimized Lens)

Since your context prioritizes **cost optimization**, here's the monthly cost impact of each feature at typical scale (1000 users, ~10k API calls/day):

### Baseline Infrastructure (Required)

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| RDS PostgreSQL (db.t3.micro, 2 instances: prod + staging) | ~$100 | db.t3.micro ~$50/mo × 2 env. Backups included. If single-instance, ~$50. |
| S3 (backups, logs, static assets) | ~$20 | Logs ~100GB/month, backups ~50GB. Standard tier $0.023/GB. |
| AWS Secrets Manager (3 secrets) | ~$1.20 | $0.40 per secret per month. Include DB password, API key, JWT secret. |
| CloudWatch Logs | ~$15 | Structured JSON logs ~30GB/month ingestion ($0.50/GB). Query/analysis minimal. |
| CloudWatch Metrics + Alarms | ~$5 | Custom metrics ~100/day (free tier 3000), alarms free up to 10. |
| SNS (alert notifications) | <$1 | Free tier covers millions of notifications; alert emails essentially free. |
| **Subtotal (Baseline)** | **~$142/month** | **Core production setup.** |

### Table Stakes to Add (Still Required)

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| CodePipeline (1 pipeline) | ~$1 | Minimum charge applies; essentially free at this scale. |
| CodeBuild (2-3 builds/day, ~10min each) | ~$5 | $0.005/min × 30 mins × 90 days. Cheap. |
| Lambda (existing Inngest, transcription) | ~$50-100 | Depends on session volume. Assume baseline from current stack. |
| ECR (if container-based) | <$1 | Free tier 50GB; overkill for Next.js unless multi-service. |
| **Subtotal (CI/CD + Automation)** | **~$56-106/month** | **Enable safety without cost explosion.** |

### Differentiators (Optional, High-Value)

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| RDS Proxy (per-environment connection pooling) | ~$220 | $0.30/hour on-demand. **Only if hitting connection exhaustion.** |
| CloudFront (global CDN for static assets) | ~$50-200 | $0.085/GB egress (varies by region). Skip if serving mostly US. |
| AWS CDK (Infrastructure as Code) | $0 | Free; reduces manual ops burden. Saves ~5 hrs/week at scale. |
| X-Ray (distributed tracing) | ~$10-30 | $0.50/million traces. Low volume = negligible. |
| **Subtotal (Optional)** | **$0-500/month** | **Depends on architecture choices.** |

### Estimated Cost at v1.0 Launch

```
Baseline Infrastructure:           $142/month
CI/CD + Automation:                $56-106/month
+ Lambda/existing services:        $50-100/month (your current stack)
─────────────────────────────
TOTAL MONTHLY:                     ~$250-350/month

At scale (10k users, 100k API calls/day):
- RDS: +$100-200 (larger instance)
- Lambda: +$200-500 (higher invocation count)
- Bandwidth: +$50-100 (CloudFront, if added)
─────────────────────────────
ESTIMATED AT 10K USERS:            ~$600-1200/month
```

**Cost optimization levers:**
1. **RDS Proxy:** Skip for MVP. Add only if Prisma connection pooling hits limits. Cost: $220/mo + overhead.
2. **CloudFront:** Skip if serving primarily US. Add if international users. Cost: $0.085/GB egress.
3. **Multi-AZ / Read Replicas:** Skip entirely for MVP. Single-AZ RDS sufficient. Cost saved: $150-250/mo.
4. **Reserved Instances:** After 1 month of stable load, purchase 1-year RDS RI. Saves ~30% on RDS cost.
5. **Lambda Graviton (ARM):** 20% cheaper than x86 for same performance. Free optimization.

**Most impactful cost control:** Budget alerts + tagging. Catch configuration mistakes early.

---

## Deployment Architecture Recommendation (Cost-Optimized)

Given your stack (Next.js 14 + Prisma + PostgreSQL + existing AWS services), here's the recommended baseline architecture:

### Option A: AWS Amplify Hosting (Recommended for Cost-Optimized MVP)

**Best for:** Fastest deployment, minimal ops burden, built-in CI/CD.

```
GitHub Repo
    ↓
AWS Amplify Hosting
    ├─ Automatic builds on git push
    ├─ CloudFront CDN (included)
    └─ Environment variables + secrets management
         ↓
Next.js App (SSR + API routes)
         ↓
RDS PostgreSQL (separate prod + staging instances)
         ↓
S3 (backups, logs, audio files)
```

**Monthly cost:** ~$250-350 (RDS + minimal compute)
**Setup time:** ~2-3 days (includes CI/CD, secrets, multi-env)
**Operational burden:** Low (Amplify handles scaling, SSL, CDN)

**Why this for v1.0:** No infrastructure code to write, auto-scaling, built-in monitoring, cost predictable.

### Option B: AWS CDK + ECS Fargate (Recommended for Phase 2)

**Best for:** Reproducible infrastructure, fine-grained control, multi-service setup.

```
GitHub Repo
    ↓
GitHub Actions (or AWS CodePipeline)
    ├─ Build Docker image → ECR
    ├─ Run tests
    ├─ Push to ECR
    └─ Trigger CodePipeline
         ↓
CodeBuild + CodeDeploy
    ├─ Run Prisma migrations
    └─ Deploy to ECS Fargate
         ↓
Application Load Balancer (ALB)
         ↓
ECS Fargate Tasks (auto-scaled by CPU/memory)
         ↓
RDS PostgreSQL (separate prod + staging)
```

**Monthly cost:** ~$300-500 (ALB + ECS Fargate + RDS)
**Setup time:** ~5-7 days (requires CDK/IaC, container orchestration)
**Operational burden:** Medium (need to manage container images, scaling policies)

**Why defer to Phase 2:** More control, reproducible infra, but slower initial setup. Worth it once you need:
- Multi-service architecture
- Custom scaling policies
- Disaster recovery templates

---

## Recommended Phasing for Launch

### Phase 1 (v1.0, Week 1-3): Table Stakes Only

1. **Secrets Management** (2 hrs) — Move credentials to AWS Secrets Manager.
2. **Multi-environment setup** (4 hrs) — Separate RDS instances for staging + prod.
3. **IAM roles** (4 hrs) — Create service role for Amplify/Lambda/ECS with least privilege.
4. **CI/CD pipeline** (8 hrs) — GitHub Actions → Amplify auto-deploy on main branch push.
5. **Database migrations** (4 hrs) — Add `prisma migrate deploy` to CI/CD before app deploy.
6. **Logging + Metrics** (4 hrs) — Enable CloudWatch, configure structured JSON logs.
7. **Health checks** (2 hrs) — Add liveness endpoint `/api/health`, CloudWatch alarm if failing.
8. **Cost budgets** (1 hr) — AWS Budgets alert if monthly spend exceeds $500.

**Total effort:** ~30 hours (can parallelize many tasks)
**Cost:** ~$250-300/month

### Phase 2 (v1.1, Week 4-6): High-ROI Differentiators

1. **Infrastructure as Code** (20 hrs) — Rewrite manual AWS setup as CDK code. Enables reproducibility.
2. **Cost allocation tags** (4 hrs) — Tag resources by feature (session mgmt, transcription, database). Analyze where money goes.
3. **Canary deployments** (12 hrs) — Enable 5% traffic to new version, automatic rollback on errors.
4. **Vulnerability scanning** (2 hrs) — Enable GitHub Dependabot, CodeArtifact scanning.
5. **RDS Proxy** (only if needed) — If seeing "too many connections" errors in logs.

**Trigger for Phase 2:** v1.0 stable + first month of production metrics + team feedback.

---

## Sources

### AWS Official Documentation
- [AWS CDK vs Terraform: The Complete 2026 Comparison - DEV Community](https://dev.to/aws-builders/aws-cdk-vs-terraform-the-complete-2026-comparison-3b4p)
- [AWS Cloud Development Kit (AWS CDK) v2](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [AWS Amplify Hosting - Secrets and environment variables](https://docs.amplify.aws/nextjs/deploy-and-host/fullstack-branching/secrets-and-vars/)
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [Amazon CloudWatch - Application logging and monitoring](https://docs.aws.amazon.com/prescriptive-guidance/latest/logging-monitoring-for-application-owners/cloudwatch.html)
- [Amazon RDS for PostgreSQL - Best Practices](https://aws.amazon.com/blogs/database/best-practices-for-migrating-postgresql-databases-to-amazon-rds-and-amazon-aurora/)

### Next.js & Prisma Documentation
- [Next.js Production Deployment Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Prisma - Deploying database changes with Prisma Migrate](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)
- [Prisma with Amazon RDS and SST](https://sst.dev/docs/start/aws/prisma/)
- [Prisma - Caveats when deploying to AWS platforms](https://www.prisma.io/docs/orm/prisma-client/deployment/caveats-when-deploying-to-aws-platforms)

### Community & Deployment Guides
- [Next.js on AWS: A guide to common deployment strategies - Medium](https://medium.com/@redrobotdev/next-js-on-aws-a-guide-to-common-deployment-strategies-a583772e7372)
- [Next.js on AWS with SST - SST Documentation](https://sst.dev/docs/start/aws/nextjs/)
- [AWS CI/CD Pipeline for Next.js - FreeCodeCamp](https://www.freecodecamp.org/news/ci-cd-pipeline-for-nextjs-app-with-aws/)
- [AWS Cost Optimization Guide 2026 - SquareOps](https://squareops.com/blog/aws-cost-optimization-complete-2026-guide/)
- [Next.js on AWS: Comparing price and performance - Stacktape](https://www.stacktape.com/blog/nextjs-price-performance-comparison-aws)

### Security & Best Practices
- [12 AWS IAM Security Best Practices to Know in 2026 - StrongDM](https://www.strongdm.com/blog/aws-iam-best-practices)
- [AWS Security Best Practices 2026 - SentinelOne](https://www.sentinelone.com/cybersecurity-101/cloud-security/aws-security-best-practices/)
- [AWS IAM Identity Center (successor to AWS SSO)](https://docs.aws.amazon.com/singlesignon/)

### Multi-Environment & Infrastructure
- [AWS Prescriptive Guidance - Staging Environment](https://docs.aws.amazon.com/prescriptive-guidance/latest/choosing-git-branch-approach/staging-environment.html)
- [Multi-env Next.js app with AWS Amplify & Serverless - DEV Community](https://dev.to/aarongarvey/multi-env-next-js-app-with-aws-amplify-serverless-3571)

---

**Research summary:** Infrastructure deployment for Next.js on AWS requires balancing cost, security, and operational burden. For cost-optimized MVP, prioritize the 9 Table Stakes features (~$250-300/month, ~30 hours setup). Defer IaC, advanced monitoring, and HA features to Phase 2. AWS Amplify is fastest path to production; migrate to CDK-managed architecture post-validation.
