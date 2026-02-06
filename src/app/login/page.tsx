"use client";

import { signIn } from "next-auth/react";
import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    // Automatically redirect to Cognito sign-in
    signIn("cognito", { callbackUrl: "/dashboard" });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to sign in...</h1>
        <p className="text-gray-600">Please wait while we redirect you to AWS Cognito.</p>
      </div>
    </div>
  );
}
