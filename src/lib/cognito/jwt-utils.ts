import { CognitoJwtVerifier } from "aws-jwt-verify";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

// JWT Verifier (singleton, caches JWKS)
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: "access",
});

// Cognito client for token refresh
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export interface VerifyResult {
  valid: boolean;
  payload?: {
    sub: string;
    email?: string;
    "cognito:username"?: string;
    exp: number;
    iat: number;
  };
  error?: string;
}

/**
 * Verify a Cognito access token server-side.
 * Used for API route protection and middleware.
 */
export async function verifyAccessToken(token: string): Promise<VerifyResult> {
  try {
    const payload = await verifier.verify(token);
    return {
      valid: true,
      payload: {
        sub: payload.sub,
        email: payload.email as string | undefined,
        "cognito:username": payload["cognito:username"] as string | undefined,
        exp: payload.exp,
        iat: payload.iat,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Token verification failed",
    };
  }
}

export interface RefreshResult {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  expiresIn?: number;
  error?: string;
}

/**
 * Refresh expired access token using refresh token.
 * Called from Auth.js jwt callback when token expires.
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  try {
    const command = new InitiateAuthCommand({
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      return { success: false, error: "No authentication result" };
    }

    return {
      success: true,
      accessToken: response.AuthenticationResult.AccessToken,
      idToken: response.AuthenticationResult.IdToken,
      expiresIn: response.AuthenticationResult.ExpiresIn,
    };
  } catch (error) {
    console.error("Token refresh failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Refresh failed",
    };
  }
}

/**
 * Check if token is about to expire (within buffer seconds).
 * Default buffer is 60 seconds to account for network latency.
 */
export function isTokenExpiring(expiresAt: number, bufferSeconds: number = 60): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt - bufferSeconds;
}
