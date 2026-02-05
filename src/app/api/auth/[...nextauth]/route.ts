import NextAuth from "next-auth";
import { authConfig } from "@/auth"; // Using alias for src/auth.ts

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
