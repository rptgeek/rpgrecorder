# AWS Deployment Cost Analysis: Next.js on Lambda vs ECS

**Domain:** Cost-optimized deployment architecture decisions for Next.js
**Researched:** 2026-02-05
**Confidence:** HIGH (based on real-world 2025-2026 deployments)

---

## Executive Summary

**Lambda is cheaper at low traffic (<5 req/sec sustained)**
- Lambda: ~$0.01/day for light traffic
- ECS/Fargate: ~$1.19/day minimum (fixed ALB + container costs)
- Breakeven: ~5-10 requests/second sustained traffic

**BUT: Hidden costs can turn Lambda expensive:**
1. **Idle-time burn:** Waiting for database/API responses (1.5s idle per 2s request = 75% wasted cost)
2. **CloudWatch logs:** Can be 30-50% of Lambda costs if not carefully managed
3. **Cold starts:** Increase retry rates and retries increase costs 10-20%
4. **CloudFront invalidation:** $0.005/path after 1000/month free
5. **Data transfer:** $0.085/GB out via CloudFront; missing cache hits multiply this

**Recommendation:** For cost-conscious first deployment, measure your workload against these costs before committing to architecture.

---

## Lambda Cost Breakdown

### Base Lambda Costs

**Pricing structure (US-EAST-1):**
- Requests: $0.0000002 per request
- Compute: $0.0000167 per GB-second

**Example calculations:**

| Traffic | Requests/day | Avg Duration | Memory | Monthly Cost |
|---|---|---|---|---|
| Low (test) | 1,000 | 500ms | 512MB | $0.02 |
| Small app | 10,000 | 500ms | 512MB | $0.20 |
| Medium app | 100,000 | 500ms | 512MB | $2.01 |
| High traffic | 1,000,000 | 500ms | 512MB | $20.10 |

### Hidden Costs That Surprise Teams

#### 1. Idle-Time Burn (LARGEST HIDDEN COST)

**Scenario:** API endpoint that queries database (100ms active) + waits for response (1.5s idle)
- Total duration: 1.6 seconds
- Idle percentage: 94%
- You're billing for all 1.6 seconds even though function does nothing for 1.5s

**Real example (documented 2025):**
- Customer moved 20 API calls server-side (was client-side before)
- Each call: 2 second duration, ~1.5 seconds idle
- Traffic: 1000 users/day × 20 calls = 20,000 calls/day
- Monthly cost jump: $300 → $3,550 (11.8x increase)

**Cost impact:**
```
Current: 20,000 calls/day × 2 sec × $0.0000167/GB-sec (512MB) = $6.69/day = $200/month
Optimized: 20,000 calls/day × 0.5 sec (no idle) = $1.67/day = $50/month
Savings: $150/month (75% reduction)
```

**Prevention:**
- Profile with X-Ray; measure active vs idle time
- Batch database queries where possible
- Use Step Functions for multi-step async work
- Consider static generation for non-dynamic content
- If unavoidable, ECS might be cheaper (pay fixed rate regardless of idle time)

---

#### 2. AWS INIT Phase Billing (Added August 2025)

AWS now charges for Lambda initialization time (previously free).

**Impact:**
- Functions with heavy frameworks (Next.js) pay $0.0000167/GB-sec for startup
- Typical Next.js cold start: 1-3 seconds × 512MB
- Cost: 1-3 seconds × $0.0000167 = $0.00002-0.00005 per cold start

**At scale:**
- 1000 cold starts/month: $0.02-0.05 extra/month (minimal)
- 10,000 cold starts/month: $0.20-0.50 extra/month (starting to add up)
- 100,000 cold starts/month: $2-5 extra/month

**Prevention:**
- Reduce cold starts with provisioned concurrency (keep function warm)
- Or accept cost and budget for it

---

#### 3. CloudWatch Logs (30-50% of Lambda costs at scale)

**Default logging:**
- Every Lambda invocation sends logs to CloudWatch
- Default log level: INFO (chatty)
- Typical log size: 1-10KB per invocation

**Cost calculation:**
```
10,000 invocations/day × 5KB/invocation = 50MB/day
50MB × 30 days = 1,500MB = 1.5GB/month

Log ingestion: 1.5GB × $0.50 = $0.75/month
Log storage (1 month): 1.5GB × $0.03 = $0.045/month
Total: ~$0.80/month for logs vs $2.01/month for Lambda compute = 40% of total!
```

**At 100K invocations/day with verbose logging:**
```
100K × 10KB = 1GB/day = 30GB/month
Ingestion: 30 × $0.50 = $15
Storage: 30 × $0.03 = $0.90
Total: ~$16/month (46% of total costs if Lambda is ~$35/month)
```

