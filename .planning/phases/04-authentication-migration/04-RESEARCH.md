# Phase 4: Authentication Migration - Research

**Researched:** 2026-02-06
**Domain:** AWS Cognito + Auth.js JWT Authentication Migration
**Confidence:** HIGH

## Summary

This phase migrates user authentication from Auth.js with CredentialsProvider (database sessions) to AWS Cognito with JWT tokens. The current codebase uses Auth.js v4 with JWT strategy and bcrypt password hashing, providing a solid foundation for migration.

The standard approach uses:
1. **Just-in-time migration** - users migrate transparently during sign-in via Lambda trigger (zero-downtime)
2. **User Migration Lambda** - validates credentials against existing PostgreSQL database on first login to new pool
3. **Auth.js Cognito Provider** - replaces current CredentialsProvider with official Cognito integration
4. **JWT token refresh** - manages access token expiration and refresh token rotation using Auth.js callbacks

The migration requires minimal password handling complexity since Cognito's User Migration Lambda can validate against the existing database without importing passwords. This enables zero-downtime migration where existing passwords work immediately.

**Primary recommendation:** Implement just-in-time migration with User Migration Lambda trigger on a new Cognito User Pool in parallel with existing Auth.js setup, allowing users to migrate organically as they log in.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| AWS Cognito User Pool | Latest | Identity provider | AWS-native, serverless, supports JWT tokens, built-in token management |
| Auth.js (formerly NextAuth.js) | v5+ (or v4.24+ current) | Authentication framework | Official Cognito provider, JWT strategy support, proven Cognito integration |
| @auth/core | Latest | Core Auth.js engine | Required for Auth.js v5+, stricter OAuth/OIDC compliance |
| aws-jwt-verify | Latest | JWT validation | Official AWS library for verifying Cognito JWTs server-side |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @aws-sdk/client-cognito-identity-service-provider | Latest | Cognito API client | For User Pool management, User Migration Lambda integration |
| jsonwebtoken | Latest | JWT parsing | Client-side token inspection (avoid validation on client) |
| bcrypt | 6.0.0 (current) | Password hashing | Keep for legacy password validation during migration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cognito User Pool | Auth0, Firebase Auth, or Clerk | Cognito is AWS-native; alternatives add external dependency |
| Auth.js Cognito Provider | AWS Amplify Auth | Auth.js provides more control; Amplify is simpler but less flexible |
| Just-in-time migration | Bulk import with password reset | JIT preserves user experience; bulk import requires password resets |

**Installation (Auth.js v4 current):**
```bash
npm install aws-jwt-verify aws-sdk/client-cognito-identity-service-provider
# If upgrading to Auth.js v5:
npm install auth.js @auth/core
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── auth/
│   ├── auth.ts              # Auth.js/Auth configuration with Cognito provider
│   ├── cognito-config.ts    # Cognito pool & client IDs, token settings
│   └── jwt-utils.ts         # JWT verification, token refresh logic
├── lib/
│   └── cognito-client.ts    # AWS SDK Cognito operations (admin actions)
├── app/api/auth/
│   ├── [nextauth]/route.ts  # Auth.js route handler
│   └── cognito-webhook/     # Optional: for Lambda trigger integration
└── utils/
    └── migration.ts         # Password validation, just-in-time logic
```

### Pattern 1: Cognito Provider Configuration (Auth.js v4)
**What:** Replace CredentialsProvider with official Cognito OAuth provider
**When to use:** After Cognito User Pool and App Client are created in AWS
**Example:**
```typescript
// src/auth.ts
import CognitoProvider from "next-auth/providers/cognito";

export const authConfig: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!, // https://cognito-idp.{region}.amazonaws.com/{poolId}
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        // Store Cognito tokens on first login
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.tokenExpires = Math.floor(Date.now() / 1000) + (account.expires_in || 3600);
      }

      // Refresh token if expired
      if (token.tokenExpires && Math.floor(Date.now() / 1000) > token.tokenExpires - 60) {
        // Token refresh logic via Cognito
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub; // Use Cognito 'sub' claim as user ID
      session.accessToken = token.accessToken;
      return session;
    },
  },
};

// Source: https://next-auth.js.org/providers/cognito
```

