"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canAccessRoute } from "@/lib/permissions";

function mapLegacyFranchiseePath(path: string) {
  if (path === "/franchisee") return "/";
  if (path.startsWith("/franchisee/")) {
    const rest = path.slice("/franchisee".length);
    if (rest === "/issues") return "/customer-issues";
    if (rest === "/profile") return "/profile";
    return rest || "/";
  }
  return null;
}

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
    const path = pathname.split("?")[0] || "/";
    const mapped = mapLegacyFranchiseePath(path);
    if (mapped) {
      router.replace(mapped);
      return;
    }
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
