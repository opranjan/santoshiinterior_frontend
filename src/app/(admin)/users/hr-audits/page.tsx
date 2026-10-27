import HrAttendanceAuditsPage from "@/components/users/HrAttendanceAuditsPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "HR Audits | Admin",
  description: "Attendance and recording audits sent by HR to Super Admin",
};

export default function Page() {
  return <HrAttendanceAuditsPage />;
}
