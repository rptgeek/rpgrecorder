# Architecture Research: DynamoDB Single-Table Design

**Project:** RPG Campaign Manager (Serverless Migration)
**Researched:** 2026-02-06
**Confidence:** HIGH (AWS official docs + verified patterns)

## Overview

This document provides the architecture for migrating from PostgreSQL relational model to DynamoDB single-table design. The existing data hierarchy (Users → Campaigns → Sessions → Summaries) will be redesigned to optimize for serverless access patterns with Lambda/API Gateway.

---

## Current PostgreSQL Model vs Target DynamoDB Model

### Current Relational Structure

```
User (id, email, name, password)
  ├─ Campaigns (id, userId, name, description)
  │   └─ Sessions (id, campaignId, userId, name, transcriptText, audioUrl, status)
  │       └─ Summaries (id, sessionId, content, type: GM/PLAYER)
```

### Target DynamoDB Single-Table Structure

```
rpg_sessions (single table)
├─ User items (PK: USER#<userId>, SK: METADATA#<userId>)
├─ Campaign items (PK: USER#<userId>, SK: CAMPAIGN#<campaignId>)
├─ Session items (PK: USER#<userId>, SK: CAMPAIGN#<campaignId>#SESSION#<sessionId>)
├─ Transcript items (PK: USER#<userId>, SK: CAMPAIGN#<campaignId>#SESSION#<sessionId>#TRANSCRIPT)
└─ Summary items (PK: USER#<userId>, SK: CAMPAIGN#<campaignId>#SESSION#<sessionId>#SUMMARY#<type>)
```

**Rationale:** Single table reduces management overhead, enables efficient queries at any hierarchy level using composite sort keys with `begins_with()`, and minimizes costs for intermittent workloads by consolidating reads.

---

## Table Design

### Primary Key Strategy

#### Partition Key (PK)

```
PK: "USER#<cognito-sub>"
```

**Why:**
- Cognito `sub` claim uniquely identifies users and is stable across sessions
- All user data collocated on same partition for efficient queries
- Enables Cognito IAM policies with `LeadingKeys` condition for item-level access control
- Simplifies testing (predictable key format)

#### Sort Key (SK) — Composite Hierarchy

```
SK Format: "<ENTITY_TYPE>#<parent_id>#<parent_id>#<child_id>#<optional_type>"

Examples:
- METADATA#<userId>                                           [User metadata]
- CAMPAIGN#<campaignId>                                       [Campaign]
- CAMPAIGN#<campaignId>#SESSION#<sessionId>                   [Session]
- CAMPAIGN#<campaignId>#SESSION#<sessionId>#TRANSCRIPT        [Transcript pointer]
- CAMPAIGN#<campaignId>#SESSION#<sessionId>#SUMMARY#GM        [GM summary]
- CAMPAIGN#<campaignId>#SESSION#<sessionId>#SUMMARY#PLAYER    [Player summary]
```

**Why composite sort keys:**
- Hierarchical traversal: `begins_with("CAMPAIGN#")` returns all campaigns for user
- Efficient range queries: `begins_with("CAMPAIGN#<id>#SESSION#")` returns all sessions for campaign
- Single query retrieves related entities (e.g., session + transcripts together)
- Predictable ordering by creation/modification time (add YYYYMMDD prefix if needed)

### GSI Strategy

#### GSI1 — Search by Campaign Name (Optional Enhancement)

```
GSI1PK: "CAMPAIGN#<campaignName>"
GSI1SK: "USER#<userId>"
```

**When to use:** If campaign name search is high-frequency access pattern
**Cost:** +2 RCU per write for index maintenance
**Alternative:** Scan with FilterExpression (acceptable for <50 campaigns per user)

#### GSI2 — Search by Session Status (Optional Enhancement)

```
GSI2PK: "SESSION#<status>"
GSI2SK: "USER#<userId>#<timestamp>"
```

