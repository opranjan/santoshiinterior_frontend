"use client";

import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";
import RoutePermissionGuard from "@/components/auth/RoutePermissionGuard";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { isIsolatedShellUser } from "@/lib/permissions";
import { usePathname } from "next/navigation";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();
  const partner = isIsolatedShellUser(user);
  const chatPage = pathname === "/chat";

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <AuthGuard>
      <RoutePermissionGuard>
        <div
          className={`overflow-x-hidden xl:flex ${
            chatPage ? "is-chat-page flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden" : "min-h-screen"
          } ${isMobileOpen ? "max-lg:h-dvh max-lg:overflow-hidden" : ""} ${partner ? "vendor-shell" : ""}`}
        >
          <AppSidebar />
          <Backdrop />
          <div
            className={`flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out admin-main-content ${mainContentMargin} ${
              chatPage || isMobileOpen ? "max-lg:overflow-hidden" : ""
            }`}
          >
            <AppHeader />
            <div
              className={`admin-page-content min-w-0 flex-1 mx-auto w-full max-w-(--breakpoint-2xl) ${
                chatPage
                  ? "flex min-h-0 flex-col overflow-hidden p-0 max-lg:max-w-none lg:p-6"
                  : partner
                    ? "overflow-x-hidden px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:p-6"
                    : "overflow-x-auto p-4 md:p-6"
              }`}
            >
              {children}
            </div>
          </div>
        </div>
      </RoutePermissionGuard>
    </AuthGuard>
  );
}
