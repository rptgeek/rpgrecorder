# AWS Cognito User Pool Setup Guide

This document provides step-by-step instructions for creating the AWS Cognito User Pool that will replace Auth.js database sessions with JWT-based authentication.

**IMPORTANT:** This is a manual setup guide. Follow these instructions in the AWS Console to create the required infrastructure.

## Prerequisites

- AWS Account with Cognito permissions
- Access to AWS Console (https://console.aws.amazon.com/cognito)

## Step-by-Step Configuration

### 1. Create User Pool

1. Navigate to **AWS Console → Cognito → User Pools**
2. Click **Create user pool**

### 2. Configure Sign-In Experience

**Sign-in options:**
- Provider types: **Cognito user pool** (checked)
- Cognito user pool sign-in options:
  - **Email** (checked only)
  - Username: unchecked
  - Phone number: unchecked
  - Preferred username: unchecked

**Rationale:** Users sign in with email only, matching existing Auth.js CredentialsProvider behavior.

### 3. Configure Security Requirements

**Password policy:**
- Password policy mode: **Cognito defaults** (recommended)
  - Minimum length: 8 characters
  - Contains numbers: required
  - Contains special characters: required
  - Contains uppercase letters: required
  - Contains lowercase letters: required

**Multi-factor authentication (MFA):**
- MFA enforcement: **Optional** (user choice)
- MFA methods: Authenticator apps (TOTP)

**Rationale:** Matches existing password requirements. Optional MFA allows users to enable additional security without forcing it.

### 4. Configure Sign-Up Experience

**Self-service sign-up:**
- Enable self-registration: **Enabled**

**Attribute verification and user account confirmation:**
- Cognito-assisted verification: **Send email message, verify email address**
- Attributes to verify: **Email** (checked)
- Active attribute values when update pending: **Keep original**

**Rationale:** Email verification ensures valid user accounts.

### 5. Configure Required and Custom Attributes

**Required attributes:**
- **email** (standard attribute, required)
- **name** (standard attribute, required)

**Custom attributes:**
- Click **Add custom attribute**
- Attribute name: `legacy_id`
- Type: **String**
- Min length: 0
- Max length: 256
- Mutable: **Yes**

**Rationale:** The `custom:legacy_id` attribute stores the PostgreSQL UUID from the existing User table. This enables mapping between Cognito users and existing database records during migration.

### 6. Configure Message Delivery

**Email provider:**
- Email provider: **Send email with Cognito**
- FROM email address: Use default (no-reply@verificationemail.com)
- FROM sender name: (leave blank for default)

**Note:** For production, configure SES (Simple Email Service) for better deliverability and custom branding.

### 7. Integrate Your App

**User pool name:**
- User pool name: `rpg-session-recorder-users`

**Hosted authentication pages:**
- Use the Cognito Hosted UI: **No** (we use custom Next.js pages)

**Initial app client:**
- App type: **Public client**
- App client name: `rpg-session-recorder-app`

**Authentication flows:**
- **CRITICAL:** Enable the following authentication flows:
  - ✓ **ALLOW_USER_PASSWORD_AUTH** (REQUIRED for User Migration Lambda)
  - ✓ **ALLOW_REFRESH_TOKEN_AUTH** (REQUIRED for token refresh)
  - ✓ **ALLOW_USER_SRP_AUTH** (Optional, standard secure flow)

**WARNING:** `ALLOW_USER_PASSWORD_AUTH` MUST be enabled for the User Migration Lambda to receive the password during just-in-time migration. Without this, all migration attempts will fail silently.

**Authentication flow session duration:**
- Default: 3 minutes (acceptable)

### 8. Configure App Client Settings

**OAuth 2.0 grant types:**
- ✓ Authorization code grant
- ✓ Implicit grant (for legacy support)

**OpenID Connect scopes:**
- ✓ openid
- ✓ email
- ✓ profile

**Allowed callback URLs:**
```
http://localhost:3000/api/auth/callback/cognito
https://yourdomain.com/api/auth/callback/cognito
```

**Allowed sign-out URLs:**
```
http://localhost:3000
https://yourdomain.com
```

**Identity providers:**
- Cognito user pool (checked)

**Attribute read and write permissions:**
- Read permissions: email, email_verified, name, custom:legacy_id
- Write permissions: email, name, custom:legacy_id

### 9. Configure Token Expiration

**Refresh token expiration:**
- 30 days (default, acceptable)

**Access token expiration:**
- 60 minutes (1 hour, default)

**ID token expiration:**
- 60 minutes (1 hour, default)

**Token revocation:**
- Enable token revocation: **Yes**
- Revoke refresh tokens: **Yes**

**Refresh token rotation:**
- ✓ **Enable refresh token rotation** (REQUIRED)
- Refresh token reuse interval: 1 day

**Rationale:** Refresh token rotation improves security by issuing new refresh tokens with each access token refresh. This prevents stolen refresh tokens from being reused indefinitely.

### 10. Review and Create

- Review all settings
- Click **Create user pool**

## Post-Creation Steps

After the User Pool is created:

### 1. Retrieve Configuration Values

Navigate to your newly created User Pool and gather the following values:

**User Pool ID:**
- Location: **User Pools → [your-pool-name] → User pool overview**
- Format: `us-east-1_XXXXXXXXX` (region_randomString)
- Copy this value for `COGNITO_USER_POOL_ID`

**App Client ID:**
- Location: **User Pools → [your-pool-name] → App integration tab → App client list → [your-app-client-name]**
- Format: Random alphanumeric string (e.g., `1a2b3c4d5e6f7g8h9i0j`)
- Copy this value for `COGNITO_CLIENT_ID`

**App Client Secret:**
- Location: **Same as App Client ID → Show client secret**
- Format: Long random string
- Copy this value for `COGNITO_CLIENT_SECRET`

**Cognito Issuer URL:**
- Format: `https://cognito-idp.{region}.amazonaws.com/{PoolId}`
- Example: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX`
- Replace `{region}` with your AWS region (e.g., `us-east-1`)
- Replace `{PoolId}` with your User Pool ID (e.g., `us-east-1_XXXXXXXXX`)
- Copy this value for `COGNITO_ISSUER`

### 2. Update Environment Variables

Add the following to your `.env.local` file:

```bash
# AWS Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
COGNITO_CLIENT_SECRET=your-client-secret
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
```

Replace the placeholder values with your actual configuration values from Step 1.

### 3. Verify Configuration

You can test your configuration using the AWS CLI:

```bash
aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID
aws cognito-idp describe-user-pool-client --user-pool-id YOUR_POOL_ID --client-id YOUR_CLIENT_ID
```

## Migration-Specific Configuration

The User Pool is now ready for the User Migration Lambda trigger, which will be configured in a later phase. The key settings that enable migration are:

1. **USER_PASSWORD_AUTH enabled** - Lambda receives the password for validation
2. **custom:legacy_id attribute** - Maps Cognito users to PostgreSQL users
3. **Refresh token rotation enabled** - Secure token handling post-migration

## Next Steps

1. ✓ User Pool created with correct configuration
2. ⏸️ Environment variables documented (add to `.env.local`)
3. ⏸️ User Migration Lambda implementation (Phase 04-02)
4. ⏸️ Auth.js Cognito Provider integration (Phase 04-03)
5. ⏸️ Dual-write validation (Phase 04-04)

## Troubleshooting

### Issue: Cannot find USER_PASSWORD_AUTH option
**Solution:** Ensure you're in the App Client settings, not User Pool settings. Navigate to **App integration → App client list → [client-name] → Edit**. Scroll to "Authentication flows" section.

### Issue: Custom attribute not appearing
**Solution:** Custom attributes must be defined at User Pool creation. If missing, you must create a new User Pool. Custom attributes cannot be added after creation.

### Issue: Callback URL not working
**Solution:** Ensure no trailing slashes in callback URLs. Use exact match: `http://localhost:3000/api/auth/callback/cognito` (no trailing `/`).

## Security Considerations

- **Never commit `.env.local` to git** - Contains sensitive Client Secret
- **Use different User Pools for dev/staging/production** - Isolate environments
- **Enable MFA for admin accounts** - Additional security layer
- **Monitor failed login attempts** - Set up CloudWatch alarms for unusual activity
- **Rotate Client Secret periodically** - Follow AWS security best practices

## References

- [AWS Cognito User Pool Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [User Migration Lambda Trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html)
- [Auth.js Cognito Provider](https://authjs.dev/getting-started/providers/cognito)

---

**Created:** 2026-02-06
**Status:** Ready for execution
**Phase:** 04-authentication-migration
**Plan:** 04-01
