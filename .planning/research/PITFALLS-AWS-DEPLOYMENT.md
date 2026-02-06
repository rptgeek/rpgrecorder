# Domain Pitfalls: Next.js on AWS Production Deployment

**Domain:** Next.js applications deployed to AWS for the first time
**Researched:** 2026-02-05
**Focus:** Cost, infrastructure, database, CI/CD, security, and performance pitfalls
**Confidence:** HIGH for cost pitfalls and infrastructure anti-patterns; MEDIUM for security specifics (rapidly evolving landscape)

---

## Critical Pitfalls (Rewrites/Major Issues)

### Pitfall 1: Lambda Cold Start Cascades with No Warming Strategy

**What goes wrong:**
Next.js deployed on AWS Lambda with no provisioned concurrency or warming strategy experiences 1-5+ second cold starts after inactivity. Users see slow initial page loads; under traffic spikes, cold starts compound, creating cascading delays across the application.

**Why it happens:**
- Teams assume Lambda's auto-scaling handles performance automatically
- Cold start overhead for Next.js is high: Node.js runtime initialization + framework setup + dependency loading
- No one measures cold start impact in production until users complain
- Provisioned concurrency costs appear "expensive" ($200+/month) so teams skip it

**Consequences:**
- Poor user experience on first request after idle periods
- Cascading timeouts during traffic spikes
- Users retry requests, making situation worse
- Increases Lambda invocation count (higher costs)

**Prevention:**
- **Measure before deciding:** Profile cold start time in staging environment (typical: 1-3 seconds for Next.js)
- **For customer-facing APIs:** Use provisioned concurrency (roughly $220-400/month for small scale, 2-4 concurrent instances)
- **Alternative:** Deploy to ECS/Fargate if traffic is predictable; eliminates cold starts entirely
- **Warming fallback:** If avoiding provisioned concurrency, implement synthetic traffic/scheduled warming (Lambda Scheduled Events that invoke the function every 5-10 minutes)
- **At minimum:** Use memory allocation optimally—512MB provides ~40% faster cold starts than 128MB; diminishing returns beyond 1GB

**Detection:**
- CloudWatch logs show high DURATION values (>1 second) on first invocation after idle
- X-Ray traces show function initialization as bottleneck
- User complaints about "first load is slow"
- Performance metrics spike after 5-15 minute idle periods

**Cost Impact:**
Provisioned concurrency: ~$0.06/hour per instance = ~$43/month per instance
Alternatively, cold start delays increase request retry rates by 10-20%, increasing Lambda duration costs by 15-30%

**Phase to Address:**
Phase 2 or 3 (when moving to production)

---

### Pitfall 2: RDS Connection Pool Exhaustion from Serverless Functions

**What goes wrong:**
Each Lambda invocation creates its own database connection (or fails to reuse it across invocations). Database reaches maximum connection limit; new requests queue or timeout; API becomes unavailable.

**Why it happens:**
- Developers create new database connections inside Lambda handlers without persistent connection pooling
- Lambda doesn't guarantee connection persistence between invocations (environment reuse is not guaranteed)
- RDS default max connections: 20-100 depending on instance size; scales poorly with invocation frequency
- Connection pooling libraries (Prisma, pg-pool) work in monolithic servers but not straightforwardly in serverless

**Consequences:**
- "Too many connections" database errors
- API latency spikes as connection attempts queue
- Cascading failures across application
- Requires RDS scaling (expensive) to temporarily resolve

**Prevention:**
- **Use RDS Proxy from the start:** RDS Proxy terminates connections from Lambda, maintains connection pool to RDS; default 1000 connections, configurable
- **Alternative: Deploy to ECS** where connection pooling is simpler (persistent runtime)
- **If using Prisma:** Use `datasource { url = env("DATABASE_URL") }` pointing to RDS Proxy endpoint, not RDS directly
- **Verify connection reuse:** Test that Lambda reuses connections across invocations (CloudWatch logs should show single connection ID)
- **Set visibility timeout carefully:** RDS Proxy idle connection timeout default 30 minutes; adjust based on Lambda invocation frequency

**Detection:**
- RDS CloudWatch metric "DatabaseConnections" creeping toward max
- Application logs: "FATAL: remaining connection slots are reserved for non-replication superuser connections"
- API response times increase gradually over 10-30 minutes as pool exhausts
- Database audit logs show new connections continuously created/destroyed