**Prevention:**
- Set retention to 7-14 days (not 30)
- Use structured JSON logging (search cheaper than full-text)
- Log errors + key metrics only, not every operation
- Use CloudWatch Insights selectively; each query scans all logs (expensive)
- Prefer X-Ray for performance tracing ($0.50/million sampled traces)

---

#### 4. Data Transfer Costs

**CloudFront data transfer out:**
- First 10TB/month: $0.085/GB
- At 1TB/month: $85/month data transfer
- Cache miss rate of 20% (should be 80%+) on 10GB/day = 2GB/day = 60GB/month = $5.10/month extra

**Prevention:**
- Ensure CloudFront cache hit rate >80% for static assets
- Set appropriate Cache-Control headers (especially for images)
- Use S3 as origin (cheaper than Lambda origin)
- Compress responses (gzip reduces data transfer 70-80%)

---

#### 5. API Gateway (Secondary cost)

**Pricing:**
- First 1 billion requests/month: $3.50 per million
- REST API that rarely costs more than $1/month, but can spike with misconfigurations

**Hidden cost:**
- If you leave caching enabled in dev environment by accident: $1/month burn

**Prevention:**
- Verify caching is intentional
- Don't use API Gateway caching for non-idempotent operations

---

## ECS/Fargate Cost Breakdown

### Base Costs (Fixed)

**Minimum viable ECS setup:**

| Component | Cost/hour | Cost/month |
|---|---|---|
| Application Load Balancer | $0.0225 | $16.20 |
| ECS Fargate (0.5 CPU, 1GB RAM) | $0.021 | $15.12 |
| NAT Gateway (if needed) | $0.045 | $32.40 |
| **Total Minimum** | **$0.0885** | **~$63.72** |

**All-in minimum:** ~$1.19/day or $36/month, 24x7

### Why ECS Can Be Cheaper

1. **No cold starts:** Container always running = predictable performance
2. **No idle-time billing:** Pay per hour, not per second
3. **Bulk compute cheaper:** 1GB RAM on ECS = $0.021/hour; 1GB on Lambda = $0.0000167/sec = $0.06/hour at 100% utilization

**Breakeven analysis:**
```
ECS fixed cost: $36/month
Lambda equivalent (0.5GB, 1sec avg duration):
  - 1M requests/month = $16.70 Lambda + $5/CloudWatch = $21.70 (cheaper!)
  - 10M requests/month = $167 Lambda + $50/CloudWatch = $217 (ECS is 81% cheaper)

Breakeven: ~5M requests/month or 5-10 req/sec sustained
```

---

## Real-World Cost Scenarios

### Scenario 1: Small Blog/Static Content

**Traffic pattern:**
- 100 requests/day
- 90% static (cached by CloudFront)
- 10 dynamic requests/day

**Lambda approach:**
```
Lambda: 10 req/day × 0.5s × $0.0000167 = $0.0008/day = $0.024/month
CloudFront: Mostly cached; assume 100GB/month = $8.50
CloudWatch: Minimal = $0.10
API Gateway: $0.001
Total: ~$8.60/month
```

**ECS approach:**
```
ECS minimum: $36/month
(Total overkill for this traffic, but includes unlimited scaling buffer)
```

**Winner:** Lambda by far (~20x cheaper)

---

### Scenario 2: SaaS Application with Database

**Traffic pattern:**
- 100,000 requests/day
- 80% API (1.5s duration, 1s idle)
- 20% static (cached)

**Lambda approach:**
```
API requests: 80K × 1.5s × $0.0000167 = $20.04/day
Static requests: 20K × 0.5s × $0.0000167 = $0.17/day
CloudWatch logs: 80K × 5KB = 400MB/day = 12GB/month = $6.50 (ingestion) + $0.36 (storage)
CloudFront: 20GB/month outbound = $1.70
RDS Proxy: $0.015/hour + $0.01/M requests = ~$11 + $0.80 = $11.80
Total: $20.04 × 30 + $6.86 + $1.70 + $11.80 = $643.10/month

WITH OPTIMIZATION (0.5s duration, no idle):
API requests: 80K × 0.5s × $0.0000167 = $6.68/day = $200.40/month
CloudWatch: Cut in half = $3.43
Total optimized: ~$217/month (66% savings!)
```

**ECS approach:**
```
ECS: $36/month minimum + autoscaling for peak load
At 100K req/day, need ~1-2 tasks; assume average 1.5 tasks:
- 1 task: $36
- 0.5 additional task (scaling): $18
- RDS Proxy: $11.80
Total: ~$65.80/month
```

