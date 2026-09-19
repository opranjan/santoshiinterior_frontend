import VendorForm from "@/components/vendors/VendorForm";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Add Vendor",
  description: "Add a vendor with contact, location, and banking details",
};

export default function AddVendorPage() {
  return <VendorForm />;
}
