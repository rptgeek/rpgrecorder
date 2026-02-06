# AWS Deployment Research Index

**Milestone:** First-time AWS production deployment of Next.js application
**Researched:** 2026-02-05
**Overall Confidence:** HIGH (cost and infrastructure); MEDIUM-HIGH (security)

---

## File Guide

### 1. PITFALLS-AWS-DEPLOYMENT.md (739 lines)
**What:** Comprehensive catalog of 18 pitfalls organized by severity (critical, major, moderate, minor) plus security-specific pitfalls.

**When to read:**
- Phase 0: Read to understand what you need to prevent
- Phase 1+: Reference when debugging unexpected behavior

**Key sections:**
- **Critical Pitfalls:** Mistakes that cause rewrites or major outages
  - Lambda cold starts cascading
  - RDS connection pool exhaustion
  - Unbounded Lambda costs from idle time
  - CloudFormation dependency hell
- **Major Pitfalls:** Significant delays, technical debt
  - Image cache-control header trap
  - SQS visibility timeout misalignment
  - Secrets management failures
  - CloudWatch log cost explosion
- **Security Pitfalls:** S3 public access, overly permissive IAM, React2Shell vulnerability

**How to use:** Each pitfall includes:
- What goes wrong + Why
- Consequences + Detection signals
- Prevention strategy + Cost impact
- Which phase should address it

**Example:** Pitfall 3 (Unbounded Lambda Costs)
- Documents the real case where a bill jumped from $300 → $3,550/month
- Explains that idle time (waiting for DB responses) burns cost
- Provides specific prevention strategies (X-Ray profiling, batching, Step Functions)
- Estimates 75% cost savings possible through optimization

---

### 2. AWS-DEPLOYMENT-RESEARCH-SUMMARY.md (254 lines)
**What:** Executive summary + roadmap implications + phase-specific warnings.

**When to read:**
- Start here if you're new to the research
- Phase 0: To understand recommended architecture
- Roadmap creation: To inform phase structure

**Key sections:**
- **Executive Summary:** 3-paragraph overview of critical findings
- **Key Findings:** Quick reference
- **Roadmap Implications:** Recommended 4-phase structure:
  - Phase 0: Pre-Deployment Validation (NEW)
  - Phase 1: Core Infrastructure & Foundation
  - Phase 2: Performance & Cost Optimization
  - Phase 3: Scaling & Reliability
- **Phase Ordering Rationale:** Why this order prevents disasters
- **Research Flags for Phases:** What to validate before proceeding to next phase
- **Confidence Assessment:** How certain we are about each area

**How to use:**
- As roadmap foundation; phases align with pitfall prevention
- Phase 0 is critical—don't skip it; it unblocks everything else
- Track the "Key Metrics to Track" section from day one

**Example:** Phase 0 activities
- Measure cold start time (typical 1-3s for Next.js)
- Profile idle time (if >50%, costs will spike)
- Deploy RDS Proxy (prevents connection exhaustion)
- Set up cost alerts (prevent surprise bills)
- Enforce build size budget (<100MB unzipped)

---

### 3. AWS-DEPLOYMENT-COST-ANALYSIS.md (430+ lines)
**What:** Detailed cost breakdown, real-world scenarios, and cost optimization checklist.

**When to read:**
- Phase 0: To estimate if Lambda vs ECS is right choice
- Phase 2: To optimize after baseline costs are known
- Budget planning: To forecast spending

**Key sections:**
- **Lambda Cost Breakdown:** Base pricing + 5 hidden costs that surprise teams
  1. Idle-time burn (largest hidden cost—can be 75% of bill)
  2. INIT phase billing (added Aug 2025)
  3. CloudWatch logs (30-50% of Lambda costs at scale)
  4. Data transfer costs (CloudFront misses)
  5. API Gateway costs
- **ECS Cost Breakdown:** Fixed costs, when ECS is cheaper
  - Breakeven: ~5M requests/month or 5-10 req/sec sustained
- **Real-World Scenarios:**
  - Scenario 1: Small blog (~$8.60/month Lambda vs $36 ECS)
  - Scenario 2: SaaS app ($217-643/month depending on optimization)
  - Scenario 3: Traffic spike ($275 Lambda vs $1,101 ECS if pre-provisioned)
- **Cost Optimization Checklist:** Prioritized by phase
- **Cost Estimation Template:** Fill-in-the-blanks calculator

