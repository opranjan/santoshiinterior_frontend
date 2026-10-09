import HrDocumentsPage from "@/components/hr-panel/HrDocumentsPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "HR Documents" };

export default function Page() {
  return <HrDocumentsPage />;
}
