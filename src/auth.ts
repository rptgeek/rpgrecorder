import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import { refreshAccessToken, isTokenExpiring } from "@/lib/cognito/jwt-utils";

export const authConfig: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!,
      // Don't link accounts by email (security)
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in: store Cognito tokens
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          expiresAt: Math.floor(Date.now() / 1000) + (account.expires_in || 3600),
          // Use Cognito 'sub' as user ID (stable partition key for DynamoDB)
          id: account.providerAccountId, // This is the Cognito 'sub'
        };
      }

      // Check if token needs refresh (60 second buffer)
      if (token.expiresAt && isTokenExpiring(token.expiresAt as number)) {
        console.log("Access token expiring, attempting refresh...");

        const refreshed = await refreshAccessToken(token.refreshToken as string);

        if (refreshed.success) {
          return {
            ...token,
            accessToken: refreshed.accessToken,
            idToken: refreshed.idToken,
            expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expiresIn || 3600),
          };
        } else {
          console.error("Token refresh failed:", refreshed.error);
          // Return token with error flag - session callback can handle
          return { ...token, error: "RefreshTokenError" };
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Pass Cognito 'sub' as user ID for database queries
      session.user.id = token.id as string;

      // Expose access token for API calls (if needed)
      (session as any).accessToken = token.accessToken;

      // Expose refresh error if present
      if (token.error) {
        (session as any).error = token.error;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login", // Custom login page
    error: "/login", // Redirect errors to login
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authConfig);
