"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth-forms"; // Assuming this path

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  return (
    <main className="container mx-auto p-4 text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to the RPG Session Recorder!</h1>

      {session ? (
        <div className="space-y-4">
          <p className="text-lg">Welcome back, {session.user?.name || session.user?.email}!</p>
          <Link href="/protected" className="text-blue-500 hover:underline block">
            Go to Protected Page
          </Link>
          <SignOutButton />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-lg mb-4">You are not signed in.</p>
          <button
            onClick={() => signIn()}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In
          </button>
          <p className="mt-4">
            New user?{" "}
            <Link href="/signup" className="text-blue-500 hover:underline">
              Create an account
            </Link>{" "}
            (using the Sign Up form in src/components/auth-forms.tsx directly for now).
          </p>
        </div>
      )}
    </main>
  );
}
