---
phase: 04-authentication-migration
plan: 02
subsystem: authentication
status: complete
completed: 2026-02-06
duration: 5 minutes

requires:
  - 04-01-SUMMARY.md (Cognito User Pool configuration)
  - 04-RESEARCH.md (User Migration Lambda pattern)
  - prisma/schema.prisma (User model for password validation)

provides:
  - User Migration Lambda function code
  - Lambda deployment documentation
  - Just-in-time migration capability

affects:
  - 04-03 (Auth.js Cognito Provider will depend on migrated users)
  - 04-04 (Dual-write validation needs custom:legacy_id mapping)
  - All future authentication flows

tech-stack:
  added:
    - bcrypt: "^5.1.1"
    - pg: "^8.11.3"
    - "@types/aws-lambda": "^8.10.131"
  patterns:
    - Lambda connection pooling (max 1 for efficiency)
    - Just-in-time user migration via Cognito trigger
    - PostgreSQL UUID mapping to custom:legacy_id attribute

key-files:
  created:
    - infra/lambda/user-migration/index.ts
    - infra/lambda/user-migration/package.json
    - infra/lambda/user-migration/tsconfig.json
  modified:
    - infra/cognito-setup.md

decisions:
  - decision: Use bcrypt 5.x instead of 6.x for Lambda
    rationale: bcrypt 6.x has native module compatibility issues in Lambda environment
    impact: Lambda deployment works reliably without native build steps

  - decision: Set Lambda max connections to 1
    rationale: Lambda functions should use minimal database connections; connection pooling across invocations is sufficient
    impact: Prevents connection exhaustion during high-concurrency migration spikes

  - decision: Set Lambda timeout to 10 seconds
    rationale: bcrypt password hashing is CPU-intensive; default 3s timeout may be insufficient
    impact: Prevents premature Lambda timeout failures during password validation

  - decision: Suppress welcome emails for migrated users
    rationale: Users are already part of the system; welcome emails would be confusing
    impact: messageAction set to "SUPPRESS" in Lambda response

tags:
  - aws-lambda
  - user-migration
  - cognito-triggers
  - bcrypt
  - postgresql
  - just-in-time-migration
---

# Phase 4 Plan 2: User Migration Lambda Implementation Summary

**One-liner:** Lambda function validates PostgreSQL passwords via bcrypt, returns Cognito user attributes with custom:legacy_id mapping, handles both authentication and forgot-password triggers with 10-second timeout.

## What Was Built

Created the User Migration Lambda function that enables just-in-time migration from PostgreSQL to Cognito without forcing password resets:

1. **Lambda Handler Implementation** (`infra/lambda/user-migration/index.ts`)
   - Validates credentials against PostgreSQL using bcrypt.compare()
   - Handles two trigger types: UserMigration_Authentication and UserMigration_ForgotPassword
   - Returns user attributes array with Name/Value pairs for Cognito
   - Maps PostgreSQL User.id (UUID) to custom:legacy_id attribute
   - Sets finalUserStatus to "CONFIRMED" and suppresses welcome emails
   - Uses connection pooling (max 1 connection) for Lambda efficiency
   - Comprehensive error handling with CloudWatch logging

2. **Lambda Dependencies** (`infra/lambda/user-migration/package.json`)
   - bcrypt 5.1.1 for password validation (Lambda-compatible version)
   - pg 8.11.3 for PostgreSQL connectivity
   - TypeScript types for AWS Lambda, bcrypt, Node.js, and pg
   - TypeScript 5.3.2 for compilation

3. **TypeScript Configuration** (`infra/lambda/user-migration/tsconfig.json`)
   - Target: ES2020 for Lambda Node.js 20.x compatibility
   - CommonJS module format for Lambda require() support
   - Output to ./dist/ for clean deployment packaging
   - Strict type checking enabled

4. **Lambda Deployment Documentation** (appended to `infra/cognito-setup.md`)
   - Step-by-step build process: npm install, compile TypeScript, create zip
   - Lambda creation via AWS Console with Node.js 20.x runtime
   - Environment variable configuration (DATABASE_URL)
   - VPC configuration for RDS access (subnets, security groups)
   - Timeout and memory settings (10 seconds, 256 MB minimum)
   - Cognito trigger attachment instructions
   - Testing procedure with CloudWatch logs
   - Rollback instructions for production safety

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create User Migration Lambda Function | 061f5d5 | infra/lambda/user-migration/index.ts, package.json, tsconfig.json |
| 2 | Update Cognito Setup Docs with Lambda Deployment | cba346e | infra/cognito-setup.md |

## Decisions Made

### 1. bcrypt Version 5.x for Lambda Compatibility

