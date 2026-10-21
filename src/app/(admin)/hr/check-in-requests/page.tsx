import HrCheckInRequestsPage from "@/components/hr-panel/HrCheckInRequestsPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Check-in Requests | HR" };

export default function Page() {
  return <HrCheckInRequestsPage />;
}
