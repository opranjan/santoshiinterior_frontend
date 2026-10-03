import StoresManager from "@/components/stores/StoresManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Stores",
  description: "Manage Santoshi Interior multi-store locations",
};

export default function StoresPage() {
  return (
    <div className="vendor-form">
      <StoresManager />
    </div>
  );
}