**Cost Impact:**
RDS Proxy: ~$0.015/hour (~$11/month for basic setup) + $0.01 per million requests
Emergency RDS scaling to handle connection spike: $100-500+ per month

**Phase to Address:**
Phase 1 (foundation) or Phase 2 (must be solved before production)

---

### Pitfall 3: Unbounded Lambda Cost from Idle API Calls

**What goes wrong:**
Lambda function makes external API calls (database queries, third-party APIs) that take time to complete. Function sits idle waiting for response; you're billed for that idle time. At scale (thousands of invocations), idle-time burn becomes a major cost driver.

**Real example (2025):** Customer moved 20 client-side requests to server-side per page. Vercel bill jumped from $300/month to $3,550/month. Root cause: Lambda idling during DB reads and external API calls.

**Why it happens:**
- Developers assume Lambda only costs for execution time
- AWS INIT phase billing (added August 2025) compounds this; initialization now costs money
- Teams don't measure "active processing" vs. "idle waiting" time
- Moving server-side logic from Vercel/client-side without understanding cost implications

**Consequences:**
- Unexpected bills of 5-10x increase
- Cost scales linearly with request volume (unlike static sites)
- No obvious trigger—appears as a big invoice surprise

**Prevention:**
- **Measure idle time:** Use X-Ray to trace function execution; separate active processing from wait time
- **Batch operations:** Combine multiple API calls into single request where possible
- **Increase memory allocation:** Higher memory = faster CPU = less wait time; sometimes counterintuitively cheaper overall
- **Use Step Functions for long-running tasks:** SQS → Lambda for immediate returns, then Step Functions to orchestrate lengthy operations separately
- **Consider static generation:** If pages don't change frequently, use Next.js ISR or full static generation; costs drop to near-zero

**Detection:**
- AWS Lambda dashboard shows high average duration (>1 second) with low active processing percentage
- X-Ray traces show large gaps between requests and responses
- CloudWatch Insights: filter logs for functions where actual computation is <20% of total duration
- Cost per request higher than expected

**Cost Impact:**
Idle-time burn example: If function makes 1000 requests/day, each 2 seconds, with 1.5 seconds idle:
- Current cost: $0.0000167 × 1000 × 2 = $0.0334/day
- With optimization: $0.0000167 × 1000 × 0.5 = $0.0084/day
- Savings: ~75% = $5-15/month at small scale, $150-500/month at larger scale

**Phase to Address:**
Phase 2 or 3 (must validate before hitting production scale)

---

### Pitfall 4: CloudFormation/CDK Cross-Stack Dependency Hell

**What goes wrong:**
Infrastructure split across multiple CloudFormation stacks with hard dependencies (Stack B references resource from Stack A). Deleting or updating Stack A fails because Stack B still references it. Updates become fragile; small changes ripple through entire stack.

**Why it happens:**
- Teams split stacks by "layer" (database, app, cdn) without understanding dependency coupling
- CDK makes it too easy to reference resources from other stacks
- No documented dependency graph
- Testing stacks individually masks integration issues

**Consequences:**
- Deployments fail with cryptic "resource in use" errors
- Cannot delete/recreate stacks without manual intervention
- Rolling back deployments requires multiple coordinated stack updates
- Infrastructure becomes unmaintainable as it grows

**Prevention:**
- **Keep cross-stack references minimal:** Use stack outputs for truly decoupled resources only
- **Use separate AWS accounts for major environments** (dev, staging, prod) rather than stacks within same account
- **Document dependency graph:** Before writing CDK, map which resources depend on what
- **Export outputs explicitly:** Use CloudFormation/CDK stack outputs to formalize dependencies
- **Avoid hardcoding ARNs:** Use resource IDs and let CloudFormation resolve them
- **Test deletion:** Regularly practice deleting stacks in reverse dependency order to verify cleanup works

**Detection:**
- CDK synthesis produces warnings about many cross-stack references
- Deployment failures mention "Resource is in use by another resource"
- Stack update/deletion takes >5 minutes with multiple retries
- Terraform/CDK code has dozens of `.Arn` or `.Ref` references between stacks

