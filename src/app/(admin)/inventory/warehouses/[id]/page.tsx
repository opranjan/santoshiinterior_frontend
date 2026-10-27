import WarehouseInventory from "@/components/inventory/WarehouseInventory";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Warehouse",
  description: "Warehouse inventory and stock-in",
};

export default function WarehousePage() {
  return <WarehouseInventory />;
}