**How to use:**
- Estimate your costs before committing to architecture
- Use Scenario 2 as most similar to your use case (database + API)
- Run the Cost Estimation Template with your traffic assumptions
- Reference "Idle-Time Burn" section if bill jumps unexpectedly

**Example:** Cost comparison
- Unoptimized Lambda with 1.5s idle time: $643/month
- Optimized Lambda with 0.5s duration: $217/month (66% savings)
- ECS with fixed overhead: $66/month (but less scaling flexibility)

---

## Quick Reference by Use Case

### "We want to minimize costs"
Read in order:
1. AWS-DEPLOYMENT-RESEARCH-SUMMARY.md → Key Findings section
2. AWS-DEPLOYMENT-COST-ANALYSIS.md → Real-World Scenarios (Scenario 2)
3. PITFALLS-AWS-DEPLOYMENT.md → Pitfall 3 (Unbounded Lambda Costs)
4. AWS-DEPLOYMENT-COST-ANALYSIS.md → Cost Optimization Checklist

### "We're deploying in the next 2 weeks"
Read in order:
1. AWS-DEPLOYMENT-RESEARCH-SUMMARY.md → Implications for Roadmap (Phase 0)
2. PITFALLS-AWS-DEPLOYMENT.md → Critical Pitfalls (4 sections)
3. AWS-DEPLOYMENT-RESEARCH-SUMMARY.md → Open Questions for Phase-Specific Research

### "We hit a problem in production"
1. PITFALLS-AWS-DEPLOYMENT.md → Search for your symptom (e.g., "cold start", "connection", "cost")
2. Each pitfall has "Detection" section to confirm it's your issue
3. Each pitfall has "Prevention" section to fix going forward
4. Use AWS-DEPLOYMENT-COST-ANALYSIS.md if cost-related

### "We're planning the roadmap"
1. AWS-DEPLOYMENT-RESEARCH-SUMMARY.md → Implications for Roadmap section
2. AWS-DEPLOYMENT-RESEARCH-SUMMARY.md → Phase-Specific Warnings table
3. PITFALLS-AWS-DEPLOYMENT.md → Phase-Specific Warnings table (at end)
4. Cross-reference to ensure all critical pitfalls are addressed in appropriate phase

---

## Key Findings Summary

### Most Costly Mistakes (in priority order)
1. **Unbounded idle-time burn** - 75% cost reduction possible through profiling and optimization
2. **RDS connection exhaustion** - Hard blocker; must deploy RDS Proxy before production
3. **No cold start mitigation** - 1-3 second user-visible delays; requires provisioned concurrency or ECS
4. **CloudWatch log explosion** - Can be 30-50% of Lambda costs; set retention from day one
5. **Missing CloudFront caching** - 7x cost difference between cached and uncached image delivery