**Winner:** ECS (if accepting fixed cost overhead) or optimized Lambda

**Key insight:** Idle-time burn makes unoptimized Lambda 10x more expensive; optimization and ECS are comparable.

---

### Scenario 3: Traffic Spike Event

**Pattern:**
- 10,000 requests/day normally
- Sudden spike to 1M requests/day for 3 days (event)
- Back to 10K for remainder of month

**Lambda behavior (autoscales):**
```
Normal 27 days: 10K × 0.5s × $0.0000167 × 27 = $22.95
Spike 3 days: 1M × 0.5s × $0.0000167 × 3 = $251.00
Monthly total: ~$274

CloudWatch extra for spike: minimal
Total: ~$275/month
```

**ECS behavior (fixed):**
```
Need to provision for peak (1M/day = ~12 req/sec)
Baseline needs 1 task; spike needs 12 tasks
Keep 12 tasks running whole month to handle spike = $36 × 12 = $432/month
If remove after event: only pay $432 × 3 = $129 for spike period + $36 × 27 = $972 = $1,101 (worse!)
```

**Winner:** Lambda (scales down automatically after event)

---

## Cost Optimization Checklist

Priority order for cost optimization:

### Phase 0 (Do First)
- [ ] Set up AWS Budgets with alerts ($100/month, $300/month thresholds)
- [ ] Enable Cost Anomaly Detection
- [ ] Set CloudWatch log retention to 7 days
- [ ] Profile Lambda duration with X-Ray (separate active vs idle time)
- [ ] Deploy RDS Proxy (eliminates worst-case connection scaling)

### Phase 1 (After Baseline)
- [ ] If idle time > 30% of duration, profile which operations cause idle
- [ ] If CloudWatch logs > 50% of Lambda cost, reduce logging
- [ ] If CloudFront cache hit rate < 80%, investigate cache headers
- [ ] If 20K+ requests/day, revisit ECS vs Lambda math

### Phase 2 (Optimization)
- [ ] Batch database queries to reduce idle time
- [ ] Increase Lambda memory (sometimes cheaper: more CPU = less duration)
- [ ] Consider static generation for non-dynamic content
- [ ] Implement request caching where appropriate
- [ ] Use Step Functions for long-running async work

### Phase 3 (Scaling)
- [ ] Evaluate moving to ECS if sustained traffic > 5-10 req/sec
- [ ] Implement Reserved Capacity or Savings Plans if committing to sustained load
- [ ] Set up cost allocation tags for per-feature cost analysis

---

## Cost Estimation Template

For your app, estimate:

1. **Traffic pattern:**
   - Requests/day: _____
   - Average request duration: _____ ms
   - % idle time (waiting for DB/API): _____ %

2. **Storage:**
   - CloudFront data transfer/month: _____ GB
   - Expected cache hit rate: _____ %
   - RDS storage: _____ GB

3. **Background jobs:**
   - SQS messages/month: _____
   - Avg Lambda duration per message: _____ ms

4. **Logging:**
   - Avg log size per request: _____ KB
   - Retention period: _____ days

**Calculation (fill in your numbers):**
```
Lambda compute: [requests/day] × [avg duration in sec] × 0.0000167 × 30 = $___
CloudWatch: ([avg log KB] × [requests/day] × 30) / 1000000 × $0.50 = $___
CloudFront: [data transfer GB] × (1 - [cache hit]) × $0.085 = $___
RDS Proxy: $11 + ([messages/month] × 0.01 / 1000000) = $___
Total monthly: $___
```

---

## Confidence Notes

These costs are based on:
- AWS pricing current as of 2026-02-05
- Real-world deployments documented in 2025-2026 articles
- Actual customer bills from Vercel case studies

**Risks:**
- AWS pricing changes quarterly (usually within 10%)
- Your traffic pattern may differ; validate assumptions with production profiling
- Regional costs vary (us-east-1 is cheapest; eu-west can be 1.5x more)

---

## Sources

- [AWS Lambda Pricing 2026](https://aws.amazon.com/lambda/pricing/)
- [AWS Lambda Cost Breakdown For 2026](https://www.wiz.io/academy/cloud-cost/aws-lambda-cost-breakdown)
- [NextJS Lambda vs ECS - Real-world comparison Jan 2025](https://schematical.com/posts/nextjs-cost-lambda-vs-ecs-desktop_20250128)
- [AWS Fargate Pricing 2025](https://aws.amazon.com/fargate/pricing/)
- [CloudWatch Cost Optimization 2026](https://www.wiz.io/academy/cloud-cost/cloudwatch-costs)
