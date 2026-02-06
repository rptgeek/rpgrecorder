---
phase: 04-authentication-migration
plan: 03
subsystem: authentication
status: complete
completed: 2026-02-06
duration: 12 minutes

requires:
  - 04-01-SUMMARY.md (Cognito User Pool configuration)
  - 04-02-SUMMARY.md (User Migration Lambda)
  - 04-RESEARCH.md (Cognito OAuth integration strategy)

provides:
  - Auth.js Cognito OAuth provider integration
  - JWT token management with automatic refresh
  - Lazy-loaded JWT verification utilities
  - TypeScript types for Cognito JWT fields
  - Middleware with refresh error handling

affects:
  - 04-04 (Dual-write validation needs Cognito user session)
  - All future authentication-dependent features
  - Phase 05 (DynamoDB migration will use Cognito 'sub' as partition key)

tech-stack:
  added:
    - aws-jwt-verify: "^5.1.1"
    - @aws-sdk/client-cognito-identity-provider: "^3.984.0"
  patterns:
    - Lazy-loaded JWT verifier to prevent build-time errors
    - Automatic token refresh with 60-second expiry buffer
    - Cognito 'sub' claim as stable user ID for DynamoDB

key-files:
  created:
    - src/lib/cognito/jwt-utils.ts
  modified:
    - src/auth.ts
    - src/types/next-auth.d.ts
    - src/middleware.ts

decisions:
  - decision: Lazy-load JWT verifier and Cognito client
    rationale: Verifier creation at module load time causes build errors when env vars not set
    impact: Build succeeds without Cognito env vars; verifier only created at runtime when needed

  - decision: Use 60-second token expiry buffer
    rationale: Prevents race conditions where token expires during in-flight requests
    impact: Tokens refresh proactively before expiration, improving UX

  - decision: Use account.expires_at for token expiration timestamp
    rationale: Auth.js provides expires_at (epoch seconds) directly from OAuth response
    impact: Simplifies expiry calculation, avoids type errors with expires_in

tags:
  - aws-cognito
  - auth.js
  - jwt
  - oauth
  - token-refresh
  - authentication
---

# Phase 4 Plan 3: Auth.js Cognito Provider Integration Summary

**One-liner:** Auth.js configured with Cognito OAuth provider, lazy-loaded JWT utilities with automatic refresh using 60-second expiry buffer, Cognito 'sub' claim as DynamoDB partition key.

## What Was Built

Integrated Auth.js with AWS Cognito OAuth provider, replacing the CredentialsProvider with Cognito-based JWT authentication:

1. **JWT Utilities** (`src/lib/cognito/jwt-utils.ts`)
   - Lazy-loaded JWT verifier using aws-jwt-verify library
   - Lazy-loaded Cognito client for token refresh operations
   - `verifyAccessToken()`: Server-side Cognito access token validation
   - `refreshAccessToken()`: Refresh expired tokens using REFRESH_TOKEN_AUTH flow
   - `isTokenExpiring()`: Check if token expires within buffer period (default 60s)
   - Singleton pattern with JWKS caching for performance
   - Comprehensive error handling with descriptive error messages

2. **Auth.js Configuration** (`src/auth.ts`)
   - Replaced CredentialsProvider with CognitoProvider
   - OAuth configuration: clientId, clientSecret, issuer from environment variables
   - JWT callback stores Cognito tokens: accessToken, refreshToken, idToken, expiresAt
   - Automatic token refresh when expiring (60-second buffer)
   - Cognito 'sub' claim mapped to user.id (stable DynamoDB partition key)
   - Session callback exposes accessToken and error state
   - 30-day session maxAge with refresh token rotation
   - Custom pages: /login for sign-in and errors

3. **TypeScript Types** (`src/types/next-auth.d.ts`)
   - Extended Session interface with accessToken and error fields
   - Extended JWT interface with Cognito-specific fields:
     - accessToken, refreshToken, idToken (Cognito tokens)
     - expiresAt (epoch seconds for expiry tracking)
     - error (RefreshTokenError flag)
   - Documented Cognito 'sub' claim as user ID

4. **Middleware** (`src/middleware.ts`)
   - Updated withAuth callback to check for RefreshTokenError
   - Denies access if token refresh fails
   - Redirects to /login on authentication failure
   - Protects all routes except API, static files, and auth pages

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create JWT Utilities and Install Dependencies | 43faf0b | src/lib/cognito/jwt-utils.ts, package.json, package-lock.json |
| 2 | Update Auth.js Configuration with Cognito Provider | fdf0b8d | src/auth.ts, src/types/next-auth.d.ts, src/middleware.ts |
| 3 | Fix: Lazy-load JWT verifier to prevent build errors | ed9ab6e | src/lib/cognito/jwt-utils.ts, src/auth.ts |