### Most Impactful Prevention (do in Phase 0)
1. **Measure cold start** (<2 seconds acceptable; >3 seconds = reconsider architecture)
2. **Profile idle time** (if >50%, you'll overspend; optimize before launch)
3. **Deploy RDS Proxy** (eliminates connection exhaustion risk)
4. **Set cost alerts** (prevent surprise bills)
5. **Enforce build size** (<100MB unzipped limit)

### Critical Security Issues
1. **React Server Components vulnerability** (CVE-2025-55182) - Keep Next.js patched
2. **S3 public access** - Enforce block-public-access from day one in CDK
3. **Secrets in environment variables** - Use Secrets Manager, not .env files
4. **Overly permissive IAM** - Implement least-privilege from day one

---

## Research Confidence by Topic

| Topic | Confidence | Best Source | Risk |
|---|---|---|---|
| Lambda cost pitfalls | HIGH | AWS-DEPLOYMENT-COST-ANALYSIS.md | Pricing may change quarterly |
| RDS connection pooling | HIGH | PITFALLS-AWS-DEPLOYMENT.md Pitfall 2 | Pattern well-established |
| Cold starts | HIGH | AWS-DEPLOYMENT-RESEARCH-SUMMARY.md Phase 0 | Depends on your bundle size |
| Infrastructure patterns | HIGH | PITFALLS-AWS-DEPLOYMENT.md Pitfall 4 | Standard CDK practice |
| Image caching | MEDIUM-HIGH | PITFALLS-AWS-DEPLOYMENT.md Pitfall 5 | Configuration-dependent |
| SQS/Lambda timing | HIGH | PITFALLS-AWS-DEPLOYMENT.md Pitfall 6 | Math is deterministic |
| Security vulnerabilities | MEDIUM-HIGH | PITFALLS-AWS-DEPLOYMENT.md Pitfall 18 | Landscape rapidly evolving |
| Cost breakeven (ECS vs Lambda) | MEDIUM | AWS-DEPLOYMENT-COST-ANALYSIS.md Scenarios | Depends on your traffic pattern |

---

## Integration with Roadmap

This research directly informs roadmap phases:

```
Phase 0: Pre-Deployment Validation
├── Validate all 5 critical pitfalls addressed
├── Measure against Real-World Scenarios
└── Confirm cost estimates

Phase 1: Core Infrastructure & Foundation
├── Prevent Pitfalls 4, 8, 9, 17, 18
├── Use PITFALLS-AWS-DEPLOYMENT.md Pitfall sections
└── Track metrics from SUMMARY.md

Phase 2: Performance & Cost Optimization
├── Address Pitfalls 1, 3, 5, 6, 11, 12
├── Use AWS-DEPLOYMENT-COST-ANALYSIS.md Optimization Checklist
└── Profile against real traffic

Phase 3: Scaling & Reliability
├── Address Pitfalls 10, 13, 14
├── Cross-reference PITFALLS-AWS-DEPLOYMENT.md Phase-Specific Warnings
└── Plan for scale
```

---

## How to Use This Research

1. **First time?** Start with AWS-DEPLOYMENT-RESEARCH-SUMMARY.md "Executive Summary"
2. **Planning phases?** Go to "Implications for Roadmap" in SUMMARY
3. **Building Phase 0?** Reference the Phase 0 section in SUMMARY + Pitfall prevention strategies
4. **Optimizing costs?** Use AWS-DEPLOYMENT-COST-ANALYSIS.md to estimate and identify savings
5. **Debugging production issue?** Search PITFALLS-AWS-DEPLOYMENT.md for symptom

---

## What's NOT Covered

- **Specific AWS service setup** (how to create RDS Proxy, configure CloudFormation, etc.) - See AWS documentation
- **Next.js framework tuning** (SSG vs SSR, incremental static regeneration) - See Next.js documentation
- **Alternative platforms** (Vercel, Netlify, Heroku) - This research is AWS-specific
- **Multi-region deployment** - Focuses on single-region first deployment
- **Container image optimization** (for ECS path) - General AWS documentation covers this

---

## Document Versions

| File | Lines | Last Updated | Confidence |
|---|---|---|---|
| PITFALLS-AWS-DEPLOYMENT.md | 739 | 2026-02-05 | HIGH |
| AWS-DEPLOYMENT-RESEARCH-SUMMARY.md | 254 | 2026-02-05 | HIGH |
| AWS-DEPLOYMENT-COST-ANALYSIS.md | 430+ | 2026-02-05 | HIGH |
| AWS-DEPLOYMENT-INDEX.md (this file) | 280+ | 2026-02-05 | HIGH |

**Total research:** 1,700+ lines of documentation, 18 detailed pitfalls, 3 real-world cost scenarios, 4-phase roadmap framework

---

## Questions This Research Answers

- [x] What are the top mistakes when deploying Next.js to AWS for the first time?
- [x] How much will this cost? (With real scenarios and optimizations)
- [x] What can go catastrophically wrong? (Critical pitfalls section)
- [x] How do we prevent these mistakes? (Pitfall prevention strategies)
- [x] Should we use Lambda or ECS? (Cost analysis with breakeven analysis)
- [x] What should be in Phase 0? (Pre-deployment validation checklist)
- [x] How do we detect if we're making these mistakes? (Detection signals in each pitfall)
- [x] How much can we save through optimization? (Real examples: 66-75% savings)
- [x] What security issues are we vulnerable to? (Security pitfalls section)
- [x] How should this research inform the roadmap? (Phase structure and ordering)

---

## Next Steps

1. **Read the SUMMARY:** Get the 10-minute overview
2. **Run the Cost Analysis:** Estimate your expected costs using the template
3. **Plan Phase 0:** Use the Phase 0 section from SUMMARY to build validation plan
4. **Reference During Build:** Use PITFALLS-AWS-DEPLOYMENT.md as checklist during development
5. **Optimize in Phase 2:** Return to AWS-DEPLOYMENT-COST-ANALYSIS.md Cost Optimization Checklist

---

**Total research effort:** 4 days of investigation, 15+ authoritative sources, focus on cost-optimized, first-time AWS deployment of Next.js applications
