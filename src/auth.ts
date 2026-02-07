import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import { refreshAccessToken, isTokenExpiring } from "@/lib/cognito/jwt-utils";
// import prisma from "@/lib/prisma"; // REMOVED
import { documentClient } from "@/lib/dynamodb"; // ADDED
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb"; // ADDED GetCommand for potential future use or explicit existence check
import { AttributeValue } from "@aws-sdk/client-dynamodb"; // Needed for GSI queries if implemented for email lookup

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "rpg-prod"; // Dynamodb Table Name

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
    async signIn({ user, account, profile }) {
      // Only handle Cognito sign-ins
      if (account?.provider !== "cognito") {
        return true;
      }

      try {
        // Use Cognito 'sub' as the user ID (stable across the user's lifetime)
        const cognitoUserId = account.providerAccountId;

        console.log(`[SignIn] Cognito user attempting sign-in:`, {
          cognitoUserId,
          email: user.email,
          name: user.name
        });

        // Use PutCommand for upserting the user in DynamoDB
        // PK: USER#<cognito_sub>, SK: METADATA#<cognito_sub>
        // GSI1PK: EMAIL#<user_email>, GSI1SK: METADATA#<user_email>
        const userItem = {
          PK: `USER#${cognitoUserId}`,
          SK: `METADATA#${cognitoUserId}`,
          EntityType: 'User',
          id: cognitoUserId, // Store sub as id
          email: user.email!,
          name: user.name || null,
          createdAt: new Date().toISOString(), // This will be updated on every sign-in if no ConditionExpression
          updatedAt: new Date().toISOString(),
          GSI1PK: `EMAIL#${user.email!}`, // For email lookup
          GSI1SK: `METADATA#${user.email!}`,
        };

        // If you want to only set createdAt on first creation, you'd need a conditional put:
        // ConditionExpression: "attribute_not_exists(PK)" for first creation
        // For now, simpler PutCommand acts as upsert
        await documentClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: userItem,
        }));
        
        console.log(`[SignIn] User upserted in DynamoDB: ${cognitoUserId}`);

        return true;
      } catch (error) {
        console.error("[SignIn] ERROR - Sign-in failed:", error);
        console.error("[SignIn] User data:", { id: account?.providerAccountId, email: user.email });
        return false; // Deny sign-in if we can't create/verify user
      }
    },
    async jwt({ token, user, account }) {
      // Initial sign-in: store Cognito tokens
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          expiresAt: account.expires_at || Math.floor(Date.now() / 1000) + 3600,
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