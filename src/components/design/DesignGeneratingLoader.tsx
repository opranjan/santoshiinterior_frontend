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

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="design-typing-dot h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-400"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

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
    <div className="w-full max-w-md">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200/80 bg-[#ececec] shadow-inner dark:border-gray-700/80 dark:bg-[#2f2f2f]">
        <div className="design-shimmer-layer absolute inset-0" />
        <div className="design-shimmer-layer design-shimmer-layer-delay absolute inset-0" />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm backdrop-blur-sm dark:bg-black/30">
            <svg
              viewBox="0 0 24 24"
              className="design-sparkle h-6 w-6 text-gray-700 dark:text-gray-200"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3l1.2 4.2L17.5 8.5 13.2 9.7 12 14l-1.2-4.3L6.5 8.5l4.3-1.3L12 3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 16l.7 2.3L8 19l-2.3.7L5 22l-.7-2.3L2 19l2.3-.7L5 16z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Creating image
            <TypingDots />
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-xs text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500/40 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
          </span>
          <span className="truncate transition-opacity duration-500">
            {messages[messageIndex]}
          </span>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-gray-400">
        High-fidelity image edit — usually takes 1–2 minutes
      </p>
    </div>
  );
}
