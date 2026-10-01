import FranchiseeDlpPayments from "@/components/franchisee/FranchiseeDlpPayments";
import { Metadata } from "next";

export const metadata: Metadata = { title: "DLP Payment" };

export default function Page() {
  return <FranchiseeDlpPayments />;
}