**When to use:** If cross-user session filtering is needed (e.g., "show all active sessions")
**Cost:** +2 RCU per write
**Alternative:** Query user partition + FilterExpression

**Recommendation:** START WITHOUT GSIs. Add if bottlenecks appear. Single-table queries are sufficient for initial access patterns.

---

## Table Schema & Item Examples

### Item Structure

```typescript
// User metadata item
{
  PK: "USER#cognito-user-123",
  SK: "METADATA#cognito-user-123",
  entityType: "USER",
  email: "user@example.com",
  name: "Game Master",
  createdAt: "2026-02-06T10:30:00Z",
  updatedAt: "2026-02-06T10:30:00Z"
}

// Campaign item
{
  PK: "USER#cognito-user-123",
  SK: "CAMPAIGN#campaign-456",
  entityType: "CAMPAIGN",
  campaignId: "campaign-456",
  name: "Dragon's Lair Campaign",
  description: "A classic adventure",
  createdAt: "2026-02-06T10:35:00Z",
  updatedAt: "2026-02-06T10:35:00Z"
}

// Session item
{
  PK: "USER#cognito-user-123",
  SK: "CAMPAIGN#campaign-456#SESSION#session-789",
  entityType: "SESSION",
  campaignId: "campaign-456",
  sessionId: "session-789",
  name: "Chapter 1: The Tavern",
  description: "Session overview",
  audioStorageKey: "s3://bucket/sessions/session-789.wav",
  transcriptionJobId: "transcribe-job-123",
  status: "COMPLETED",
  shareToken: "share-token-xyz",
  createdAt: "2026-02-06T14:00:00Z",
  updatedAt: "2026-02-06T16:00:00Z"
}

// Transcript pointer item (separate from large text)
{
  PK: "USER#cognito-user-123",
  SK: "CAMPAIGN#campaign-456#SESSION#session-789#TRANSCRIPT",
  entityType: "TRANSCRIPT",
  sessionId: "session-789",
  s3Key: "s3://bucket/transcripts/session-789.txt",
  contentLength: 45000,
  transcriptJson: { /* structured dialogue */ },
  createdAt: "2026-02-06T16:05:00Z",
  updatedAt: "2026-02-06T16:05:00Z"
}

// Summary items (one per type)
{
  PK: "USER#cognito-user-123",
  SK: "CAMPAIGN#campaign-456#SESSION#session-789#SUMMARY#GM",
  entityType: "SUMMARY",
  sessionId: "session-789",
  type: "GM",
  content: "Session recap: party defeated goblin boss, found treasure...",
  createdAt: "2026-02-06T16:30:00Z",
  updatedAt: "2026-02-06T16:30:00Z"
}

{
  PK: "USER#cognito-user-123",
  SK: "CAMPAIGN#campaign-456#SESSION#session-789#SUMMARY#PLAYER",
  entityType: "SUMMARY",
  sessionId: "session-789",
  type: "PLAYER",
  content: "What the players will see...",
  createdAt: "2026-02-06T16:30:00Z",
  updatedAt: "2026-02-06T16:30:00Z"
}
```

---

## Access Patterns & Query Implementation

### Access Pattern 1: Get User Profile

**Query:** User logs in via Cognito, fetch user details

```typescript
const command = new GetCommand({
  TableName: 'rpg_sessions',
  Key: {
    PK: `USER#${cognitoSub}`,
    SK: `METADATA#${cognitoSub}`
  }
});

const response = await dynamodbClient.send(command);
// Cost: 1 RCU (eventually consistent)
```

### Access Pattern 2: Get All Campaigns for User

**Query:** User views campaigns list

```typescript
const command = new QueryCommand({
  TableName: 'rpg_sessions',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${cognitoSub}`,
    ':sk': 'CAMPAIGN#'
  }
});

const response = await dynamodbClient.send(command);
// Cost: RCUs proportional to campaigns returned
// If 5 campaigns, ~2.5 RCU (eventually consistent)
```

### Access Pattern 3: Get All Sessions for Campaign

**Query:** User views sessions in a campaign

```typescript
const command = new QueryCommand({
  TableName: 'rpg_sessions',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${cognitoSub}`,
    ':sk': `CAMPAIGN#${campaignId}#SESSION#`
  }
});

