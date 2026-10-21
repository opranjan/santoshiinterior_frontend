import AccountingInvoices from "@/components/accounting/AccountingInvoices";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Create and manage customer invoices",
};

export default function AccountingInvoicesPage() {
  return <AccountingInvoices />;
}
