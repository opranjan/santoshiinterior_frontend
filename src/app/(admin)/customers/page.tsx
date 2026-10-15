import CustomersTable from "@/components/customers/CustomersTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Customers",
  description: "Manage customers across stores",
};

export default function CustomersPage() {
  return <CustomersTable />;
}
