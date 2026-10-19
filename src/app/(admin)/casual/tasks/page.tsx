import CasualStaffTasksPage from "@/components/casual-staff/CasualStaffTasksPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "My Tasks",
  description: "Tasks assigned to casual staff",
};

export default function Page() {
  return <CasualStaffTasksPage />;
}
