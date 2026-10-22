"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TimeIcon } from "@/icons/index";

type Props = {
  id: string;
  value: string;
  onChange: (time24: string) => void;
  placeholder?: string;
};

type Parsed = { hour12: number; minutes: number; mer: "AM" | "PM" };
type FaceMode = "hour" | "minute";

const CLOCK = 232;
const CENTER = CLOCK / 2;
const RADIUS = 88;

function parseTime(value: string): Parsed | null {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const merIn = (match[3] || "").toUpperCase();
  if (merIn === "PM" && hours < 12) hours += 12;
  if (merIn === "AM" && hours === 12) hours = 0;
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return null;
  }
  return {
    hour12: hours % 12 || 12,
    minutes,
    mer: hours >= 12 ? "PM" : "AM",
  };
}

function toTime24(hour12: number, minutes: number, mer: "AM" | "PM") {
  let hours = hour12 % 12;
  if (mer === "PM") hours += 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDisplay(value: string) {
  const parsed = parseTime(value);
  if (!parsed) return "";
  return `${parsed.hour12}:${String(parsed.minutes).padStart(2, "0")} ${parsed.mer}`;
}

function clockPoint(value: number, max: number, radius = RADIUS) {
  const deg = (value / max) * 360 - 90;
  const rad = (deg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function valueFromPointer(dx: number, dy: number, mode: FaceMode) {
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  if (mode === "hour") {
    const hour = Math.round(deg / 30) % 12;
    return hour === 0 ? 12 : hour;
  }
  return Math.round(deg / 6) % 60;
}

export default function TimePickerField({
  id,
  value,
  onChange,
  placeholder = "Select time",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FaceMode>("hour");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 300 });

  const parsed = useMemo(
    () => parseTime(value) || { hour12: 10, minutes: 0, mer: "AM" as const },
    [value]
  );
  const display = formatDisplay(value);

  const place = () => {
    const el = wrapRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const width = 292;
    const height = 420;
    let left = box.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    let top = box.bottom + 6;
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - height - 12);
    }
    setCoords({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    setMode("hour");
    place();
    const onWin = () => place();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (next: Partial<Parsed>) => {
    onChange(
      toTime24(next.hour12 ?? parsed.hour12, next.minutes ?? parsed.minutes, next.mer ?? parsed.mer)
    );
  };

  const pickFromEvent = (event: React.PointerEvent | PointerEvent, finish: boolean) => {
    const face = faceRef.current;
    if (!face) return;
    const box = face.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    if (mode === "hour") {
      commit({ hour12: valueFromPointer(dx, dy, "hour") });
      if (finish) setMode("minute");
      return;
    }
    commit({ minutes: valueFromPointer(dx, dy, "minute") });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    pickFromEvent(event, false);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    pickFromEvent(event, false);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    pickFromEvent(event, true);
  };

  const selected = mode === "hour" ? parsed.hour12 : parsed.minutes;
  const max = mode === "hour" ? 12 : 60;
  const tip = clockPoint(selected % max, max);
  const labels =
    mode === "hour"
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div ref={wrapRef} className="relative min-w-[148px]">
      <button
        id={id}
        type="button"
        aria-label="Open time picker"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center rounded-lg border border-gray-300 bg-white px-3 pr-9 text-left text-sm text-gray-800 shadow-theme-xs hover:border-[#c4a574] focus:border-[#c4a574] focus:outline-hidden focus:ring-3 focus:ring-[#c4a574]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      >
        <span className={display ? "" : "text-gray-400 dark:text-white/30"}>
          {display || placeholder}
        </span>
      </button>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
        <TimeIcon className="size-5" />
      </span>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Choose time"
              className="fixed z-[200000] rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-2xl dark:border-[#3a342c] dark:bg-[#1c1814]"
              style={{ top: coords.top, left: coords.left, width: coords.width }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1 font-serif text-[1.65rem] leading-none text-[#1c1610] dark:text-[#f3ece2]">
                  <button
                    type="button"
                    onClick={() => setMode("hour")}
                    className={`rounded-lg px-1.5 py-0.5 ${
                      mode === "hour" ? "bg-[#c4a574] text-white" : "text-[#c4a574]"
                    }`}
                  >
                    {String(parsed.hour12).padStart(2, "0")}
                  </button>
                  <span className="text-[#c4a574]">:</span>
                  <button
                    type="button"
                    onClick={() => setMode("minute")}
                    className={`rounded-lg px-1.5 py-0.5 ${
                      mode === "minute" ? "bg-[#c4a574] text-white" : "text-[#8a7b68]"
                    }`}
                  >
                    {String(parsed.minutes).padStart(2, "0")}
                  </button>
                </div>
                <div className="flex overflow-hidden rounded-lg border border-[#eadfcf] text-xs font-semibold">
                  {(["AM", "PM"] as const).map((mer) => (
                    <button
                      key={mer}
                      type="button"
                      onClick={() => commit({ mer })}
                      className={`h-8 w-10 ${
                        parsed.mer === mer
                          ? "bg-[#c4a574] text-white"
                          : "bg-white text-[#8a7b68] dark:bg-[#161411]"
                      }`}
                    >
                      {mer}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={faceRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="relative mx-auto touch-none select-none rounded-full bg-[#f6efe4] dark:bg-[#161411]"
                style={{ width: CLOCK, height: CLOCK }}
              >
                <svg width={CLOCK} height={CLOCK} className="absolute inset-0">
                  <line
                    x1={CENTER}
                    y1={CENTER}
                    x2={tip.x}
                    y2={tip.y}
                    stroke="#c4a574"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx={CENTER} cy={CENTER} r="5" fill="#c4a574" />
                  <circle cx={tip.x} cy={tip.y} r="18" fill="#c4a574" />
                </svg>
                {labels.map((n) => {
                  const point = clockPoint(mode === "hour" ? n % 12 : n, max);
                  const active = selected === n || (mode === "hour" && n === 12 && selected === 12);
                  const label = mode === "hour" ? String(n) : String(n).padStart(2, "0");
                  return (
                    <span
                      key={`${mode}-${n}`}
                      className={`pointer-events-none absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-sm font-semibold ${
                        active ? "text-white" : "text-[#5c5146] dark:text-[#d8cbb8]"
                      }`}
                      style={{ left: point.x, top: point.y }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>

              <p className="mt-2 text-center text-[11px] text-[#8a7b68]">
                {mode === "hour" ? "Tap the clock to set the hour" : "Tap the clock to set minutes"}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 h-10 w-full rounded-xl bg-[#c4a574] text-sm font-semibold text-white hover:bg-[#b3915f]"
              >
                Done
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
