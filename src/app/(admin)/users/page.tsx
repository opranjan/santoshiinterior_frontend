import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UsersManager from "@/components/users/UsersManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage CRM users, roles, and access control",
};

export default function UsersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Users" />
      <UsersManager />
    </div>
  );
}