## Decisions Made

### 1. Lazy-Load JWT Verifier and Cognito Client

**Context:** JWT verifier was initially created at module load time, causing build errors when Cognito environment variables weren't set.

**Decision:** Implement getVerifier() and getCognitoClient() lazy-loading functions.

**Rationale:**
- Next.js build process loads all modules to analyze dependencies
- Module-level verifier creation fails if COGNITO_USER_POOL_ID is undefined
- Lazy loading defers verifier creation until first runtime use
- Build succeeds without requiring Cognito env vars during development

**Impact:**
- Build process no longer requires Cognito environment variables
- Developers can build the app without full AWS setup
- Verifier still created as singleton on first use (maintains performance)
- Error only occurs at runtime when actually attempting authentication

### 2. Use 60-Second Token Expiry Buffer

**Context:** Need to refresh tokens before they expire to avoid authentication failures during in-flight requests.

**Decision:** Use 60-second buffer in isTokenExpiring() function.

**Rationale:**
- Network latency can cause requests to arrive with expired tokens
- API requests initiated just before expiry might complete after expiry
- 60 seconds provides buffer for typical request round-trip times
- Matches AWS best practices for token refresh timing

**Impact:**
- Tokens refresh proactively before actual expiration
- Reduced authentication failures due to timing issues
- Slightly more frequent refresh operations (negligible cost)
- Better user experience with transparent token refresh

### 3. Use account.expires_at for Token Expiration

**Context:** Auth.js OAuth callback provides multiple expiration-related fields; needed to choose the correct one.

**Decision:** Use account.expires_at instead of calculating from account.expires_in.

**Rationale:**
- expires_at is already an epoch timestamp (no calculation needed)
- expires_in type was causing TypeScript errors (typed as {} instead of number)
- expires_at is more reliable (server-calculated at auth time)
- Avoids clock skew issues from client-side calculations

**Impact:**
- Cleaner code without manual timestamp calculations
- No TypeScript type errors
- More accurate expiration tracking (uses server time)
- Consistent with Auth.js OAuth provider conventions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lazy-load JWT verifier to prevent build errors**
- **Found during:** Task 1 verification (npm run build)
- **Issue:** JWT verifier created at module load time with `CognitoJwtVerifier.create()`, causing "Cannot read properties of undefined" error during Next.js build when COGNITO_USER_POOL_ID environment variable not set
- **Fix:** Refactored to lazy-loading pattern with getVerifier() and getCognitoClient() functions; verifier only created on first runtime use
- **Files modified:** src/lib/cognito/jwt-utils.ts
- **Verification:** npm run build succeeds without Cognito env vars
- **Committed in:** ed9ab6e (separate bug fix commit)

