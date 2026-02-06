import { withAuth } from "next-auth/middleware";

export default withAuth({
  // Use default pages if custom ones aren't ready
});

export const config = {
  // Apply middleware to all routes except API routes and static files
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)",
  ],
};
