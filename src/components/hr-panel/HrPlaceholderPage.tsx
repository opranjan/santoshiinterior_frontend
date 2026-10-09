"use client";

import React from "react";
import HrPageHeader from "./HrPageHeader";

export default function HrPlaceholderPage({
  crumb,
  title,
  subtitle,
}: {
  crumb: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <HrPageHeader crumb={crumb} title={title} subtitle={subtitle} />
      <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f3] p-10 text-center dark:border-[#3a342c] dark:bg-[#161411]">
        <p className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, serif" }}>
          {title} workspace
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#8a7b68]">
          This HR panel page is ready in the menu. We can add records, uploads, and workflows here
          next — same cream and gold layout as the rest of the panel.
        </p>
      </div>
    </div>
  );
}
