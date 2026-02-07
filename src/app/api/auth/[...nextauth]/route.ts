import NextAuth from "next-auth"; // Import NextAuth directly
import { authConfig } from "@/auth"; // Import your authConfig

// Initialize NextAuth with your authConfig
const handler = NextAuth(authConfig);

// Export GET and POST handlers
export { handler as GET, handler as POST };