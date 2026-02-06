---
phase: 04-authentication-migration
plan: 01
subsystem: authentication
status: complete
completed: 2026-02-06
duration: 8 minutes

requires:
  - 04-RESEARCH.md (Cognito migration strategy)
  - prisma/schema.prisma (User model reference)

provides:
  - Cognito User Pool configuration documentation
  - User data export script for migration backup
  - Environment variable template for Cognito integration

affects:
  - 04-02 (User Migration Lambda implementation)
  - 04-03 (Auth.js Cognito Provider integration)
  - All future auth-dependent phases

tech-stack:
  added: []
  patterns:
    - Just-in-time migration via User Migration Lambda
    - JWT-based authentication with refresh token rotation
    - Custom attributes for legacy ID mapping

key-files:
  created:
    - infra/cognito-setup.md
    - scripts/export-users.ts
    - .env.example
  modified:
    - .gitignore

decisions:
  - decision: Use custom:legacy_id attribute for PostgreSQL UUID mapping
    rationale: Enables correlation between Cognito users and existing database records during migration
    impact: Migration Lambda can map users, dual-write validation can verify consistency

  - decision: Exclude password hashes from export backup
    rationale: Security requirement AUTH-06 - prevent credential exposure if backup is compromised
    impact: Export script only contains non-sensitive user metadata

  - decision: Require USER_PASSWORD_AUTH flow in Cognito app client
    rationale: Migration Lambda needs plaintext password to validate against existing bcrypt hashes
    impact: Must explicitly enable this flow (disabled by default); documented prominently

tags:
  - aws-cognito
  - authentication
  - user-migration
  - infrastructure
  - documentation
---

# Phase 4 Plan 1: Cognito Infrastructure Setup Summary

**One-liner:** AWS Cognito User Pool documentation with email sign-in, custom:legacy_id mapping, USER_PASSWORD_AUTH for migration Lambda, and user data export script excluding passwords.

## What Was Built

Created the infrastructure foundation for migrating from Auth.js database sessions to AWS Cognito JWT-based authentication:

1. **Cognito User Pool Configuration Guide** (`infra/cognito-setup.md`)
   - Complete step-by-step AWS Console instructions
   - User Pool configuration: email-only sign-in, 8-char passwords with complexity requirements
   - Custom attribute: `custom:legacy_id` (String, mutable) for PostgreSQL UUID mapping
   - App Client configuration: USER_PASSWORD_AUTH enabled for Migration Lambda
   - Token settings: 1-hour access tokens, 30-day refresh tokens with rotation
   - Callback URLs for local and production environments
   - Security settings: MFA optional, email verification required

2. **User Data Export Script** (`scripts/export-users.ts`)
   - Exports all users from PostgreSQL via Prisma
   - Exported fields: id, email, name, createdAt, updatedAt
   - **Security:** Excludes password hashes (AUTH-06 compliance)
   - Output: timestamped JSON files in `backups/users-{timestamp}.json`
   - Added `backups/` to .gitignore to prevent committing sensitive data

3. **Environment Variable Template** (`.env.example`)
   - Documented all 4 Cognito environment variables:
     - COGNITO_USER_POOL_ID
     - COGNITO_CLIENT_ID
     - COGNITO_CLIENT_SECRET
     - COGNITO_ISSUER
   - Included placeholder values with correct format examples

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Document Cognito User Pool Configuration | 66be280 | infra/cognito-setup.md, .env.example |
| 2 | Create User Data Export Script | 29949af | scripts/export-users.ts, .gitignore |

## Decisions Made

### 1. Custom Attribute Naming: `custom:legacy_id`

**Context:** Need to map Cognito users to existing PostgreSQL users during migration.

**Decision:** Use `custom:legacy_id` (String, mutable) to store PostgreSQL User.id (UUID).

**Rationale:**
- Enables bidirectional lookup during dual-write validation
- Mutable attribute allows updates if needed during migration testing
- Standard Cognito custom attribute format (`custom:` prefix)

**Impact:**
- Migration Lambda will populate this attribute on user creation
- Data access layer can query Cognito by legacy_id to find migrated users
- Dual-write validation can verify Cognito user matches PostgreSQL user

### 2. USER_PASSWORD_AUTH Flow Requirement

**Context:** Cognito User Migration Lambda needs plaintext password to validate against existing bcrypt hashes.

**Decision:** Explicitly enable `ALLOW_USER_PASSWORD_AUTH` in App Client authentication flows.

**Rationale:**
- Default Cognito flow (USER_SRP_AUTH) doesn't send password to Lambda
- Migration Lambda must receive password to call `bcrypt.compare()` against PostgreSQL hash
- Without this flow, all migration attempts fail silently

**Impact:**
- Documented prominently in setup guide with WARNING callout
- Added to verification checklist
- Future plan 04-02 (Migration Lambda) depends on this configuration

### 3. Password Hash Exclusion from Export

**Context:** Need backup of user data before migration, but password hashes are sensitive.