### Pattern 2: User Migration Lambda (Just-in-Time)
**What:** Lambda function invoked on failed Cognito sign-in; validates credentials against PostgreSQL, migrates user
**When to use:** During migration period to enable transparent user transition
**Example:**
```typescript
// Lambda function (Node.js)
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function handler(event: any) {
  if (event.triggerSource === "UserMigration_Authentication") {
    const { username, password } = event.request;

    try {
      // Validate against existing database
      const user = await prisma.user.findUnique({
        where: { email: username },
      });

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return event; // Authentication failed
      }

      // Return user attributes to auto-create in Cognito
      return {
        autoConfirmUser: true,
        autoVerifyPhone: false,
        autoVerifyEmail: user.emailVerified,
        finalUserStatus: "CONFIRMED",
        messageAction: "SUPPRESS", // Don't send welcome email
        response: {
          username: user.email,
          userAttributes: [
            { name: "email", value: user.email },
            { name: "name", value: user.name || "" },
            { name: "email_verified", value: user.emailVerified ? "true" : "false" },
            // Add custom attributes:
            { name: "custom:migrated_at", value: new Date().toISOString() },
          ],
        },
      };
    } catch (error) {
      console.error("Migration Lambda error:", error);
      return event;
    }
  }

  return event;
}

// Source: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html
```

### Pattern 3: JWT Token Refresh Handling
**What:** Refresh expired access tokens using refresh token before they invalidate requests
**When to use:** On every request, especially with short-lived access tokens (15-60 min)
**Example:**
```typescript
// src/auth/jwt-utils.ts
async function refreshAccessToken(refreshToken: string) {
  const cognito = new CognitoIdentityServiceProvider({
    region: process.env.AWS_REGION,
  });

  try {
    const response = await cognito.initiateAuth({
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    return {
      accessToken: response.AuthenticationResult?.AccessToken,
      idToken: response.AuthenticationResult?.IdToken,
      expiresIn: response.AuthenticationResult?.ExpiresIn,
    };
  } catch (error) {
    throw new Error("Token refresh failed");
  }
}

// In auth.ts jwt callback:
// if (token.tokenExpires && Date.now() < token.tokenExpires * 1000 - 60000) {
//   return token; // Token still valid
// }
// const refreshed = await refreshAccessToken(token.refreshToken);
// return { ...token, ...refreshed };

// Source: https://authjs.dev/guides/refresh-token-rotation
```

### Anti-Patterns to Avoid
- **Storing passwords client-side**: Never store user passwords in browser; let Cognito handle it
- **Validating JWT on client**: Client-side JWT inspection only, never validate signatures on client (no secret)
- **Ignoring token expiration**: Always check `exp` claim and refresh before expiry, not after
- **Using USER_SRP_AUTH for migration Lambda**: Must use USER_PASSWORD_AUTH so Lambda receives the password
- **Importing passwords into Cognito**: Don't import password hashes; use Lambda to validate against legacy system
- **Single token storage location**: Store refresh token only in secure HTTP-only cookie, access token in memory or short-lived cookie

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth/OIDC provider integration | Custom OAuth flow | Auth.js Cognito Provider | Proper spec compliance, token refresh, security headers already handled |
| JWT verification | Custom JWT parsing + validation | aws-jwt-verify or Auth.js callbacks | Spec compliance, key rotation handling, signature verification is complex |
| Token refresh lifecycle | Manual refresh logic | Auth.js jwt + session callbacks | Race conditions, cache coherency, timing issues are subtle; Auth.js handles them |
| User password migration | Manual password hash validation | Cognito User Migration Lambda | Just-in-time approach avoids bulk import complexity; Lambda gets password on login |
| Session persistence across restarts | Custom token storage logic | Auth.js session strategy + cookies | Proper cookie flags (HttpOnly, Secure, SameSite), encryption, domain handling |
| Multi-pool user federation | Custom user mapping logic | Cognito User Pool Domains or Lambda triggers | Attribute mapping, deduplication, consistency is complex across pools |

