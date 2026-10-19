import CasualTasksAdminPage from "@/components/casual-staff/CasualTasksAdminPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Casual Staff Tasks",
  description: "Assign tasks to casual staff",
};

export default function Page() {
  return <CasualTasksAdminPage />;
}
