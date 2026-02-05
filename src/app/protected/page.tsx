"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/auth-forms"; // Assuming this path

const ProtectedPage: React.FC = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You must be logged in to view this page.</p>
        <a href="/api/auth/signin" className="text-blue-500 hover:underline">Go to Login</a>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Protected Page</h1>
      <p className="mb-2">Welcome, {session?.user?.name || session?.user?.email}!</p>
      <p className="mb-4">This content is only visible to authenticated users.</p>
      <SignOutButton />
    </div>
  );
};

export default ProtectedPage;
