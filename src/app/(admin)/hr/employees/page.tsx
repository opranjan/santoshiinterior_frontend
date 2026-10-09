import HrEmployeesPage from "@/components/hr-panel/HrEmployeesPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Employees | HR" };

export default function Page() {
  return <HrEmployeesPage />;
}
