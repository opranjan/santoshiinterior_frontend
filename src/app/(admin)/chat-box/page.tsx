import AdminVendorChat from "@/components/chat/AdminVendorChat";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Chat Box" };

export default function Page() {
  return <AdminVendorChat />;
}
