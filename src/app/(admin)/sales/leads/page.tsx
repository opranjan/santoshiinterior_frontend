import LeadsTable from "@/components/leads/LeadsTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Leads",
  description: "View and manage all sales leads across stores",
};

export default function LeadsPage() {
  return (
    <div className="vendor-form">
      <LeadsTable />
    </div>
  );
}
