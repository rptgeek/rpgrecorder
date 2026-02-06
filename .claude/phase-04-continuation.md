# Phase 4 Authentication Migration - Continuation

## Current Status

**Completed:**
- ✅ Plans 04-01, 04-02, 04-03 executed successfully
- ✅ AWS Cognito User Pool created: `us-east-1_iINmHxnVw`
- ✅ App Client created: `5ar8euqorrlv8qgau0r1ltebtj`
- ✅ Lambda function `rpg-user-migration` deployed and attached
- ✅ Environment variables configured in `.env`
- ✅ Login page created at `/login`
- ✅ Cognito domain created: `rpg-session-recorder-1770401218`

**Current Issue:**
Cognito Hosted UI is showing errors - `/null/null/css/` paths indicate app client configuration issue.

## AWS Resources Created

```
User Pool ID: us-east-1_iINmHxnVw
Client ID: 5ar8euqorrlv8qgau0r1ltebtj
Client Secret: 76atoie9c53edmsrsdm5jrfnsugu3b4bmefkbn614gh6gahioil
Cognito Domain: rpg-session-recorder-1770401218
Lambda Function: rpg-user-migration
Issuer: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_iINmHxnVw
```

## Next Steps to Fix

The Cognito Hosted UI error is caused by missing app client configuration. Need to:

1. **Add app client logo/branding** (optional) OR
2. **Configure app integration properly** with:
   - Logout URLs
   - Identity providers
   - Attribute read/write permissions

**Quick fix command:**
```bash
aws cognito-idp update-user-pool-client --profile qmi-prod \
  --user-pool-id us-east-1_iINmHxnVw \
  --client-id 5ar8euqorrlv8qgau0r1ltebtj \
  --region us-east-1 \
  --logout-urls https://5ed8-65-130-249-124.ngrok-free.app \
  --read-attributes email name \
  --write-attributes email name
```

3. **Alternative approach**: Skip hosted UI entirely and build custom sign-in form that calls Cognito APIs directly

## Checkpoint Status

**Plan 04-04** is waiting for human verification:
- Pre-requisites complete (AWS setup done)
- Test 1 blocked by Cognito UI configuration
- Once fixed, user needs to complete 6 verification tests and respond with "approved"

## Resume Command

When resuming, tell Claude:
"Continue Phase 4 checkpoint - fix Cognito Hosted UI configuration issue then complete verification tests"

## Files Modified

- `src/app/login/page.tsx` - Created
- `.env` - Updated with Cognito credentials
- `infra/cognito-setup.md` - Created in plan 04-01
- `infra/lambda/user-migration/` - Created in plan 04-02
- `src/auth.ts` - Updated in plan 04-03
- `src/lib/cognito/jwt-utils.ts` - Created in plan 04-03
- `src/types/next-auth.d.ts` - Updated in plan 04-03
- `src/middleware.ts` - Updated in plan 04-03

## Current ngrok URL

https://5ed8-65-130-249-124.ngrok-free.app

(Update this if ngrok URL changes on restart)