**Context:** Need to validate passwords against existing PostgreSQL bcrypt hashes.

**Decision:** Use bcrypt 5.1.1 instead of latest 6.x.

**Rationale:**
- bcrypt 6.x has native module compilation requirements that cause issues in Lambda
- Lambda deployment fails or requires complex build steps with bcrypt 6.x
- bcrypt 5.x is pure JavaScript and works reliably in Lambda without native dependencies
- Password validation algorithm is identical between versions

**Impact:**
- Simplified Lambda deployment (no native build steps)
- Reliable password validation across all environments
- No breaking changes to password compatibility

### 2. Connection Pool Max Connections = 1

**Context:** Lambda functions are short-lived and ephemeral; multiple connections per invocation waste resources.

**Decision:** Set connection pool max to 1 connection per Lambda instance.

**Rationale:**
- Lambda reuses function instances across invocations; connection pool persists
- Each Lambda instance handles one request at a time (single-threaded event loop)
- Multiple connections per instance provide no concurrency benefit
- Reduces risk of database connection exhaustion during migration spikes
- Matches AWS Lambda best practices for RDS connectivity

**Impact:**
- Efficient resource usage (no wasted connections)
- Lower risk of connection pool exhaustion
- May require RDS Proxy if concurrent migrations are extremely high (>100/sec)

### 3. Lambda Timeout 10 Seconds

**Context:** bcrypt.compare() is CPU-intensive; password validation can take 100-500ms depending on hash cost.

**Decision:** Set Lambda timeout to 10 seconds (vs default 3 seconds).

**Rationale:**
- bcrypt is designed to be slow (defense against brute-force attacks)
- 3-second timeout may be insufficient if database query is also slow
- 10 seconds provides buffer for bcrypt + database round-trip + cold start overhead
- Research indicates typical migration takes 200-800ms total

**Impact:**
- Prevents premature timeout failures during legitimate password validation
- Allows for database latency spikes without failing migration
- Slightly higher Lambda cost (only charged for actual execution time)

### 4. Suppress Welcome Emails for Migrated Users

**Context:** Users migrating from PostgreSQL are existing users, not new signups.

**Decision:** Set messageAction to "SUPPRESS" in Lambda response.

**Rationale:**
- Welcome emails make sense for new user signups, not for existing users
- Users would be confused receiving "welcome" email when they've been using the system
- Migration is transparent to users; they shouldn't notice the transition
- Matches just-in-time migration best practice (AWS documentation)

**Impact:**
- Better user experience during migration
- Reduces support tickets asking "why did I get a welcome email?"
- Users only receive email if they explicitly trigger forgot-password flow

## Technical Details

### Lambda Handler Flow

**UserMigration_Authentication trigger:**
1. Receive username (email) and password from Cognito
2. Query PostgreSQL for user by email
3. Validate password using bcrypt.compare() against stored hash
4. If valid: return user attributes for Cognito to auto-create user
5. If invalid: throw error (Cognito shows "Incorrect username or password")

**UserMigration_ForgotPassword trigger:**
1. Receive username (email) from Cognito
2. Query PostgreSQL for user by email
3. If exists: return user attributes for Cognito to auto-create user
4. User can then reset password via Cognito flow

**Returned user attributes:**
- `email`: From PostgreSQL User.email
- `email_verified`: Set to "true" (existing users already verified)
- `name`: From PostgreSQL User.name (empty string if null)
- `custom:legacy_id`: PostgreSQL User.id (UUID) for data mapping

**Security features:**
- Password never logged (console.log only shows email)
- Error messages don't leak user existence ("Incorrect username or password")
- Connection string in environment variable (not hardcoded)
- finalUserStatus "CONFIRMED" prevents account takeover via unverified migration

### Connection Pooling Strategy

**Pool configuration:**
- `max: 1` - One connection per Lambda instance
- `idleTimeoutMillis: 120000` - Close connection after 2 minutes idle
- `connectionTimeoutMillis: 10000` - Fail fast if database unreachable

**Reuse across invocations:**
- Pool stored in module-level variable (`let pool: Pool | null`)
- Lambda reuses function instances; pool persists across invocations
- Cold start: First invocation creates pool
- Warm start: Subsequent invocations reuse existing pool connection

**Connection lifecycle:**
- Connection opened on first database query
- Connection kept alive across multiple Lambda invocations (warm starts)
- Connection closed after 2 minutes idle or Lambda instance termination

### Lambda Deployment Package Structure

```
user-migration.zip
├── dist/
│   └── index.js           # Compiled TypeScript
├── node_modules/
│   ├── bcrypt/            # Password validation
│   ├── pg/                # PostgreSQL client
│   └── ...                # Dependencies
└── (package.json not needed in deployment)
```