**Key insight:** Authentication is one of the most security-critical systems. Cognito and Auth.js have vetted, battle-tested implementations. Custom token validation, refresh logic, or OAuth flows will have subtle bugs that compromise security.

## Common Pitfalls

### Pitfall 1: Token Expiration Race Conditions
**What goes wrong:** Code checks token expiry, passes to async request, token expires in between. Request fails silently.
**Why it happens:** Checking `exp` claim is not atomic; gap between check and use.
**How to avoid:** Refresh token BEFORE expiry (use 60-second buffer), not after. Auth.js callbacks handle this if configured correctly.
**Warning signs:** Intermittent "unauthorized" errors, mysterious failures after ~1 hour (default access token lifetime)

### Pitfall 2: USER_SRP_AUTH vs USER_PASSWORD_AUTH Confusion
**What goes wrong:** Lambda migration trigger never receives password; authentication always fails.
**Why it happens:** Default Cognito flow is USER_SRP_AUTH (Secure Remote Password, doesn't send password). Migration requires password.
**How to avoid:** Explicitly enable USER_PASSWORD_AUTH in Cognito app client settings. Disable USER_SRP_AUTH to force password flow.
**Warning signs:** All sign-in attempts fail during migration period; Lambda logs show no invocations

### Pitfall 3: Incorrect Cognito Issuer URL
**What goes wrong:** JWT verification fails; tokens are rejected.
**Why it happens:** Issuer URL format is strict: `https://cognito-idp.{region}.amazonaws.com/{PoolId}`. PoolId ≠ App Client ID.
**How to avoid:** Get PoolId from Cognito "General Settings", not App Client settings. Verify URL structure in Auth.js config.
**Warning signs:** "Invalid issuer" JWT errors, unable to verify tokens from Cognito

### Pitfall 4: Refresh Token Not Being Renewed
**What goes wrong:** After first refresh, subsequent refreshes fail because refresh token expires.
**Why it happens:** Refresh token rotation not enabled; Cognito won't issue new refresh token, old one expires.
**How to avoid:** Enable "Refresh token rotation" in Cognito app client settings. Store new refresh token from every auth response.
**Warning signs:** Sessions work for ~30 days (default refresh token lifetime), then break; users must re-login

### Pitfall 5: Custom Attributes Not Migrating
**What goes wrong:** User metadata lost during migration; Lambda creates user but without custom attributes.
**Why it happens:** Lambda response requires `custom:attributeName` format; typos or missing attributes are silently ignored.
**How to avoid:** Use exact attribute names from Cognito pool schema in Lambda response. Test with one user first.
**Warning signs:** Migrated users have empty fields; user lookup by custom attributes fails

### Pitfall 6: JWT Stored in Local Storage (Security)
**What goes wrong:** XSS attack steals JWT from localStorage; attacker impersonates user indefinitely.
**Why it happens:** Tokens in localStorage are readable to any JavaScript; Cognito refresh tokens never expire if stolen.
**How to avoid:** Use HTTP-only cookies for refresh token (set by server). Keep access token in memory only (lost on page reload).
**Warning signs:** Security audit flags localStorage token storage; audit log shows suspicious token usage

### Pitfall 7: CredentialsProvider vs OAuth Provider Conflict
**What goes wrong:** Cannot mix CredentialsProvider with Cognito provider; one disables the other.
**Why it happens:** Auth.js forces JWT strategy with CredentialsProvider; Cognito provider expects OAuth flow.
**How to avoid:** Remove CredentialsProvider entirely; replace with Cognito provider. Cognito handles password auth internally.
**Warning signs:** Login redirects to Cognito hosted UI instead of calling credentials; token format doesn't match expectations

### Pitfall 8: Database Connection from Lambda During Sign-In Spike
**What goes wrong:** Lambda migration spikes database connections during peak login times; database exhaustion.
**Why it happens:** Each login attempt opens new connection; connection pool doesn't scale with simultaneous migrations.
**How to avoid:** Use RDS Proxy for connection pooling. Limit Lambda concurrent executions. Pre-create Cognito users for bulk of users.
**Warning signs:** Database connection errors during peak hours; Lambda timeouts waiting for database; sign-in latency increases

## Code Examples

Verified patterns from official sources:

### Full Auth.js v4 Configuration with Cognito
```typescript
// src/auth.ts
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";

export const authConfig: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!, // https://cognito-idp.{region}.amazonaws.com/{poolId}

      // Critical for just-in-time migration
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh every 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET, // Use Cognito, not this
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in, store OAuth tokens
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          expiresAt: Math.floor(Date.now() / 1000) + (account.expires_in || 3600),
        };
      }

      // Check if token needs refresh (60 second buffer)
      const now = Math.floor(Date.now() / 1000);
      if (token.expiresAt && now > token.expiresAt - 60) {
        // Token expired, trigger refresh in next request
        return { ...token, needsRefresh: true };
      }

      return token;
    },
    async session({ session, token }) {
      // Pass relevant token data to session
      session.user.id = token.sub; // Cognito 'sub' claim
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin", // Custom sign-in page
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth } = NextAuth(authConfig);

// Source: https://next-auth.js.org/providers/cognito
```

### Cognito Configuration (Environment Variables)
```bash
# .env.local
COGNITO_CLIENT_ID=abc123xyz...
COGNITO_CLIENT_SECRET=secret...
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123xyz

# Auth.js
NEXTAUTH_SECRET=your-32-byte-random-secret-here
NEXTAUTH_URL=http://localhost:3000 # https://yourdomain.com in production

# AWS SDK (for Lambda/Admin operations)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Verify JWT Token (Server-Side)
```typescript
// src/lib/cognito-client.ts
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: "access", // or "id"
});

