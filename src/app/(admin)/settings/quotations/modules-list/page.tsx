import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Modules List",
  description: "Manage modules list",
};

export default function Page() {
  return (
    <PlaceholderPage
      title="Modules List"
      description="Legacy module list used across older quotation workflows."
    />
  );
}
