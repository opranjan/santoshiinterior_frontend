"use client";

import React, { useEffect, useState } from "react";

type Props = {
  mode: "designing" | "elevation";
};

const EXPECTED_MS = 95_000;

function statusForPercent(mode: Props["mode"], percent: number) {
  if (percent < 18) {
    return mode === "designing" ? "Reading your room photo…" : "Reading your building photo…";
  }
  if (percent < 40) {
    return mode === "designing"
      ? "Understanding layout and lighting…"
      : "Analyzing facade and proportions…";
  }
  if (percent < 68) {
    return mode === "designing" ? "Applying your design brief…" : "Applying your elevation brief…";
  }
  if (percent < 88) {
    return mode === "designing" ? "Rendering interior concept…" : "Rendering architectural concept…";
  }
  return "Finishing the image…";
}

export default function DesignGeneratingLoader({ mode }: Props) {
  const [percent, setPercent] = useState(1);

  useEffect(() => {
    const started = Date.now();
    const tick = () => {
      const t = (Date.now() - started) / EXPECTED_MS;
      const eased = 1 - Math.exp(-2.15 * t);
      setPercent(Math.max(1, Math.min(96, Math.round(eased * 96))));
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, []);

  const status = statusForPercent(mode, percent);
  const ring = 2 * Math.PI * 42;
  const offset = ring - (percent / 100) * ring;

  return (
    <div className="w-full max-w-lg">
      <div className="relative overflow-hidden rounded-2xl bg-[#f3f0ea] px-6 py-10 dark:bg-gray-800">
        <div className="design-shimmer-layer absolute inset-0 opacity-40" />
        <div className="relative flex flex-col items-center justify-center">
          <div className="relative h-28 w-28">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e6e1d6" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#111111"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-200 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[22px] font-semibold tabular-nums text-[#111111] dark:text-white">
                {percent}%
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-[#3f3a34] dark:text-gray-200">Creating image…</p>
          <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-[#111111] transition-[width] duration-200 ease-linear"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">{status}</p>
      <p className="mt-1 text-center text-xs text-gray-400">Usually takes 1–2 minutes</p>
    </div>
  );
}