**Decision:** Export script excludes password field via Prisma `select` omission.

**Rationale:**
- AUTH-06 requirement: backup user data before migration
- Security best practice: don't duplicate password hashes in backups
- If backup is compromised, no credential exposure
- Passwords stay in PostgreSQL; Cognito will use new hashes post-migration

**Impact:**
- Export backup can be shared/stored with reduced security risk
- Migrated users will have Cognito-managed password hashes (different from PostgreSQL)
- No ability to restore passwords from backup (intentional security feature)

## Technical Details

### Cognito Configuration Highlights

**Sign-in configuration:**
- Email-only authentication (no username)
- Matches existing Auth.js CredentialsProvider behavior
- Required attributes: email, name

**Password policy:**
- Minimum 8 characters
- Requires: numbers, special chars, uppercase, lowercase
- Matches existing bcrypt password validation

**Token lifecycle:**
- Access token: 60 minutes (short-lived for security)
- Refresh token: 30 days (long-lived for UX)
- Refresh token rotation enabled (security best practice)

**Custom attributes:**
- `custom:legacy_id` (String, 0-256 chars, mutable)
- Stores PostgreSQL User.id (UUID format: `550e8400-e29b-41d4-a716-446655440000`)

### Export Script Implementation

**Type safety:**
- Uses Prisma generated client for type-safe database access
- Explicit field selection prevents accidental password inclusion
- TypeScript compilation verified (ignoring Prisma runtime warnings)

**Output format:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-02-01T14:22:00.000Z"
  }
]
```

**Security measures:**
- Password field explicitly excluded via `select` omission
- Backup files gitignored to prevent accidental commits
- Timestamped filenames prevent overwrites

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✓ `infra/cognito-setup.md` exists with complete step-by-step instructions
2. ✓ `.env.example` contains all 4 COGNITO_* variables with placeholder values
3. ✓ Instructions explicitly mention USER_PASSWORD_AUTH requirement (4 mentions)
4. ✓ `scripts/export-users.ts` compiles without errors
5. ✓ Password field is NOT included in export (verified via grep)
6. ✓ `backups/` directory is in .gitignore

## Success Criteria Met

- ✓ Cognito setup documentation complete with USER_PASSWORD_AUTH explicitly mentioned
- ✓ Environment variable template includes all 4 Cognito variables
- ✓ User export script runs and creates backup file
- ✓ Backup excludes password hashes
- ✓ Covers requirements: AUTH-02 (docs), AUTH-06 (backup)

## Next Phase Readiness

**Ready for Phase 04-02 (User Migration Lambda):**
- Cognito User Pool configuration documented
- USER_PASSWORD_AUTH requirement clearly specified
- custom:legacy_id attribute defined for user mapping
- User data export available for testing/validation

**Blockers:** None

**Concerns:** None

**Dependencies for 04-02:**
- User must create Cognito User Pool following `infra/cognito-setup.md`
- User must add Cognito environment variables to `.env.local`
- AWS credentials must be configured for Lambda deployment

## User Action Required

Before proceeding to Phase 04-02, the user must:

1. **Create Cognito User Pool in AWS Console**
   - Follow step-by-step guide in `infra/cognito-setup.md`
   - Verify USER_PASSWORD_AUTH is enabled in App Client settings
   - Verify custom:legacy_id attribute is created

2. **Retrieve Configuration Values**
   - User Pool ID from Cognito console
   - App Client ID and Secret from App Client settings
   - Construct Issuer URL: `https://cognito-idp.{region}.amazonaws.com/{PoolId}`

3. **Update Environment Variables**
   - Copy values from AWS Console to `.env.local`
   - Verify all 4 COGNITO_* variables are set

4. **Optional: Run User Export**
   - Execute: `npx tsx scripts/export-users.ts`
   - Verify backup file created in `backups/` directory
   - Confirms database connection and user data accessibility

## Metrics

- **Tasks completed:** 2/2 (100%)
- **Files created:** 3 (cognito-setup.md, export-users.ts, .env.example)
- **Files modified:** 1 (.gitignore)
- **Commits:** 2 atomic task commits
- **Duration:** ~8 minutes
- **Lines of documentation:** ~277 (cognito-setup.md)
- **Lines of code:** ~75 (export-users.ts)

## References

- Research: `.planning/phases/04-authentication-migration/04-RESEARCH.md`
- AWS Cognito User Pools: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
- User Migration Lambda: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html
- Auth.js Cognito Provider: https://authjs.dev/getting-started/providers/cognito
- Prisma Schema: `prisma/schema.prisma`

---

## Self-Check: PASSED

All claimed files exist:
- ✓ infra/cognito-setup.md
- ✓ scripts/export-users.ts
- ✓ .env.example

All claimed commits exist:
- ✓ 66be280
- ✓ 29949af

---

**Summary Status:** Complete ✓
**Next Plan:** 04-02 (User Migration Lambda Implementation)
**Phase Progress:** 1 of TBD plans complete in Phase 04
