"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canAccessRoute } from "@/lib/permissions";

export default function RoutePermissionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || !pathname) return;
    if (!canAccessRoute(user, pathname)) {
      router.replace("/forbidden");
    }
  }, [loading, user, pathname, router]);

  if (loading) return null;

  if (user && pathname && !canAccessRoute(user, pathname)) {
    return null;
  }

  return <>{children}</>;
}
