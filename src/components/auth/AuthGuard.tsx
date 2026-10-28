"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CrmBootScreen } from "@/components/ui/loader/CrmLoader";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/signin?next=${encodeURIComponent(pathname || "/")}`);
    }
  }, [loading, isAuthenticated, router, pathname]);

  if (loading) {
    return <CrmBootScreen />;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