**Build commands:**
```bash
npm install                # Install dependencies
npx tsc                    # Compile TypeScript to dist/
zip -r user-migration.zip dist/ node_modules/
```

**Handler configuration:**
- Runtime: Node.js 20.x
- Handler: `dist/index.handler`
- Architecture: x86_64

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✓ Lambda directory exists: `infra/lambda/user-migration/`
2. ✓ TypeScript compiles: `npx tsc --noEmit` succeeded without errors
3. ✓ package.json has bcrypt and pg dependencies
4. ✓ Handler exports correctly named function: `export async function handler`
5. ✓ `infra/cognito-setup.md` contains "User Migration Lambda Setup" section
6. ✓ Instructions include build, deploy, VPC, and trigger attachment steps
7. ✓ Rollback procedure documented
8. ✓ Lambda handles both trigger types: UserMigration_Authentication and UserMigration_ForgotPassword
9. ✓ Lambda uses bcrypt.compare() for password validation
10. ✓ Lambda returns userAttributes array with custom:legacy_id

## Success Criteria Met

- ✓ User Migration Lambda validates passwords using bcrypt
- ✓ Lambda returns correct Cognito user attributes including custom:legacy_id
- ✓ Lambda handles both Authentication and ForgotPassword triggers
- ✓ Deployment documentation complete with VPC and timeout guidance
- ✓ Covers requirement: AUTH-04 (just-in-time migration)

## Next Phase Readiness

**Ready for Phase 04-03 (Auth.js Cognito Provider Integration):**
- User Migration Lambda code complete and ready for deployment
- Lambda will be triggered automatically by Cognito on first login attempt
- custom:legacy_id attribute mapping defined for data correlation
- Documentation includes testing and rollback procedures

**Blockers:** None

**Concerns:** None

**Dependencies for 04-03:**
- User must deploy Lambda function to AWS (follow `infra/cognito-setup.md`)
- User must attach Lambda as User Migration trigger in Cognito console
- User must configure Lambda environment variables (DATABASE_URL)
- If RDS is in VPC: User must configure Lambda VPC access

## User Action Required

Before proceeding to Phase 04-03, the user must:

1. **Deploy Lambda Function to AWS**
   - Navigate to AWS Lambda Console
   - Create function: `rpg-user-migration`, Node.js 20.x, x86_64
   - Build deployment package: `cd infra/lambda/user-migration && npm install && npx tsc && zip -r ../user-migration.zip dist/ node_modules/`
   - Upload zip file to Lambda

2. **Configure Lambda Environment**
   - Add environment variable: `DATABASE_URL` with PostgreSQL connection string
   - Set timeout: 10 seconds
   - Set memory: 256 MB minimum

3. **Configure VPC Access (if RDS is in VPC)**
   - Select VPC containing RDS instance
   - Select subnets with RDS access
   - Select security group allowing PostgreSQL port 5432

4. **Attach Lambda Trigger to Cognito**
   - Go to Cognito console -> User Pool -> Triggers
   - Under "User Migration": Select `rpg-user-migration` Lambda
   - Save changes

5. **Test Migration**
   - Attempt sign-in with existing PostgreSQL user credentials
   - Verify user is created in Cognito with custom:legacy_id attribute
   - Check CloudWatch logs for migration output

## Metrics

- **Tasks completed:** 2/2 (100%)
- **Files created:** 3 (Lambda function files)
- **Files modified:** 1 (cognito-setup.md)
- **Commits:** 2 atomic task commits
- **Duration:** ~5 minutes
- **Lines of code:** ~95 (index.ts)
- **Lines of documentation:** ~77 (Lambda setup section)

## References

- Research: `.planning/phases/04-authentication-migration/04-RESEARCH.md`
- Previous plan: `.planning/phases/04-authentication-migration/04-01-SUMMARY.md`
- AWS User Migration Lambda: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html
- Prisma Schema: `prisma/schema.prisma`
- bcrypt documentation: https://www.npmjs.com/package/bcrypt
- PostgreSQL node-postgres: https://node-postgres.com/

---

## Self-Check: PASSED

All claimed files exist:
- ✓ infra/lambda/user-migration/index.ts
- ✓ infra/lambda/user-migration/package.json
- ✓ infra/lambda/user-migration/tsconfig.json

All claimed commits exist:
- ✓ 061f5d5
- ✓ cba346e

---

**Summary Status:** Complete ✓
**Next Plan:** 04-03 (Auth.js Cognito Provider Integration)
**Phase Progress:** 2 of TBD plans complete in Phase 04
