import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/api/auth/signin", // Redirect unauthenticated users here
  },
});

export const config = {
  // Apply middleware to all routes except API routes and static files
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)",
  ],
};
