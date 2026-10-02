"use client";

import React, { useEffect, useState } from "react";

type Props = {
  mode: "designing" | "elevation";
};

const STATUS_MESSAGES = {
  designing: [
    "Reading your room photo…",
    "Understanding layout and lighting…",
    "Applying your design brief…",
    "Rendering interior concept…",
  ],
  elevation: [
    "Reading your building photo…",
    "Analyzing facade and proportions…",
    "Applying your elevation brief…",
    "Rendering architectural concept…",
  ],
};

export default function DesignGeneratingLoader({ mode }: Props) {
  const messages = STATUS_MESSAGES[mode];
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="w-full max-w-lg">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
        <div className="design-shimmer-layer absolute inset-0" />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">Creating image…</p>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">{messages[messageIndex]}</p>
      <p className="mt-1 text-center text-xs text-gray-400">Usually takes 1–2 minutes</p>
    </div>
  );
}
