"use client";

import React from "react";

export default function FranchiseePlaceholder({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">{body}</p>
    </div>
  );
}