**Cost Impact:**
Failed deployments = potential downtime ($1000+/hour for mission-critical app); manual remediation hours = $500-2000

**Phase to Address:**
Phase 1 (foundation) - must be designed correctly from start

---

## Major Pitfalls (Significant Delays/Technical Debt)

### Pitfall 5: Image Optimization Cache-Control Header Trap

**What goes wrong:**
Next.js `next/image` component from remote S3 source sets `Cache-Control: max-age=0, must-revalidate`. CDN (CloudFront) never caches; every image request hits Lambda/origin. Costs spike; performance degrades.

**Why it happens:**
- Next.js always revalidates remote images by default for security/freshness
- Developers assume CloudFront will cache images; it doesn't without proper headers
- CloudFront cache invalidation costs $0.005 per path after first 1000/month

**Consequences:**
- Every image request bypasses CDN cache, hitting origin
- Lambda or origin server overloaded
- Data transfer costs increase
- Page load times don't improve despite CloudFront

**Prevention:**
- **Option 1 (Recommended):** Write custom image loader; define custom Cache-Control headers with longer TTL
- **Option 2:** Store images in S3 with appropriate Cache-Control metadata; serve directly via signed URLs
- **Option 3:** Use dedicated image optimization service (AWS CloudFront + S3 with proper cache settings)
- **Verify cache hit rate:** CloudFront dashboard should show >80% cache hit ratio for static images

