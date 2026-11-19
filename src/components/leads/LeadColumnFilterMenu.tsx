"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type LeadColumnFilterOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  allLabel: string;
  options: LeadColumnFilterOption[];
  /** null / empty = all selected (no filter) */
  selected: string[] | null;
  onChange: (next: string[] | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function LeadColumnFilterMenu({
  label,
  allLabel,
  options,
  selected,
  onChange,
  open,
  onOpenChange,
}: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  const active = Array.isArray(selected) && selected.length > 0;
  const selectedSet = useMemo(() => new Set(selected || []), [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (row) =>
        row.label.toLowerCase().includes(q) || row.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(220, Math.min(280, rect.width + 80));
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12);
      }
      setCoords({
        top: rect.bottom + 6,
        left,
        width,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (btnRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selectAll = () => onChange(null);

  const toggleValue = (value: string) => {
    if (!active) {
      // Starting from "all" → keep only this value
      onChange([value]);
      return;
    }
    const next = new Set(selectedSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    if (!next.size || next.size === options.length) {
      onChange(null);
      return;
    }
    onChange([...next]);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={`Filter ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
          active || open
            ? "bg-[#c4a574]/25 text-[#9a7748]"
            : "text-[#b5a894] hover:bg-[#eadfcf]/70 hover:text-[#8a7b68]"
        }`}
        aria-label={`Filter ${label}`}
        aria-expanded={open}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 6h16M7 12h10M10 18h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: coords.width,
                zIndex: 80,
              }}
              className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fdfbf7] shadow-[0_16px_40px_rgba(28,22,16,0.16)] dark:border-[#3a342c] dark:bg-[#1a1714]"
            >
              <div className="border-b border-[#eadfcf] p-2.5 dark:border-[#3a342c]">
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b5a894]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                      <path
                        d="m16 16 3.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search..."
                    className="h-9 w-full rounded-xl border-0 bg-white pl-8 pr-3 text-sm text-[#1c1610] outline-none ring-1 ring-[#eadfcf] focus:ring-2 focus:ring-[#c4a574]/40 dark:bg-[#161411] dark:text-[#f4efe6] dark:ring-[#3a342c]"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-1.5">
                <button
                  type="button"
                  onClick={selectAll}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm ${
                    !active
                      ? "bg-[#f6efe4] font-semibold text-[#1c1610] dark:bg-[#c4a574]/15 dark:text-[#f4efe6]"
                      : "text-[#5c5348] hover:bg-[#f4efe6] dark:text-[#d4c8b8] dark:hover:bg-white/5"
                  }`}
                >
                  <span>{allLabel}</span>
                  {!active ? (
                    <span className="text-[#c4a574]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="m5 12 5 5L20 7"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  ) : null}
                </button>

                {filtered.length ? (
                  filtered.map((row) => {
                    const checked = active ? selectedSet.has(row.value) : false;
                    return (
                      <button
                        key={row.value}
                        type="button"
                        onClick={() => toggleValue(row.value)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm ${
                          checked
                            ? "bg-[#f6efe4] text-[#1c1610] dark:bg-[#c4a574]/10 dark:text-[#f4efe6]"
                            : "text-[#5c5348] hover:bg-[#f4efe6] dark:text-[#d4c8b8] dark:hover:bg-white/5"
                        }`}
                      >
                        <span
                          className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                            checked ? "bg-[#c4a574]" : "bg-[#d9cbb8]"
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate">{row.label}</span>
                        {checked ? (
                          <span className="text-[#c4a574]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="m5 12 5 5L20 7"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-2.5 py-4 text-center text-xs text-[#8a7b68]">No matches</p>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
