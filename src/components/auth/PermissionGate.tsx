"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

export default function PermissionGate({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!hasAnyPermission(user, permissions)) return <>{fallback}</>;
  return <>{children}</>;
}