const response = await dynamodbClient.send(command);
// Cost: RCUs proportional to sessions returned
// If 20 sessions, ~10 RCU (eventually consistent)
```

### Access Pattern 4: Get Single Session with Transcript

**Query:** User opens a session, fetch session + transcript metadata

```typescript
// Query returns all items for this session hierarchy
const command = new QueryCommand({
  TableName: 'rpg_sessions',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${cognitoSub}`,
    ':sk': `CAMPAIGN#${campaignId}#SESSION#${sessionId}`
  }
});

const response = await dynamodbClient.send(command);
// Returns: [session item, transcript item, summary items]
// Cost: ~3-5 RCU depending on item sizes
```

### Access Pattern 5: Get Summaries for Session (GM + Player)

**Query:** Fetch both GM and player summaries for display

```typescript
const command = new QueryCommand({
  TableName: 'rpg_sessions',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${cognitoSub}`,
    ':sk': `CAMPAIGN#${campaignId}#SESSION#${sessionId}#SUMMARY#`
  }
});

const response = await dynamodbClient.send(command);
// Returns both SUMMARY#GM and SUMMARY#PLAYER items
// Cost: ~1-2 RCU
```

### Access Pattern 6: Search Sessions by Keyword

**Approach:** FilterExpression on session query (low-cardinality search acceptable)

**Option A: DynamoDB FilterExpression** (Acceptable for <50 sessions/campaign)

```typescript
const command = new QueryCommand({
  TableName: 'rpg_sessions',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  FilterExpression: 'contains(#name, :keyword) OR contains(#desc, :keyword)',
  ExpressionAttributeNames: {
    '#name': 'name',
    '#desc': 'description'
  },
  ExpressionAttributeValues: {
    ':pk': `USER#${cognitoSub}`,
    ':sk': `CAMPAIGN#${campaignId}#SESSION#`,
    ':keyword': searchTerm
  }
});

const response = await dynamodbClient.send(command);
// Cost: RCUs for ALL sessions scanned, not just returned
// E.g., 20 sessions scanned = ~10 RCU even if 2 match
```

**Option B: External Search Service** (Better for complex FTS)

For full-text search across transcripts (currently handled by PostgreSQL FTS):
- Use AWS OpenSearch with DynamoDB Streams for sync (near real-time)
- Or: Elasticsearch/Algolia for keyword indexing
- Cost: ~$40/month for OpenSearch minimal cluster

**Recommendation for MVP:** Use FilterExpression. Switch to OpenSearch if search latency becomes an issue.

---

## Item Size Management & Large Text Handling

### DynamoDB Item Size Limit: 400KB

Current data estimates:
- Session metadata: ~500 bytes
- Transcript text: 10K-100K characters (~10KB-100KB)
- Summary text: 1K-10K characters (~1KB-10KB)
- Audio metadata: ~200 bytes

**Total per session: ~12KB-112KB** — Well under 400KB limit for individual items.

### Strategy for Large Transcripts

Since transcripts can be 100KB+, store them strategically:

```typescript
// Option 1: Embed transcript metadata in session item
{
  PK: "USER#...",
  SK: "CAMPAIGN#...#SESSION#...",
  transcriptLength: 87000,
  transcriptS3Key: "s3://bucket/transcripts/session-123.txt",
  transcriptPreview: "First 500 chars of transcript..." // For UI preview
}

// Option 2: Separate transcript item (recommended)
{
  PK: "USER#...",
  SK: "CAMPAIGN#...#SESSION#...#TRANSCRIPT",
  s3Key: "s3://bucket/transcripts/session-123.txt",
  contentLength: 87000,
  createdAt: "2026-02-06T16:00:00Z"
}

