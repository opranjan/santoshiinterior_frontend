"use client";

import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "@/icons/index";

type Props = {
  id: string;
  value: string;
  onChange: (dateYmd: string) => void;
  placeholder?: string;
  variant?: "input" | "icon";
};

/** Calendar picker (flatpickr) — native type="date" often looks like plain text on Windows. */
export default function DatePickerField({
  id,
  value,
  onChange,
  placeholder = "Select date",
  variant = "input",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;

    fpRef.current = flatpickr(inputRef.current, {
      dateFormat: "d-m-Y",
      allowInput: false,
      disableMobile: true,
      appendTo: document.body,
      defaultDate: value || undefined,
      onReady: (_dates, _str, instance) => {
        instance.calendarContainer.style.zIndex = "200000";
      },
      onChange: (dates) => {
        const picked = dates[0];
        if (!picked) {
          onChangeRef.current("");
          return;
        }
        const y = picked.getFullYear();
        const m = String(picked.getMonth() + 1).padStart(2, "0");
        const d = String(picked.getDate()).padStart(2, "0");
        onChangeRef.current(`${y}-${m}-${d}`);
      },
    });

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!fpRef.current) return;
    const selected = fpRef.current.selectedDates[0];
    const current = selected
      ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`
      : "";
    if ((value || "") !== current) {
      if (value) {
        fpRef.current.setDate(value, false);
      } else {
        fpRef.current.clear();
      }
    }
  }, [value]);

  if (variant === "icon") {
    return (
      <span className="relative inline-flex">
        <input ref={inputRef} id={id} type="text" readOnly className="pointer-events-none absolute h-0 w-0 opacity-0" />
        <button
          type="button"
          onClick={() => fpRef.current?.open()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FCE7EB] text-[#E85D75] hover:bg-[#F8D0D6]"
          aria-label="Open calendar"
        >
          <CalenderIcon className="size-4" />
        </button>
      </span>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        readOnly
        placeholder={placeholder}
        className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => fpRef.current?.open()}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-500 hover:text-brand-600 dark:text-gray-400"
        aria-label="Open calendar"
      >
        <CalenderIcon className="size-6" />
      </button>
    </div>
  );
}
