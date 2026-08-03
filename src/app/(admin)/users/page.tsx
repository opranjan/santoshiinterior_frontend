import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage CRM users across stores",
};

export default function UsersPage() {
  return (
    <PlaceholderPage
      title="Users"
      description="Add and manage CRM users, roles, and store assignments."
    />
  );
}