**2. [Rule 1 - Bug] Fix account.expires_in type error**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** TypeScript error "Operator '+' cannot be applied to types 'number' and '{}'" when using account.expires_in in JWT callback
- **Fix:** Changed to use account.expires_at directly (already epoch timestamp)
- **Files modified:** src/auth.ts
- **Verification:** TypeScript compilation succeeds, build passes
- **Committed in:** ed9ab6e (same bug fix commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for build to succeed. No scope creep - addressing critical bugs that prevented basic functionality.

## Verification Results

All verification criteria passed:

1. ✓ Build succeeds: `npm run build` completed without errors
2. ✓ Auth config uses Cognito: `grep -c "CognitoProvider" src/auth.ts` returns 2
3. ✓ JWT refresh implemented: `refreshAccessToken` function imported and called in jwt callback
4. ✓ Types extended for Cognito: `expiresAt` field present in JWT interface
5. ✓ Dependencies installed: `aws-jwt-verify@5.1.1` and `@aws-sdk/client-cognito-identity-provider@3.984.0` in package.json
6. ✓ CognitoProvider in auth.ts: Found in imports and provider configuration
7. ✓ Types include accessToken: Found in Session and JWT interfaces
8. ✓ Middleware checks RefreshTokenError: Denies access if error present

## Success Criteria Met

- ✓ Auth.js configured with CognitoProvider (not CredentialsProvider)
- ✓ JWT callbacks store and refresh Cognito tokens automatically
- ✓ 60-second buffer prevents token expiration race conditions
- ✓ User ID is Cognito 'sub' claim (stable for DynamoDB partition key)
- ✓ Session exposes accessToken and error state for API calls
- ✓ Middleware validates token and handles refresh errors gracefully
- ✓ Covers requirements: AUTH-03 (Cognito integration), AUTH-05 (JWT sessions)

## Technical Details

### JWT Verifier Lazy Loading

**Module-level variables:**
```typescript
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
let cognitoClient: CognitoIdentityProviderClient | null = null;
```

**Lazy initialization:**
- First call to getVerifier() creates singleton instance
- Subsequent calls return cached instance
- JWKS caching handled by aws-jwt-verify library
- Reduces cold start overhead for Lambda/Edge environments

### Token Refresh Flow

**JWT callback logic:**
1. Initial sign-in: Store all Cognito tokens + expiresAt timestamp
2. Subsequent requests: Check if expiresAt approaching (within 60s)
3. If expiring: Call refreshAccessToken() with refresh token
4. If refresh succeeds: Update accessToken, idToken, expiresAt
5. If refresh fails: Set error flag, middleware denies access

**Refresh token flow:**
- Uses REFRESH_TOKEN_AUTH flow (Cognito native)
- Returns new accessToken and idToken (not refresh token)
- Refresh tokens have 30-day lifetime (configured in Cognito)
- Refresh token rotation enabled in Cognito for security

### Cognito 'sub' as User ID

**Mapping:**
- OAuth callback: `account.providerAccountId` contains Cognito 'sub' claim
- JWT token: Stored as `token.id`
- Session: Exposed as `session.user.id`
- DynamoDB: Will be used as partition key in Phase 5

**Why 'sub' instead of email:**
- Email can change (users might update profile)
- 'sub' is immutable UUID generated by Cognito
- Stable partition key prevents data orphaning in DynamoDB
- Matches custom:legacy_id mapping from Migration Lambda

## Next Phase Readiness

**Ready for Phase 04-04 (Dual-write Validation):**
- Auth.js provides Cognito user sessions with 'sub' claim
- Session middleware protects all authenticated routes
- JWT tokens automatically refresh, preventing session drops
- User ID stable for database queries (PostgreSQL and future DynamoDB)

**Blockers:** None

**Concerns:** None

**Dependencies for 04-04:**
- User must complete Cognito User Pool setup (from 04-01)
- User must deploy Migration Lambda (from 04-02)
- User must add Cognito environment variables to .env.local:
  - COGNITO_USER_POOL_ID
  - COGNITO_CLIENT_ID
  - COGNITO_CLIENT_SECRET
  - COGNITO_ISSUER
- User must test login flow with existing PostgreSQL user to verify migration

## User Action Required

Before proceeding to Phase 04-04, the user must:

1. **Complete Cognito Setup** (if not already done)
   - Follow `infra/cognito-setup.md` from plan 04-01
   - Create User Pool with email sign-in
   - Enable USER_PASSWORD_AUTH flow
   - Create custom:legacy_id attribute

2. **Deploy Migration Lambda** (if not already done)
   - Follow Lambda deployment section in `infra/cognito-setup.md` from plan 04-02
   - Attach Lambda as User Migration trigger in Cognito

3. **Add Environment Variables to .env.local**
   ```bash
   COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
   COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
   COGNITO_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
   ```

4. **Test Authentication Flow**
   - Start dev server: `npm run dev`
   - Attempt login with existing PostgreSQL user credentials
   - Verify Migration Lambda triggers (check CloudWatch logs)
   - Verify user created in Cognito with custom:legacy_id attribute
   - Verify session persists and tokens refresh automatically

5. **Verify Build Process**
   - Run: `npm run build`
   - Verify build succeeds (lazy loading allows build without env vars)
   - For production deployment, ensure env vars are set in hosting platform

## Metrics

- **Tasks completed:** 2/2 (100%)
- **Files created:** 1 (jwt-utils.ts)
- **Files modified:** 5 (auth.ts, next-auth.d.ts, middleware.ts, package.json, package-lock.json)
- **Commits:** 3 (2 feature commits + 1 bug fix commit)
- **Duration:** ~12 minutes
- **Lines of code:** ~120 (jwt-utils.ts: 104 lines, auth.ts changes: ~40 net)
- **Dependencies added:** 2 packages

## References

- Research: `.planning/phases/04-authentication-migration/04-RESEARCH.md`
- Previous plan: `.planning/phases/04-authentication-migration/04-02-SUMMARY.md`
- Auth.js Cognito Provider: https://authjs.dev/getting-started/providers/cognito
- AWS JWT Verify: https://github.com/awslabs/aws-jwt-verify
- Cognito OAuth 2.0 Tokens: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware

---

## Self-Check: PASSED

All claimed files exist:
- ✓ src/lib/cognito/jwt-utils.ts
- ✓ src/auth.ts (modified)
- ✓ src/types/next-auth.d.ts (modified)
- ✓ src/middleware.ts (modified)

All claimed commits exist:
- ✓ 43faf0b
- ✓ fdf0b8d
- ✓ ed9ab6e

---

**Summary Status:** Complete ✓
**Next Plan:** 04-04 (Dual-write Validation)
**Phase Progress:** 3 of TBD plans complete in Phase 04
