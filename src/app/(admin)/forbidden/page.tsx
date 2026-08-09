"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-gray-200 dark:text-gray-700">403</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
        Access denied
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        {user?.accessRole?.label || user?.role
          ? `Your role (${user.accessRole?.label || user.role}) does not have permission to view this page.`
          : "You do not have permission to view this page."}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Contact an administrator if you need access.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg bg-[#E85D75] px-4 py-2 text-sm font-medium text-white hover:bg-[#d94c65]"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
