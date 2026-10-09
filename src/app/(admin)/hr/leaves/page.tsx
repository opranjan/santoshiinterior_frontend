import HrLeavesPage from "@/components/hr-panel/HrLeavesPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Leave Requests | HR" };

export default function Page() {
  return <HrLeavesPage />;
}
