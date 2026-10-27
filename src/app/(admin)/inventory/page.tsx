import InventoryManager from "@/components/inventory/InventoryManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Inventory Management",
  description: "Company and project warehouses, catalog, and stock-in",
};

export default function InventoryPage() {
  return <InventoryManager />;
}
