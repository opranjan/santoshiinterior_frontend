import HrSalarySlipPage from "@/components/hr-panel/HrSalarySlipPage";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Salary Slip | HR" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-[#8a7b68]">Loading salary slip…</p>}>
      <HrSalarySlipPage />
    </Suspense>
  );
}
