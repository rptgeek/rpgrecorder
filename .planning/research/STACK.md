# Technology Stack: DynamoDB Single-Table Design

**Project:** RPG Campaign Manager (Serverless Migration)
**Researched:** 2026-02-06

---

## Recommended Stack

### Core Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Amazon DynamoDB** | Current | Primary data store (single-table design) | Native AWS service, scales infinitely, pay-per-request for intermittent workloads. On-demand capacity mode is ideal for MVP cost minimization. |
| **AWS S3** | Current | Large text storage (transcripts, audio) | Pointer-based architecture keeps DynamoDB items compact (<50KB). S3 pricing ($0.023/GB) cheaper than DynamoDB for large infrequent reads. |

### Application Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **AWS Lambda** | Node.js 20.x | API handlers | Serverless compute, no cold start issues for infrequent workload, integrates natively with DynamoDB & API Gateway. |
| **Node.js** | 20.x LTS | Runtime | Current LTS version, excellent AWS SDK v3 support. |
| **API Gateway (HTTP)** | Current | REST API routing | HTTP API (not REST API) is lighter-weight, cheaper, sufficient for this project. |

### AWS SDKs

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@aws-sdk/client-dynamodb** | v3.x | DynamoDB queries | All database access from Lambda handlers. Use `QueryCommand` not `ScanCommand`. |
| **@aws-sdk/util-dynamodb** | v3.x | Item marshalling | Convert between JavaScript objects and DynamoDB AttributeValue format. |
| **@aws-sdk/client-s3** | v3.x | S3 operations | Upload/download transcripts, audio files. Use `PutObjectCommand` and `GetObjectCommand`. |

### Infrastructure as Code

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **AWS CDK** | v2.x | Infrastructure definition | Already in use for this project. Define DynamoDB table, Lambda functions, API Gateway in TypeScript. |

---

## Alternatives Considered

### Database

| Option | Recommended | Alternative | Why Not |
|--------|-------------|-------------|---------|
| **DynamoDB** | ✓ Yes | MongoDB | DynamoDB is AWS-native, pay-per-request ideal for intermittent workload. MongoDB requires always-on infrastructure. |
| **DynamoDB** | ✓ Yes | Keep PostgreSQL | RDS $30/month baseline for small workload. DynamoDB on-demand costs $0.54/year. Serverless eliminates management. |
| **Single-table** | ✓ Yes | Multi-table | Single-table design is simpler for small team, cleaner hierarchy queries, better data locality. |

### Search Implementation

| Option | For MVP | Why |
|--------|---------|------|
| **FilterExpression** | ✓ Yes | Acceptable cost/latency for <50 sessions/campaign. Upgrade to OpenSearch at scale. |
| **OpenSearch** | ✗ No (later) | Full-text search with typo tolerance. Costs $40/month. Worth it at 1000+ sessions. |

---

## Cost Optimization

### On-Demand Capacity Mode (Recommended for MVP)
```
- Reads: $1.25 per million RCU
- Writes: $6.25 per million WCU
- Perfect for intermittent workload
- Estimated annual cost for 1-10 users: ~$2/year
```

### Key Cost Reduction Tactics

1. **Use Eventually Consistent Reads** — 50% cheaper than strongly consistent
2. **Batch Operations** — 50% cost reduction for multiple items
3. **Query vs Scan** — Query costs RCU for items returned; Scan costs for all items scanned
4. **Store Large Data in S3** — S3 GET ($0.0004) cheaper than DynamoDB RCU for large items

---

## Sources

- [AWS DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)
- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)

---

*Technology Stack Research: DynamoDB Single-Table Migration*
*Researched: 2026-02-06*