export async function verifyAccessToken(token: string) {
  try {
    const payload = await verifier.verify(token);
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error };
  }
}

// Source: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Database sessions (Auth.js default) | JWT tokens + refresh token rotation | Auth.js v4+ (2023) | Stateless auth, scales horizontally, no server session storage |
| Auth.js v4 + CredentialsProvider | Auth.js v4 + Cognito OAuth Provider OR Auth.js v5 | v4 = now, v5 = beta (Oct 2025) | OAuth flow more secure, vendor-provided, stricter spec compliance in v5 |
| Manual token refresh logic | Auth.js callbacks handle refresh | v4+ (2023) | Race conditions eliminated, standardized handling |
| Bulk user import with password resets | Just-in-time migration via Lambda | AWS best practice (2020+) | Zero-downtime, no forced password resets, better UX |
| Storing refresh tokens in localStorage | Refresh tokens in HTTP-only cookies | 2021+ security best practices | Prevents XSS token theft |

**Deprecated/outdated:**
- **Auth.js v3 and earlier**: NextAuth v4+ is standard; v3 lacks modern token handling
- **Custom OAuth implementations**: Use official Cognito provider instead; spec compliance is critical
- **CredentialsProvider for OAuth**: Cognito provider is the modern pattern; CredentialsProvider intended for simple credential validation only

## Auth.js v5 Migration Considerations

**Current status:** Auth.js v5 (formerly NextAuth.js v5) was renamed in Aug 2023, remains in beta as of Oct 2025. Main contributor left Jan 2025. **Recommendation: Stay on v4 for production stability.**

**If upgrading to v5:**
- Minimum Next.js version: 14.0+
- Package names change: `next-auth` → `auth.js`, `@auth/core`
- Configuration renamed: `NextAuthOptions` → `NextAuthConfig`
- Cookie prefix changes: `next-auth.*` → `authjs.*`
- No breaking changes to Cognito provider configuration
- JWT callbacks work identically

**Source:** [Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5)

## Open Questions

1. **Dual-write validation window duration**
   - What we know: Phase requirements specify "2+ weeks" of dual-write validation before cutover
   - What's unclear: Should we validate 100% of logins or sample-check? How to monitor divergence?
   - Recommendation: Plan verification strategy in planning phase; log Cognito sign-ins vs database logins for comparison

