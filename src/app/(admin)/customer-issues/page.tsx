import CustomerIssuesPage from "@/components/franchisee/CustomerIssuesPage";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Customer Issue" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CustomerIssuesPage />
    </Suspense>
  );
}
