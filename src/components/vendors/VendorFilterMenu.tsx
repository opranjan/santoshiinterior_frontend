"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string };

type Props = {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
};

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
        checked
          ? "border-[#E85D75] bg-[#E85D75] text-white"
          : "border-[#E85D75] bg-white"
      }`}
    >
      {checked ? (
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : null}
    </span>
  );
}

export default function VendorFilterMenu({
  label,
  options,
  selected,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const count = selected.length;

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => item.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabels = options.filter((item) => selected.includes(item.value));
  const firstLabel = selectedLabels[0]?.label || label;
  const extra = Math.max(0, count - 1);
  const visibleValues = filtered.map((item) => item.value);
  const allVisibleSelected =
    visibleValues.length > 0 && visibleValues.every((value) => selected.includes(value));

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  const toggleAll = () => {
    if (allVisibleSelected) {
      onChange(selected.filter((value) => !visibleValues.includes(value)));
      return;
    }
    onChange([...new Set([...selected, ...visibleValues])]);
  };

  const reset = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    onChange([]);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`inline-flex h-9 items-center rounded-full border bg-white text-sm ${
          count
            ? "border-gray-300 text-gray-800"
            : "border-gray-200 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-white/80"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-9 max-w-[140px] items-center truncate pl-3 pr-1 font-medium"
        >
          {count ? firstLabel : label}
        </button>
        {count ? (
          <button
            type="button"
            aria-label={`Reset ${label}`}
            onClick={reset}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        ) : null}
        {extra > 0 ? (
          <span className="pr-1 text-xs font-medium text-gray-500">+{extra}</span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="px-2 text-gray-400"
          aria-label={`Toggle ${label} options`}
        >
          <svg className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {open ? (
        <div className="absolute left-0 z-40 mt-1 flex w-64 max-h-[min(20rem,55vh)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={toggleAll}
            disabled={filtered.length === 0}
            className="flex w-full items-center gap-2.5 border-b border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-gray-800 disabled:opacity-40 dark:border-gray-800 dark:text-white/90"
          >
            <CheckBox checked={allVisibleSelected} />
            Select All
          </button>
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label}`}
              className="h-8 w-full bg-transparent text-sm text-gray-500 outline-none placeholder:text-gray-300"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                No {label.toLowerCase()} in vendor records yet
              </p>
            ) : (
              filtered.map((item) => {
                const checked = selected.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggle(item.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-white/80"
                  >
                    <CheckBox checked={checked} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full shrink-0 border-t border-gray-100 bg-white px-3 py-2.5 text-left text-sm font-medium text-[#E85D75] dark:border-gray-800 dark:bg-gray-900"
          >
            Reset
          </button>
        </div>
      ) : null}
    </div>
  );
}