// Full transcript fetched from S3:
const s3Response = await s3Client.send(
  new GetObjectCommand({
    Bucket: 'bucket',
    Key: 'transcripts/session-123.txt'
  })
);
```

**Why separate transcript items:**
- ✓ Keeps session item compact (<10KB)
- ✓ Transcript can be >400KB if needed (stored in S3)
- ✓ Querying sessions doesn't load full transcripts
- ✓ Natural split: DynamoDB for structure, S3 for content

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     API Clients (Web/Mobile)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/REST
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   API Gateway (HTTP)                         │
│  Routes: /api/campaigns, /api/sessions, /api/summaries      │
└────────────────────────┬────────────────────────────────────┘
                         │
                  Lambda (Node.js)
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    DynamoDB         S3 (Transcripts)  Cognito
  (Session Store)    (Large Text)      (Auth)

Single table:
- PK: USER#<sub>
- SK: Composite hierarchy
- Optional GSI for search
```

### Data Flow

**1. Read Campaign List:**
```
User → API Gateway → Lambda handler
  → DynamoDB Query(PK=user, SK begins_with CAMPAIGN#)
  → Return campaigns → Client
Cost: 1-2 RCU per campaign
```

**2. Create Session:**
```
Client uploads audio → S3
Audio processed → Lambda (Transcribe webhook)
Transcribe complete → Lambda writes to DynamoDB
  → Session item + Transcript metadata
  → Full transcript stored in S3
Cost: ~3-5 WCU
```

**3. Read Session with Transcript:**
```
User → API Gateway → Lambda
  → Query session (returns metadata)
  → Fetch transcript text from S3
  → Return combined data
Cost: 1 RCU + S3 GET ($0.0004)
```

---

## Architectural Patterns

### Pattern 1: Composite Sort Keys for Hierarchy

**What:** Use delimited sort keys to represent parent-child relationships

**When to use:**
- Data has natural hierarchy (User > Campaign > Session)
- Need to query at any level (all sessions in campaign, all campaigns for user)
- Want single table but avoid flat structure

**Trade-offs:**
- ✓ Single query retrieves related entities
- ✓ Natural ordering preserved
- ✓ No need for GSI if hierarchy is primary access pattern
- ✗ Sort key is opaque (requires documentation)
- ✗ Can't rename parent without cascading updates

**Example:**
```typescript
// Query all sessions in campaign
const params = {
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
  ExpressionAttributeValues: {
    ':pk': `USER#user-123`,
    ':skPrefix': `CAMPAIGN#campaign-456#SESSION#`
  }
};

// Also returns summaries, transcripts for those sessions
```

### Pattern 2: Entity Type Discrimination with SK

**What:** Use SK suffix to distinguish item types (SUMMARY#GM vs SUMMARY#PLAYER)

**When to use:**
- Multiple entity types stored in single partition
- Need to filter by type in single query

**Trade-offs:**
- ✓ Type information encoded in key, not separate attribute
- ✓ Efficient filtering with `begins_with()` or `between()`
- ✗ Requires parser to understand SK format

### Pattern 3: Denormalization for Frequently-Accessed Data

**What:** Store user metadata in every item's top-level attributes when frequently needed

**When to use:**
- Avoid N+1 queries
- Read pattern frequently accesses related data

**Trade-offs:**
- ✓ Single query returns everything needed
- ✓ No join-like operations needed
- ✗ Update anomalies if parent data changes
- ✗ Increased item size

**Example:**
```typescript
// Session item includes campaign name for display
{
  PK: "USER#...",
  SK: "CAMPAIGN#...#SESSION#...",
  campaignName: "Dragon's Lair", // Denormalized
  sessionName: "Chapter 1"
}
```

### Pattern 4: Pointer Pattern for Large Data

**What:** Store reference to S3 in DynamoDB, fetch content on demand

**When to use:**
- Data size varies (sometimes 1KB, sometimes 100KB)
- Not all reads need full content
- Cost-sensitive (S3 cheaper than frequent DynamoDB reads)

**Trade-offs:**
- ✓ DynamoDB items stay small
- ✓ Can exceed 400KB if in S3
- ✓ Better cost for intermittent access
- ✗ Extra round-trip to S3
- ✗ Consistency: S3 eventual consistency

---

## Lambda Integration Patterns

### Pattern: Query → Filter → Response

```typescript
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });

