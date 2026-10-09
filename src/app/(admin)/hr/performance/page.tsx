import HrPerformancePage from "@/components/hr-panel/HrPerformancePage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "HR Performance" };

export default function Page() {
  return <HrPerformancePage />;
}
