"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
        checked ? "border-[#c4a574] bg-[#1c1610] text-[#e8d5b5]" : "border-[#c4a574] bg-white dark:bg-[#161411]"
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

function useMenuPosition(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const update = () => {
      const node =
        (anchorRef.current?.querySelector("button") as HTMLElement | null) || anchorRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const viewportPad = 12;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
      const spaceAbove = rect.top - viewportPad;
      const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(140, Math.min(280, openUp ? spaceAbove : Math.max(spaceBelow, 160)));
      const width = rect.width;
      const left = Math.max(
        viewportPad,
        Math.min(rect.left, window.innerWidth - width - viewportPad)
      );
      const rawTop = openUp ? rect.top - maxHeight - 4 : rect.bottom + 4;
      const top = Math.max(
        viewportPad,
        Math.min(rawTop, window.innerHeight - maxHeight - viewportPad)
      );
      setPos({ top, left, width, maxHeight });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef]);

  return pos;
}

export function VendorStatusSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pos = useMenuPosition(open, rootRef);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-left text-sm dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6]"
      >
        <span className={value ? "text-[#1c1610] dark:text-white/90" : "text-[#b3a594]"}>
          {value || "Select status"}
        </span>
        <svg className={`h-4 w-4 text-[#c4a574] ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
              className="vendor-dropdown fixed z-[200] overflow-y-auto rounded-xl border border-[#eadfcf] bg-white shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]"
            >
              {options.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className={`flex w-full px-3.5 py-2.5 text-left text-sm ${
                    index % 2 ? "bg-white dark:bg-transparent" : "bg-[#fbf8f3] dark:bg-white/[0.04]"
                  } ${value === item ? "font-medium text-[#9a7748]" : "text-[#1c1610] dark:text-[#f4efe6]"}`}
                >
                  {item}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export function VendorTypeSelect({
  selected,
  onChange,
  options,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  options: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pos = useMenuPosition(open, rootRef);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => item.label.toLowerCase().includes(q));
  }, [options, query]);

  const label = selected.length
    ? selected.length === 1
      ? selected[0]
      : `${selected[0]} +${selected.length - 1}`
    : "Select Vendor Type";

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-left text-sm dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6]"
      >
        <span className={`truncate ${selected.length ? "text-[#1c1610] dark:text-white/90" : "text-[#b3a594]"}`}>
          {label}
        </span>
        <svg className={`h-4 w-4 text-gray-400 ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: pos.top, left: pos.left, width: Math.max(pos.width, 240) }}
              className="vendor-dropdown fixed z-[200] overflow-hidden rounded-xl border border-[#eadfcf] bg-white shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-10 w-full border-b border-[#f0e8db] bg-transparent px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] dark:border-[#3a342c] dark:text-[#f4efe6] dark:placeholder:text-[#8a8175]"
              />
              <div className="overflow-y-auto py-1" style={{ maxHeight: pos.maxHeight }}>
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-[#8a7b68]">No vendor types yet</p>
                ) : (
                  filtered.map((item) => {
                    const checked = selected.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggle(item.value)}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f4efe6] dark:hover:bg-white/[0.06]"
                      >
                        <CheckBox checked={checked} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
