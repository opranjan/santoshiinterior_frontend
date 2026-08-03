"use client";

import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { TimeIcon } from "@/icons/index";

type Props = {
  id: string;
  value: string;
  onChange: (time24: string) => void;
  placeholder?: string;
};

/** Reliable time picker (flatpickr) — native type="time" often hides on Windows. */
export default function TimePickerField({
  id,
  value,
  onChange,
  placeholder = "Select time",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;

    fpRef.current = flatpickr(inputRef.current, {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      allowInput: false,
      minuteIncrement: 1,
      appendTo: document.body,
      defaultDate: value || undefined,
      onReady: (_dates, _str, instance) => {
        instance.calendarContainer.style.zIndex = "99999";
      },
      onChange: (_dates, dateStr) => {
        onChangeRef.current(dateStr);
      },
      onClose: (_dates, dateStr) => {
        if (dateStr) onChangeRef.current(dateStr);
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
    const current = fpRef.current.input.value;
    if ((value || "") !== current) {
      if (value) {
        fpRef.current.setDate(value, false);
      } else {
        fpRef.current.clear();
      }
    }
  }, [value]);

  return (
    <div className="relative min-w-[128px]">
      <input
        ref={inputRef}
        id={id}
        type="text"
        readOnly
        placeholder={placeholder}
        className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => fpRef.current?.open()}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-600 dark:text-gray-400"
        aria-label="Open time picker"
      >
        <TimeIcon className="size-5" />
      </button>
    </div>
  );
}