2. **Custom attribute mapping completeness**
   - What we know: Lambda must map all user attributes from PostgreSQL to Cognito custom attributes
   - What's unclear: Which user fields should be custom vs standard Cognito attributes?
   - Recommendation: Audit schema.prisma for all user fields; plan attribute naming convention before Lambda implementation

3. **Database connection exhaustion during migration spike**
   - What we know: Lambda opens database connection per login; could overload during peak signup
   - What's unclear: Expected peak concurrent migrations? Should we pre-create users for inactive accounts?
   - Recommendation: Set up RDS Proxy before migration; monitor Lambda concurrent execution; plan batching strategy

4. **Password validation timeout during peak load**
   - What we know: Lambda timeout can fail migrations if database slow
   - What's unclear: Appropriate Lambda timeout? Should we cache user lookups in Lambda?
   - Recommendation: Lambda default 3s might be insufficient; test with production load; consider DynamoDB cache for frequent users

5. **Cognito token configuration for DynamoDB partition key**
   - What we know: Phase 3 uses Cognito "sub" as DynamoDB partition key
   - What's unclear: Confirmed that 'sub' is stable across user pool? Stable if user migrates between pools?
   - Recommendation: Test that migrated users maintain same 'sub' value; validate no collisions in test environment

## Sources

### Primary (HIGH confidence)
- **Auth.js Cognito Provider** - https://next-auth.js.org/providers/cognito
  - Configuration options, clientId/clientSecret/issuer requirements, OAuth flow
- **Auth.js (v5) Cognito Documentation** - https://authjs.dev/getting-started/providers/cognito
  - v5 configuration, supported environments, environment variable naming
- **AWS Cognito User Migration Lambda** - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html
  - Lambda trigger requirements, password handling, user attribute mapping
- **AWS Cognito JWT Verification** - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
  - JWT validation, aws-jwt-verify library, token structure
- **Auth.js JWT Refresh Token Rotation** - https://authjs.dev/guides/refresh-token-rotation
  - Token refresh patterns, callback handling, session updates
- **AWS Cognito Refresh Tokens** - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html
  - Token lifecycle, expiration configuration, rotation settings

### Secondary (MEDIUM confidence)
- **AWS Blog: Approaches for Migrating to Cognito** - https://aws.amazon.com/blogs/security/approaches-for-migrating-users-to-amazon-cognito-user-pools/
  - Migration strategies, just-in-time vs bulk import, hybrid approach
- **Zero-Downtime Cognito Migration Blog** - https://isaacaddis.github.io/development/aws/cognito/2025/10/04/zero-downtime-cognito-user-pool-migration.html
  - Practical zero-downtime implementation, attribute mapping, custom attributes
- **Auth.js v4 to v5 Migration Guide** - https://authjs.dev/getting-started/migrating-to-v5
  - Breaking changes, configuration updates, minimum Next.js version
- **NextAuth Session Persistence Issues (2025)** - https://clerk.com/articles/nextjs-session-management-solving-nextauth-persistence-issues
  - Cookie configuration, JWT strategy pitfalls, SameSite settings

### Tertiary (LOW confidence)
- **Community articles** - Medium posts, DEV Community posts on Cognito + Next.js integration
  - Practical examples, but individual author interpretations; verify with official docs
- **GitHub discussions** - NextAuth issues #4954, #7025 on token refresh, Cognito integration edge cases
  - Real-world problems reported, but discussions may be resolved in later versions

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH - Auth.js Cognito provider is official, aws-jwt-verify is AWS-provided library
- **Architecture:** HIGH - Just-in-time migration and Lambda trigger approach is AWS documented best practice
- **JWT Handling:** HIGH - Cognito token lifecycle documented by AWS; Auth.js callbacks patterns verified
- **Pitfalls:** MEDIUM-HIGH - Most pitfalls come from official docs or verified 2025 articles; some are inferred from token lifecycle mechanics
- **Auth.js v5 Status:** MEDIUM - v5 is beta and lost main maintainer Jan 2025; stable enough for new projects but less proven in production than v4

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days; Cognito API stable, Auth.js v4 stable; v5 may change)
**Reviewed:** All sources verified; no contradictions found between AWS docs and Auth.js documentation
