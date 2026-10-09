import HrReportsPage from "@/components/hr-panel/HrReportsPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "HR Reports" };

export default function Page() {
  return <HrReportsPage />;
}
