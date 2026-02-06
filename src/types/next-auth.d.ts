import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      /** Cognito 'sub' claim - stable ID for DynamoDB partition key */
      id: string;
    } & DefaultSession["user"];
    /** Cognito access token for API calls */
    accessToken?: string;
    /** Error flag if token refresh failed */
    error?: string;
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Cognito 'sub' claim */
    id: string;
    /** Cognito access token */
    accessToken?: string;
    /** Cognito refresh token */
    refreshToken?: string;
    /** Cognito ID token */
    idToken?: string;
    /** Token expiration timestamp (epoch seconds) */
    expiresAt?: number;
    /** Error flag for refresh failures */
    error?: string;
  }
}
