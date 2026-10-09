import HrAttendancePage from "@/components/hr-panel/HrAttendancePage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Attendance | HR" };

export default function Page() {
  return <HrAttendancePage />;
}