**Detection:**
- CloudFront cache hit ratio <30% for /image/* routes
- Origin request count doesn't drop over time (should decrease as cache warms)
- Image requests take >500ms consistently

**Cost Impact:**
With no caching: $0.085 per GB data transfer out (CloudFront) × 100GB/month = $8.50 + origin costs
With 80% cache hit: same content costs ~$1.70 origin + CloudFront + cache invalidation = ~7x difference

**Phase to Address:**
Phase 2 or 3 (image handling)

---

### Pitfall 6: SQS Visibility Timeout Misalignment with Lambda

**What goes wrong:**
SQS message visibility timeout is shorter than Lambda function timeout. Function still processing message when timeout expires; message reappears in queue, gets processed again by another Lambda, causing duplicate work.

**Why it happens:**
- Default SQS visibility timeout: 30 seconds
- Default Lambda timeout: 3 minutes
- Teams assume longer function timeout = more time to process; don't realize SQS visibility expires independently
- Duplicates aren't obvious until subtle bugs appear (double-charged customers, duplicate emails)

**Consequences:**
- Duplicate message processing
- Idempotency bugs surface in production
- Data corruption/duplication
- Hard to debug; appears intermittent

**Prevention:**
- **Rule of thumb:** Set SQS visibility timeout to **6x Lambda function timeout + batch window time**
  - Example: Lambda timeout 2 min + 30s batch window = 180 + 30 = 210s; set visibility timeout to 210 × 6 = 1260s (21 minutes)
- **Verify in code:** Lambda handler should complete before visibility timeout, not rely on timeout
- **Implement idempotency keys:** Even with correct timeouts, process same message twice safely
- **Test failure mode:** Intentionally let Lambda timeout; verify message reappears and is handled correctly

**Detection:**
- CloudWatch logs show same message ID processed multiple times
- SQS ApproximateNumberOfMessagesVisible increases over time
- Business logic shows duplicates (duplicate orders, duplicate notifications)

**Cost Impact:**
Duplicate processing = 2x costs for affected invocations; 100/day duplicates at $0.0000167/inv = $0.34/month extra, but business impact (duplicate charges) is much higher

**Phase to Address:**
Phase 2 (when integrating background jobs)

---

### Pitfall 7: Secrets Management Via Environment Variables

**What goes wrong:**
Database credentials, API keys, and other secrets stored in `.env` files or environment variables. Secrets end up in CloudFormation templates, Lambda environment variable logs, or build artifacts. Anyone with access to deployment logs/code sees secrets.

**Why it happens:**
- Environment variables work fine locally; easier than setting up secrets management
- Team assumes CloudFormation/CDK is secure enough; it's not for secrets
- AWS Secrets Manager feels like "extra complexity"
- 60%+ of frontend projects encounter configuration mishaps with improper secret handling (2025 survey)

**Consequences:**
- Leaked credentials in git history
- Secrets visible in CloudWatch logs
- Secrets visible in CloudFormation templates (viewable by anyone with console access)
- Breach potential; difficult to audit who accessed what

**Prevention:**
- **Use AWS Secrets Manager or AWS Systems Manager Parameter Store from day one** (not environment variables)
- **Never commit `.env` files**
- **For Lambda:** Use IAM roles to access AWS resources (RDS, S3, etc.); no credentials needed
- **For non-AWS secrets:** Fetch from Secrets Manager at Lambda startup (small latency penalty, worth it)
- **Audit CloudFormation templates:** Use checkers that flag hardcoded secrets
- **Rotate credentials regularly:** Secrets Manager enables automatic rotation

**Detection:**
- `grep -r "password\|key\|secret" .env .cloudformation.json` finds exposed secrets
- CloudWatch logs contain database passwords or API keys
- AWS IAM Access Analyzer flags excessive permissions

**Cost Impact:**
AWS Secrets Manager: $0.40/month per secret + $0.06 per 10K API calls (~$5-15/month total)
Breach remediation: $100,000+

**Phase to Address:**
Phase 1 (security foundation)

---

### Pitfall 8: No Monitoring for CloudWatch Logs Cost Explosion

**What goes wrong:**
Each Lambda invocation logs to CloudWatch. Detailed logging (full request/response, stack traces) at scale (10K invocations/day) generates gigabytes of logs. CloudWatch bill becomes second-largest cost after Lambda.

**Why it happens:**
- CloudWatch logs feel "free" (they're not explicitly billed per invocation)
- Default Lambda logging is verbose
- Teams don't realize log retention compound cost: ingestion + storage + queries
- No cost alerting on CloudWatch spending

**Consequences:**
- CloudWatch bill is 30-50% of total Lambda costs
- Logs become unmanageable (gigabytes to search)
- Cost optimization is difficult in month 2+ after launch

**Prevention:**
- **Set log retention from day one:** 7-14 days for production, 1-3 days for staging
- **Filter unnecessary logs:** Log errors, key milestones, not every operation
- **Use structured logging:** JSON logs allow filtering without full-text search (cheaper queries)
- **Set CloudWatch alarms on log ingestion:** Alert if log volume 2x expected baseline
- **Use CloudWatch Insights selectively:** Each query scans all logs up to retention period (costly at scale)
- **Prefer X-Ray for performance analysis:** X-Ray is cheaper than parsing CloudWatch logs for traces

**Detection:**
- AWS Billing Dashboard shows CloudWatch line item approaching Lambda costs
- CloudWatch dashboard shows log ingestion rate >100MB/day
- CloudWatch Logs Insights queries timeout or run slowly

**Cost Impact:**
Log ingestion: $0.50 per GB; storage: $0.03 per GB/month
Example: 10K invocations/day, 10KB logs each = 100MB/day = 3GB/month
Cost: (3 × $0.50) + (3 × $0.03) = $1.59/month
But at 100K invocations/day with verbose logging: 30GB/month = $15-20/month

**Phase to Address:**
Phase 2 or 3 (as logging increases)

---

### Pitfall 9: Unoptimized Cold Start from Large Node Modules

**What goes wrong:**
Deployment package includes oversized dependencies (pdfjs with canvas dependency ~180MB, image libraries, etc.). Lambda unzips >250MB and cold starts 3-5+ seconds. Function hits Lambda's size limit.

**Why it happens:**
- Developers grab popular libraries without checking bundle size
- Build doesn't tree-shake dev dependencies
- No size budget enforced
- OpenNext or other converters include entire node_modules

**Consequences:**
- Cold start becomes unacceptable (3-5 seconds)
- Hitting Lambda size limits (250MB unzipped)
- User-facing timeouts
- Hard to debug which dependency is the culprit

**Prevention:**
- **Enforce size budget:** Fail build if deployment package >100MB unzipped (leaves margin for growth)
- **Audit dependencies:** `npm audit --packages` check size of each dependency
- **Use layerfiles for common libraries:** Lambda Layers store shared dependencies separately (don't count against 250MB limit)
- **Tree-shake aggressively:** Remove dev dependencies from production builds
- **Lazy-load heavy libraries:** Import pdfjs only in handler that needs it, not at top level
- **Use alternatives:** e.g., use Canvas APIs instead of pdfjs if possible; use lightweight alternatives to image libraries

**Detection:**
- Build process shows package size >100MB
- Lambda cold start >2 seconds with simple operations
- CloudWatch shows INIT Duration >1 second
- Errors about code size limit

**Cost Impact:**
Cold starts 3s vs 0.5s = 2.5s × $0.0000167/ms × 1000 invocations/day = $0.42/day = $12/month extra

**Phase to Address:**
Phase 1 (foundation; build must check this)

---

## Moderate Pitfalls (Annoying, Fixable)

### Pitfall 10: Version Skew with No Client Invalidation Strategy

**What goes wrong:**
Deploy Next.js update while users have old JavaScript cached. Client requests data using old API format; new server rejects it. Browser error; users can't recover without manual refresh.

**Why it happens:**
- Next.js doesn't formally support serverless deployments, so client-side version skew protection is weak
- CDN caches old JavaScript bundles
- Cache headers not set appropriately
- No deployment strategy (blue-green, canary) that coordinates client/server versions

**Consequences:**
- Users see broken app after deployment
- Manual refresh required
- Bad user experience during deployments

**Prevention:**
- **Use CloudFront cache invalidation:** Invalidate `/js/*` paths on deployment (free for first 1000/month, $0.005/path after)
- **Set appropriate cache headers:** Public files: long TTL; HTML: no-cache; API responses: depends on data
- **Implement version handshake:** Client sends build ID; server rejects mismatches with 410 Gone status code, triggering client reload
- **Blue-green deployments:** Deploy new version to separate stack, switch traffic after validation
- **Canary deployments:** Route 5-10% traffic to new version; monitor errors; roll back if needed

**Detection:**
- User reports: "App broken after update, refresh fixed it"
- CloudWatch shows 400/500 errors concentrated in minutes after deployment
- Browser errors about undefined API responses

**Cost Impact:**
CloudFront invalidation: $0.005 × 1000 paths = $5/month if hitting limit frequently

**Phase to Address:**
Phase 2 (deployment automation)

---

### Pitfall 11: No Dead Letter Queue for Failed Background Jobs

**What goes wrong:**
SQS job fails; Lambda retries default 2 times and discards message. Job is lost; no record of failure.

**Why it happens:**
- Teams assume Lambda handles retries automatically (it does, but limited)
- Dead Letter Queue (DLQ) feels like "extra infrastructure"
- No monitoring for failed messages

**Consequences:**
- Lost jobs (emails not sent, data not processed)
- Silent failures hard to debug
- No audit trail of what failed and why

**Prevention:**
- **Enable DLQ on SQS queues from day one:** Every queue should have associated DLQ
- **Configure max receive count:** 2-3 retries to main queue, then move to DLQ
- **Monitor DLQ:** CloudWatch alarm if messages appear in DLQ
- **Implement DLQ handler:** Automatically escalate DLQ messages (alert team, log to error tracking)
- **Test failure mode:** Intentionally inject failures; verify DLQ works

**Detection:**
- Missing alerts on DLQ depth
- SQS queue shows received > processed over time
- Users report missing notifications/data updates

**Cost Impact:**
SQS: negligible ($0.0000004 per request)
But cost of missed jobs (customer support, manual retry, lost data) = $100s-$1000s

**Phase to Address:**
Phase 2 (background jobs)

---

### Pitfall 12: Database Connection Leaks in Next.js API Routes

**What goes wrong:**
API route creates database connection but doesn't close it after response. Lambda keeps connection open until timeout. At scale, connections accumulate; RDS connection limit reached.

**Why it happens:**
- Developers used to persistent servers where connection pooling handles cleanup
- Serverless requires explicit connection management
- No linter warning for unclosed connections
- Hard to test locally (single invocation doesn't show the problem)

**Consequences:**
- RDS "too many connections" errors
- API latency spikes as connections queue
- Eventual API failure

**Prevention:**
- **Use RDS Proxy:** Automatically handles connection lifecycle
- **Implement proper cleanup:** Use try/finally to close connections
- **Use Prisma/TypeORM:** Higher-level libraries that manage connections
- **Test with concurrent requests:** Invoke function 10 times simultaneously; monitor RDS connection count
- **Set connection timeouts:** RDS: `idle_in_transaction_session_timeout` = 60 seconds to auto-close idle connections

**Detection:**
- RDS metric: DatabaseConnections creeping toward max over hours
- Application logs: "connection timeout" or "too many connections"
- Lambda cold starts show spike in connection count

**Cost Impact:**
RDS scaling for connection capacity: $100-300/month
RDS Proxy mitigation: ~$11/month

**Phase to Address:**
Phase 1 (code review, testing)

---

### Pitfall 13: CloudFront Cache Behaviors Limit (25 per distribution)

**What goes wrong:**
Complex Next.js app with many API routes, image optimization paths, and rewrite rules. Each rule requires CloudFront cache behavior; exceeds 25 behavior limit.

**Why it happens:**
- Teams add one cache behavior per API route without consolidation
- OpenNext default configuration creates multiple behaviors
- No planning for cache structure upfront

**Consequences:**
- Cannot add more routes; must create new CloudFront distribution
- Multiple distributions complicate scaling, certificates, DNS

**Prevention:**
- **Consolidate patterns:** Use one cache behavior for `/api/*` with multiple origins, not per route
- **Use origin groups:** Route different patterns within same behavior
- **Plan cache structure upfront:** Map 5-10 dominant patterns before building
- **Monitor cache behavior count:** Alert if approaching 20/25

**Detection:**
- CloudFormation deployment fails: "Cannot add cache behavior; limit reached"
- Architecture doc lists >25 distinct routes

**Cost Impact:**
Multiple CloudFront distributions: 2x distribution cost (~$0.085/month extra) + complexity

**Phase to Address:**
Phase 2 (when routing becomes complex)

---

## Minor Pitfalls (Annoying but Fixable)

### Pitfall 14: Forgotten Cron Jobs and Scheduled Tasks

**What goes wrong:**
Create EventBridge rule or Lambda scheduled event for maintenance tasks (cleanup, reporting, backups). Deploy to production, then forget about it. If task needs to change, no one remembers it exists; causing silent failures or resource waste.

**Why it happens:**
- Scheduled tasks are "set and forget" in infrastructure code
- No obvious alert when task fails
- No documentation of why task exists or what it does

**Consequences:**
- Unused resources accumulating (old logs, stale cache)
- Backup jobs failing silently
- Database bloat from un-cleaned data
- Costs of forgotten infrastructure

**Prevention:**
- **Document all scheduled tasks:** Dedicated section in runbooks explaining each EventBridge rule
- **Add monitoring:** CloudWatch alarm if scheduled task fails or takes >expected time
- **Periodic audit:** Quarterly review of all scheduled tasks; disable/delete unused ones
- **Tag resources:** Tag with "scheduled-task-name" for tracking
- **Dry-run capability:** Implement disable flag in event rule; test before re-enabling

**Detection:**
- AWS Billing shows consistent $X/month from services you don't remember creating
- Scheduled tasks fail in CloudWatch Logs but no alerts triggered
- EventBridge rules with descriptions like "TODO: remove this after migration"

**Cost Impact:**
Forgotten task running daily: $5-50/month depending on compute; 10 forgotten tasks = $50-500/month

**Phase to Address:**
Phase 2 or 3 (as automation increases)

---

### Pitfall 15: Hardcoded AWS Region/Account IDs

**What goes wrong:**
Infrastructure code hardcodes AWS region ("us-east-1") or account ID. Impossible to deploy to different region or account without manual edits.

**Why it happens:**
- Developers copy ARN from console into code
- CDK makes it easy to reference hardcoded IDs
- No parameterization from the start

**Consequences:**
- Cannot scale to multiple regions/accounts
- Manual deployments error-prone
- Infrastructure less portable

**Prevention:**
- **Use context variables in CDK:** `this.node.tryGetContext('region')`
- **Pass account/region as parameters:** `new Stack(this, 'MyStack', { env: { account: props.account, region: props.region }})`
- **Use IAM roles to reference resources:** Let AWS resolve ARNs; don't hardcode
- **Store configuration in SSM Parameter Store:** Non-sensitive config (region, account) in parameters; passed at deploy time

**Detection:**
- Grep for hardcoded account IDs: `grep -r "123456789012" .`
- CDK/CloudFormation templates contain specific region references

**Cost Impact:**
Minor; mainly prevents future scaling issues

**Phase to Address:**
Phase 1 (foundation)

---

## Security Pitfalls

### Pitfall 16: S3 Bucket Public Read Access Misconfiguration

**What goes wrong:**
S3 bucket storing application data (user uploads, private files) accidentally made publicly readable. Anyone with bucket name can download all data.

**Why it happens:**
- S3 bucket created with default "private" settings, then modified for "testing"
- Block Public Access settings not enforced
- No infrastructure code scanning for security issues
- Copy-paste from tutorial that uses public bucket

**Consequences:**
- Data breach
- Regulatory violations
- Customer data exposed

**Prevention:**
- **Enforce block public access from day one:** Set S3 block public access settings in CloudFormation/CDK
- **Use bucket policies with least privilege:** Default deny; only allow specific IAM roles
- **Enable access logging:** Log all S3 access; audit periodically
- **Use AWS Config:** Continuous compliance checking for S3 public access
- **Require encryption:** Enable default encryption on all buckets

**Detection:**
- AWS Security Hub or Config flags public S3 bucket
- Bucket policy review shows "Principal: *"
- S3 access logs show requests from unknown IPs

**Cost Impact:**
Data breach: $100,000+

**Phase to Address:**
Phase 1 (security review)

---

### Pitfall 17: IAM Roles with Overly Permissive Policies

**What goes wrong:**
Lambda IAM role has `s3:*` permission (all S3 actions) instead of specific `s3:GetObject` on specific bucket. If Lambda is compromised, attacker can delete, modify, or steal any S3 data.

**Why it happens:**
- Developers use broad permissions to "make it work"
- Fine-grained permissions seem tedious
- No automated policy review

**Consequences:**
- Breach blast radius is wide
- Compromised Lambda can access all resources
- Regulatory non-compliance

**Prevention:**
- **Principle of least privilege:** Grant only required permissions
- **Use resource-based permissions:** Limit to specific bucket, prefix, or resource
- **Use IAM Access Analyzer:** Validate policies for overly permissive rules
- **Review roles quarterly:** Audit which permissions are actually used
- **Use service-linked roles:** For managed services like RDS Proxy

**Detection:**
- IAM policy review shows `*` resources or actions
- Access Analyzer flags role as overly permissive
- Unused permissions in CloudTrail/Access Analyzer

**Cost Impact:**
Breach remediation: $100,000+

**Phase to Address:**
Phase 1 (security review)

---

### Pitfall 18: React Server Components (RSC) Protocol Vulnerability

**What goes wrong:**
Next.js 13.4.12+ with React Server Components vulnerable to CVE-2025-55182 (React2Shell). Unpatched servers allow remote code execution when processing attacker-controlled requests.

**Why it happens:**
- Vulnerability disclosed December 2025; rapid exploitation by threat groups
- Teams don't patch immediately
- No vulnerability scanning in CI/CD

**Consequences:**
- Complete system compromise
- Data theft, malware injection
- No audit trail of what was accessed

**Prevention:**
- **Keep Next.js updated:** Patch within 24-48 hours of security release
- **Automated dependency scanning:** npm audit in CI; fail builds on critical CVEs
- **Security alerts:** Subscribe to Next.js security notifications
- **WAF rules:** Deploy AWS WAF with rules for known exploitation patterns

**Detection:**
- Application logs show unusual RSC protocol requests
- CloudTrail shows unexpected API calls from unknown IPs
- WAF logs show blocked requests from known exploit tools

**Cost Impact:**
Incident remediation: $50,000-$500,000+ depending on breach extent

**Phase to Address:**
Phase 1 (update policy in CI/CD)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| **Phase 1: Foundation** | Secrets in environment variables | Use Secrets Manager from day one |
| **Phase 1: Foundation** | Overly permissive IAM roles | Implement least privilege in CDK templates |
| **Phase 1: Foundation** | Public S3 buckets | Enforce block public access in code |
| **Phase 1: Foundation** | No dependency scanning | Add npm audit to CI; fail on critical CVEs |
| **Phase 2: Core App** | RDS connection pool exhaustion | Deploy RDS Proxy before production |
| **Phase 2: Core App** | Cold start without warming strategy | Measure and implement provisioned concurrency or ECS alternative |
| **Phase 2: Core App** | Unbounded Lambda costs from idle API calls | Profile and optimize wait time; consider static generation |
| **Phase 2: Core App** | Missing DLQ on background jobs | Add DLQ and monitoring from first job queue |
| **Phase 3: Scaling** | Image cache-control header trap | Implement custom image loader; verify cache hit ratio |
| **Phase 3: Scaling** | Forgotten scheduled tasks | Audit EventBridge rules; document and monitor all tasks |
| **Phase 3: Scaling** | Version skew after deployments | Implement cache invalidation and versioning strategy |
| **Phase 4: Advanced** | CloudFront cache behavior limit | Consolidate behaviors; use origin groups; plan upfront |
| **All phases** | Large Node module deployments | Enforce size budget (<100MB unzipped) in build |

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Cost pitfalls | **HIGH** | Multiple 2025-2026 sources documenting Lambda costs, cold starts, connection pool costs with real examples |
| Infrastructure anti-patterns | **HIGH** | CDK best practices well-documented; cross-stack dependencies confirmed in multiple sources |
| Database connection issues | **HIGH** | Well-documented RDS/serverless challenge; RDS Proxy solution tested in production |
| CI/CD failures | **MEDIUM** | Pipeline failures documented; specific Next.js scenarios less common in literature |
| Security vulnerabilities | **MEDIUM-HIGH** | S3/IAM misconfigurations well-known; React2Shell CVE very recent (Dec 2025) and actively exploited |
| Performance/cold starts | **HIGH** | 2025 sources document cold start strategies and measurements |
| SQS/Lambda timing | **HIGH** | Visibility timeout issues well-documented in AWS support channels |

---

## Sources

- [AWS Lambda Cost Breakdown For 2026](https://www.wiz.io/academy/cloud-cost/aws-lambda-cost-breakdown)
- [AWS Lambda Cold Start Cost](https://edgedelta.com/company/knowledge-center/aws-lambda-cold-start-cost)
- [NextJS Lambda vs ECS - Real-world comparison Jan 2025](https://schematical.com/posts/nextjs-cost-lambda-vs-ecs-desktop_20250128)
- [Next.js Price and Performance Comparison AWS](https://www.stacktape.com/blog/nextjs-price-performance-comparison-aws)
- [AWS RDS Proxy Connection Pooling](https://repost.aws/knowledge-center/rds-proxy-connection-pooling)
- [Database Connections in Next.js Serverless Functions](https://anujchhikara.hashnode.dev/understanding-database-connections-in-nextjs-serverless-functions)
- [AWS CDK Best Practices 2026](https://towardsthecloud.com/blog/aws-cdk-best-practices)
- [CloudWatch Cost Optimization 2026](https://www.wiz.io/academy/cloud-cost/cloudwatch-costs)
- [OpenNext Common Issues](https://opennext.js.org/aws/v2/common_issues)
- [SQS and Lambda Failure Modes Guide](https://lumigo.io/blog/sqs-and-lambda-the-missing-guide-on-failure-modes/)
- [AWS Lambda Cold Start Optimization 2025](https://zircon.tech/blog/aws-lambda-cold-start-optimization-in-2025-what-actually-works/)
- [Next.js Environment Variables Secrets Management](https://moldstud.com/articles/p-secrets-of-successful-nextjs-production-environment-variable-management)
- [AWS Security Vulnerabilities and Misconfigurations 2025](https://hydrasit.com/resources/aws-top10)
- [AWS Security Hub Risk Prioritization](https://aws.amazon.com/blogs/aws/aws-security-hub-now-generally-available-with-near-real-time-analytics-and-risk-prioritization/)
- [React2Shell CVE-2025-55182 Exploitation](https://aws.amazon.com/blogs/security/china-nexus-cyber-threat-groups-rapidly-exploit-react2shell-vulnerability-cve-2025-55182/)
- [OpenNext Portability and Deployment](https://blog.logrocket.com/opennext-next-js-portability/)
- [Image Caching in Next.js for CloudFront](https://dev.to/melvinprince/how-to-optimize-image-caching-in-nextjs-for-blazing-fast-loading-times-3k8l)
- [AWS SQS Visibility Timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [AWS Lambda with SQS](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
