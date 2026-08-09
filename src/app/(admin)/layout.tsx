"use client";

import { useSidebar } from "@/context/SidebarContext";
import AuthGuard from "@/components/auth/AuthGuard";
import RoutePermissionGuard from "@/components/auth/RoutePermissionGuard";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <AuthGuard>
      <RoutePermissionGuard>
      <div className="min-h-screen overflow-x-hidden xl:flex">
        {/* Sidebar and Backdrop */}
        <AppSidebar />
        <Backdrop />
        {/* Main Content Area — min-w-0 keeps wide tables from pushing header over the sidebar */}
        <div
          className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out admin-main-content ${mainContentMargin}`}
        >
          {/* Header */}
          <AppHeader />
          {/* Page Content — horizontal scroll stays inside this pane only */}
          <div className="admin-page-content min-w-0 flex-1 overflow-x-auto p-4 mx-auto w-full max-w-(--breakpoint-2xl) md:p-6">
            {children}
          </div>
        </div>
      </div>
      </RoutePermissionGuard>
    </AuthGuard>
  );
}
