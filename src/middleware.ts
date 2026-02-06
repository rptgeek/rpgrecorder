import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      // Allow access if token exists and doesn't have refresh error
      return !!token && token.error !== "RefreshTokenError";
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)",
  ],
};