export async function getCampaigns(event: APIGatewayProxyEventV2) {
  const userId = event.requestContext.authorizer.claims.sub; // From Cognito

  try {
    const command = new QueryCommand({
      TableName: process.env.TABLE_NAME!,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `USER#${userId}` },
        ':sk': { S: 'CAMPAIGN#' }
      }
    });

    const response = await dynamodb.send(command);
    const campaigns = response.Items?.map(item => unmarshall(item)) || [];

    return {
      statusCode: 200,
      body: JSON.stringify(campaigns)
    };
  } catch (error) {
    console.error('DynamoDB error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch campaigns' })
    };
  }
}
```

---

## Cost Optimization Strategies

### 1. On-Demand Capacity Mode (Recommended for MVP)

```
Pricing model: Pay-per-request
- Read: $1.25 per million RCU
- Write: $6.25 per million WCU

Suitable for:
- Intermittent workload (1-10 users)
- Unpredictable traffic
- Cost-sensitive
```

**Why:** Your workload (small user base, occasional sessions) is perfect for on-demand. No idle capacity charges.

**Estimate:**
- 5 users, 2 sessions/week per user
- 10 RCU per session query (campaign list + session list)
- ~100 RCU/week = ~0.43M RCU/year
- Cost: ~$0.54/year for reads alone

### 2. Provisioned Capacity Mode (Switch if usage grows)

```
Pricing model: Reserved capacity + auto-scaling
- WCU: $0.00013 per unit-hour
- RCU: $0.000026 per unit-hour

