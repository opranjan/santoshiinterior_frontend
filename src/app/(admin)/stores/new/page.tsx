import StoreForm from "@/components/stores/StoreForm";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Add Store",
  description: "Add or edit a Santoshi Interior store",
};

export default function AddStorePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-5 py-10 text-center text-sm text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#161411]">
          Loading...
        </div>
      }
    >
      <StoreForm />
    </Suspense>
  );
}