Suitable for:
- Steady, predictable workload
- Utilization >50% of provisioned capacity
```

**Switching point:** When monthly AWS bill >$5 and usage is consistent

### 3. Cost Reduction Tactics

**A. Query > Scan**
- ✓ Query: 10 RCU for 20 sessions (1-2 per item)
- ✗ Scan: 200 RCU for 20 sessions (10 per item read)

**B. Avoid Expensive Filters**
- Queries with FilterExpression still consume RCUs for scanned items
- Instead: Design access patterns to avoid scanning

**C. Use Eventually Consistent Reads**
- Default query is strongly consistent (1 RCU per 4KB)
- Eventually consistent: 1 RCU per 8KB (50% cost)
- Acceptable for campaign/session lists

**D. Batch Operations**
```typescript
// Instead of individual GetItem calls:
const batchCommand = new BatchGetCommand({
  RequestItems: {
    [tableName]: {
      Keys: sessionIds.map(id => ({
        PK: { S: `USER#${userId}` },
        SK: { S: `CAMPAIGN#${campaignId}#SESSION#${id}` }
      }))
    }
  }
});
// Reduces RCU cost by ~50% for multiple items
```

---

## Migration Strategy from PostgreSQL

### Phase 1: Design Validation (Week 1)

1. Map all PostgreSQL queries to DynamoDB access patterns
2. Validate single-table schema supports all queries
3. Identify transformation rules for data

### Phase 2: Data Transformation (Week 2-3)

**Approach: AWS Lambda + Node.js for one-time migration**

```typescript
import { PrismaClient } from '@prisma/client';
import { DynamoDBClient, PutCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const prisma = new PrismaClient();
const dynamodb = new DynamoDBClient({ region: 'us-east-1' });

async function migrateData() {
  const users = await prisma.user.findMany({ include: { campaigns: { include: { sessions: true } } } });

  for (const user of users) {
    // Write user metadata
    await dynamodb.send(new PutCommand({
      TableName: 'rpg_sessions',
      Item: marshall({
        PK: `USER#${user.id}`,
        SK: `METADATA#${user.id}`,
        entityType: 'USER',
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      })
    }));

    // Write campaigns
    for (const campaign of user.campaigns) {
      await dynamodb.send(new PutCommand({
        TableName: 'rpg_sessions',
        Item: marshall({
          PK: `USER#${user.id}`,
          SK: `CAMPAIGN#${campaign.id}`,
          entityType: 'CAMPAIGN',
          campaignId: campaign.id,
          name: campaign.name,
          description: campaign.description,
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString()
        })
      }));

      // Write sessions
      for (const session of campaign.sessions) {
        // Session item
        await dynamodb.send(new PutCommand({
          TableName: 'rpg_sessions',
          Item: marshall({
            PK: `USER#${user.id}`,
            SK: `CAMPAIGN#${campaign.id}#SESSION#${session.id}`,
            entityType: 'SESSION',
            sessionId: session.id,
            campaignId: campaign.id,
            name: session.name,
            description: session.description,
            audioStorageKey: session.audioStorageKey,
            transcriptionJobId: session.transcriptionJobId,
            status: session.status,
            shareToken: session.shareToken,
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString()
          })
        }));

        // Transcript (if exists, store reference)
        if (session.transcriptText) {
          const s3Key = `transcripts/${session.id}.txt`;
          // Upload to S3
          await s3.putObject({
            Bucket: process.env.TRANSCRIPT_BUCKET!,
            Key: s3Key,
            Body: session.transcriptText
          });

          // Write DynamoDB pointer
          await dynamodb.send(new PutCommand({
            TableName: 'rpg_sessions',
            Item: marshall({
              PK: `USER#${user.id}`,
              SK: `CAMPAIGN#${campaign.id}#SESSION#${session.id}#TRANSCRIPT`,
              entityType: 'TRANSCRIPT',
              s3Key: s3Key,
              contentLength: session.transcriptText.length,
              createdAt: session.createdAt.toISOString()
            })
          }));
        }
      }
    }
  }

  await prisma.$disconnect();
}

migrateData().catch(console.error);
```

### Phase 3: Dual-Write Testing (Week 3-4)

```typescript
// In application code during transition:
async function createSession(data: SessionData) {
  // Write to both databases
  const pgResult = await prisma.session.create({ data });
  const dbResult = await dynamodb.send(new PutCommand({ /* DynamoDB item */ }));

  return pgResult; // Still return from PostgreSQL
}
```

### Phase 4: Validation & Cutover (Week 4-5)

1. Run read-side migration: Switch queries to DynamoDB
2. Validate data consistency
3. Flip writes to DynamoDB only
4. Monitor for 1 week
5. Decommission PostgreSQL

---

## Cognito Integration

### Authentication Flow

```
1. User logs in via Cognito UI/API
   → Cognito returns ID token with "sub" claim

2. Lambda authorizer extracts sub from ID token
   → Sets context.authorizer.claims.sub

3. Handler uses sub as partition key:
   PK = `USER#${context.authorizer.claims.sub}`

4. DynamoDB query scoped to user's partition
   → No data leakage between users
```

### IAM Policy with Fine-Grained Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/rpg_sessions",
      "Condition": {
        "StringEquals": {
          "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
        }
      }
    }
  ]
}
```

This ensures Lambda can only access items where `PK` matches the Cognito sub value.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Querying Across Users

**What people do:**
```typescript
// DON'T: Scan entire table to find sessions across all users
const result = await dynamodb.send(new ScanCommand({
  TableName: 'rpg_sessions',
  FilterExpression: 'entityType = :type',
  ExpressionAttributeValues: { ':type': { S: 'SESSION' } }
}));
// Cost: Reads EVERY item in table, massive RCU bill!
```

**Why it's wrong:**
- Scan reads entire table regardless of filter
- Cost scales with total table size, not results
- No security boundary (violates Cognito access patterns)

**Do this instead:**
- Design GSI with `entityType` as partition key if cross-user queries needed
- Or accept that each user queries only their own data

### Anti-Pattern 2: Storing Transcripts Inline

**What people do:**
```typescript
{
  PK: "USER#...",
  SK: "CAMPAIGN#...#SESSION#...",
  transcriptText: "100KB of dialogue..." // Could exceed 400KB total
}
```

**Why it's wrong:**
- Item size rapidly exceeds 400KB
- Every session query loads unused transcript
- Wastes RCU on large items

**Do this instead:**
```typescript
// Separate transcript item with S3 pointer
{
  PK: "USER#...",
  SK: "CAMPAIGN#...#SESSION#...#TRANSCRIPT",
  s3Key: "s3://bucket/transcripts/session-123.txt",
  contentLength: 87000
}
```

### Anti-Pattern 3: Overloading Sort Key Without Documentation

**What people do:**
```typescript
// Cryptic sort key without clear pattern
SK: "data:type:id:subtype"  // What does this mean?
```

**Why it's wrong:**
- Team can't maintain code
- Easy to create incorrect queries
- Leads to bugs and inconsistency

**Do this instead:**
```typescript
// Self-documenting format
SK: "CAMPAIGN#<campaignId>#SESSION#<sessionId>#SUMMARY#<type>"
// Immediately clear: parent type, IDs at each level, entity type
```

### Anti-Pattern 4: Missing Strongly Consistent Reads When Needed

**What people do:**
```typescript
// Write a session, immediately query it
await dynamodb.send(new PutCommand({ /* session */ }));
const session = await dynamodb.send(new QueryCommand({
  ConsistentRead: false // Eventually consistent
}));
// Might not see just-written data!
```

**Why it's wrong:**
- Eventual consistency can cause visibility delays
- User creates session, doesn't see it immediately (confusing)

**Do this instead:**
```typescript
// First read after write should be strongly consistent
const session = await dynamodb.send(new QueryCommand({
  ConsistentRead: true // 2x RCU cost, but guaranteed read
}));
```

---

## Scaling Considerations

| Scale | Architecture Approach | Optimization |
|-------|----------------------|---------------|
| **0-10 users** | Single-table DynamoDB, on-demand capacity, no GSI | Focus: Cost minimize |
| **10-100 users** | Add optional GSI for campaign search if needed | Focus: Query efficiency |
| **100-1000 users** | Consider provisioned capacity mode, monitor partition hot spots | Focus: Throughput |
| **1000+ users** | Shard by region or time-period, split into multi-table architecture | Focus: Scalability |

### Scaling Bottlenecks (In Order)

**1. First bottleneck: Partition hot spot**
- One user is power user with 1000+ sessions
- Their PK `USER#user-123` becomes hot partition
- Solution: DynamoDB auto-scaling, or read from GSI

**2. Second bottleneck: Query complexity**
- Cross-campaign search becomes expensive
- Solutions: Add GSI, or move to OpenSearch

**3. Third bottleneck: Item size**
- Denormalization makes items large (>100KB)
- Solution: Split into multiple items or use S3 pointers

---

## Integration Points

### External Services

| Service | Integration | Notes |
|---------|-------------|-------|
| **Cognito** | JWT validation in API Gateway authorizer | Sub claim → PK partition |
| **S3** | Store transcripts, audio files | Point to S3 from DynamoDB |
| **Transcribe** | Webhook on transcription complete | Write session metadata to DynamoDB |
| **Lambda** | Handler for all CRUD operations | Use AWS SDK v3 @aws-sdk/client-dynamodb |
| **API Gateway** | Route requests to Lambda handlers | HTTP API (lighter than REST API) |
| **OpenSearch** (Optional) | Full-text search via DynamoDB Streams | Zero-ETL integration for sync |

### Internal Module Boundaries

| Boundary | Communication | Considerations |
|----------|---------------|-----------------|
| API Gateway ↔ Lambda | HTTP events | Authorizer extracts Cognito sub |
| Lambda ↔ DynamoDB | SDK queries | Use QueryCommand not ScanCommand |
| Lambda ↔ S3 | SDK PutObject/GetObject | Transcripts stored as-is |
| DynamoDB Streams → OpenSearch | Event processing | Optional: for full-text search |

---

## Key Decisions & Rationale

| Decision | Chosen | Alternative | Why |
|----------|--------|-------------|-----|
| **Capacity Mode** | On-demand | Provisioned | Intermittent workload, cost-sensitive MVP |
| **Table Count** | 1 | Multi-table | Single query for hierarchy, less management |
| **Transcript Storage** | S3 + pointer | Inline in DynamoDB | Supports large files, cost-effective |
| **Sort Key Format** | Composite with delimiters | Flat with separate attributes | Enables hierarchy queries, compact keys |
| **Search** | FilterExpression | OpenSearch | Acceptable for <50 items, simpler MVP |
| **User Partitioning** | Cognito sub → PK | Email or UUID | Sub is stable, enables fine-grained IAM |

---

## Confidence Levels

| Area | Confidence | Notes |
|------|------------|-------|
| **Table Design** | HIGH | AWS official patterns, verified with documentation |
| **Access Patterns** | HIGH | Composite SK approach is standard DynamoDB pattern |
| **Cost Optimization** | HIGH | On-demand vs provisioned tradeoffs well-documented |
| **Migration Strategy** | MEDIUM | Dual-write approach works, but not tested against full schema |
| **Search Replacement** | MEDIUM | FilterExpression is viable, but may need OpenSearch later |
| **Scaling to 1000+ users** | MEDIUM | Partition hot spots not tested; may need sharding |

---

## Sources

- [AWS DynamoDB Data Modeling Foundations](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-foundations.html)
- [How to model one-to-many relationships in DynamoDB — Alex DeBrie](https://www.alexdebrie.com/posts/dynamodb-one-to-many/)
- [The What, Why, and When of Single-Table Design with DynamoDB — Alex DeBrie](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [Best Practices for Secondary Indexes with DynamoDB — Trek10](https://www.trek10.com/blog/best-practices-for-secondary-indexes-with-dynamodb)
- [DynamoDB Limits: The Three You Need to Know — Alex DeBrie](https://www.alexdebrie.com/posts/dynamodb-limits/)
- [Demystifying Amazon DynamoDB On-Demand Capacity Mode — AWS Blog](https://aws.amazon.com/blogs/database/demystifying-amazon-dynamodb-on-demand-capacity-mode/)
- [DynamoDB Query vs Scan — Dynobase](https://dynobase.dev/dynamodb-scan-vs-query/)
- [Using Cognito User ID for Item-Level Access Control — ArPadt](https://arpadt.com/articles/item-level-control-with-sub)
- [Building Fine-Grained Authorization Using Amazon Cognito User Pools Groups — AWS Blog](https://aws.amazon.com/blogs/mobile/building-fine-grained-authorization-using-amazon-cognito-user-pools-groups/)
- [Adding Full-Text Search to DynamoDB With Streams and Algolia — Uriel Bitton](https://medium.com/tech-odyssey/adding-full-text-search-to-dynamodb-with-streams-and-algolia-77c76a8efd27)
- [Migrating from PostgreSQL to DynamoDB — Krishan Babbar](https://medium.com/ssense-tech/migrating-from-postgresql-to-dynamodb-f27d0f220908)
- [Build CRUD RESTful Microservices with Lambda, API Gateway, DynamoDB (AWS SDK v3) — Mehmet Ozkaya](https://medium.com/aws-lambda-serverless-developer-guide-with-hands/build-crud-restful-microservices-with-aws-lambda-api-gateway-dynamodb-with-aws-sdk-js-v3-408fa2f85048)

---

*Architecture research for: DynamoDB Single-Table Migration*
*Researched: 2026-02-06*
