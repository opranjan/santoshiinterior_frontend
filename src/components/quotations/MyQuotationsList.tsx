"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tokenStorage } from "@/lib/auth";
import { quotationsApi } from "@/services/crmApi";
import CreateQuotationModal, {
  type LeadQuotationContext,
} from "./CreateQuotationModal";
import type { Quotation, QuotationStatus } from "./QuotationsTable";

type Props = {
  rows: Quotation[];
  loading?: boolean;
  mode: "mine" | "all";
  onRefresh?: () => void;
  /** Pre-select lead and show simplified create modal (lead workspace). */
  leadContext?: LeadQuotationContext | null;
  /** When embedded in lead workspace, delegate create to parent modal. */
  onCreateClick?: () => void;
};

const accent = {
  text: "text-[#E85D75]",
  bg: "bg-[#E85D75]",
  bgHover: "hover:bg-[#d94c65]",
  border: "border-[#E85D75]",
};

const stateMeta: Record<
  QuotationStatus | "Created",
  { label: string; color: string }
> = {
  Draft: { label: "Created", color: "#3b82f6" },
  Created: { label: "Created", color: "#3b82f6" },
  Sent: { label: "Sent", color: "#0ea5e9" },
  Viewed: { label: "Viewed", color: "#8b5cf6" },
  Accepted: { label: "Accepted", color: "#22c55e" },
  Rejected: { label: "Rejected", color: "#ef4444" },
  Revised: { label: "Revised", color: "#f97316" },
  Expired: { label: "Expired", color: "#94a3b8" },
};

function formatShortDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    // already formatted like 2026-07-28
    const parts = value.split("-");
    if (parts.length === 3) {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const m = months[Number(parts[1]) - 1] || parts[1];
      return `${parts[2]}-${m}-${parts[0].slice(2)}`;
    }
    return value;
  }
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })
    .replace(/ /g, "-");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const menuIcons = {
  edit: (
    <path
      d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  create: (
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
  favourite: (
    <path
      d="M12 4.5l2.2 4.5 5 .7-3.6 3.5.9 5L12 15.9 7.5 18.2l.9-5L4.8 9.7l5-.7L12 4.5z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  comments: (
    <path
      d="M5 6h14a1 1 0 011 1v8a1 1 0 01-1 1H9l-4 3V7a1 1 0 011-1z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  copy: (
    <path
      d="M10 8h8a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2zM6 16V6a2 2 0 012-2h8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
  clone: (
    <>
      <rect
        x="8"
        y="8"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 15V6a1 1 0 011-1h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  delete: (
    <path
      d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M8 7l1 12a1 1 0 001 1h4a1 1 0 001-1l1-12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  discard: (
    <path
      d="M12 4v10m0 0l-3-3m3 3l3-3M5 18h14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

function MoreMenu({
  items,
}: {
  items: Array<{
    label: string;
    onClick: () => void;
    danger?: boolean;
    icon?: keyof typeof menuIcons;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePos = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = Math.min(items.length * 42 + 8, 288);
    let top = rect.bottom + 6;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 6);
    }
    setPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReposition = () => updatePos();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[100000] max-h-72 min-w-[190px] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.04] ${
                item.danger
                  ? "text-error-500"
                  : "text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="shrink-0"
                >
                  {menuIcons[item.icon]}
                </svg>
              )}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="More"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {menu}
    </>
  );
}

export default function MyQuotationsList({
  rows,
  loading,
  mode,
  onRefresh,
  leadContext = null,
  onCreateClick,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(true);
  const [notice, setNotice] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "amount" | "activity">(
    "activity"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [versionTarget, setVersionTarget] = useState<Quotation | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const user = tokenStorage.getUser();

  const openMaker = (id: string) => {
    if (!id) return;
    router.push(`/quotations/${id}`);
  };

  const requestCreate = () => {
    if (leadContext && onCreateClick) {
      onCreateClick();
      return;
    }
    setCreateOpen(true);
  };

  useEffect(() => {
    if (!versionTarget) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [versionTarget]);

  const confirmNewVersion = async () => {
    if (!versionTarget) return;
    const nextVersion = (versionTarget.version || 1) + 1;
    try {
      setCreatingVersion(true);
      await quotationsApi.update(versionTarget.id, { version: nextVersion });
      setVersionTarget(null);
      setNotice(`Created version ${nextVersion} of ${versionTarget.title}`);
      window.setTimeout(() => setNotice(""), 1800);
      onRefresh?.();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Failed to create new version"
      );
      window.setTimeout(() => setNotice(""), 2200);
    } finally {
      setCreatingVersion(false);
    }
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (mode === "mine" && user?.name) {
      list = list.filter(
        (r) =>
          r.createdBy === user.name ||
          r.createdBy?.toLowerCase() === user.name.toLowerCase()
      );
      // If nothing matches current user (seeded data), still show all for UX
      if (list.length === 0) list = rows;
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.projectType.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else
        cmp =
          new Date(a.updatedAt || a.createdAt).getTime() -
          new Date(b.updatedAt || b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, mode, user?.name, search, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied");
      window.setTimeout(() => setNotice(""), 1200);
    } catch {
      setNotice("Copy failed");
      window.setTimeout(() => setNotice(""), 1200);
    }
  };

  const SortLabel = ({
    label,
    keyName,
  }: {
    label: string;
    keyName: typeof sortKey;
  }) => (
    <button
      type="button"
      onClick={() => toggleSort(keyName)}
      className="inline-flex items-center gap-1"
    >
      {label}
      <span className="text-[10px] leading-none text-gray-400">
        {sortKey === keyName ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );

  return (
    <div className="min-w-0 space-y-3 overflow-x-hidden">
      {notice && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>Selected Filters:</span>
          {statusFilter ? (
            <button
              type="button"
              onClick={() => setStatusFilter(false)}
              className="inline-flex items-center gap-1 rounded-full bg-[#E85D75]/15 px-2.5 py-1 text-xs font-medium text-[#E85D75]"
            >
              Status ({filtered.length})
              <span aria-hidden>✕</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStatusFilter(true)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              + Add filter
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 12a8 8 0 10-2.3 5.5M20 12V6m0 6h-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Columns"
            title="Columns"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 5h6v14H4V5zm10 0h6v14h-6V5z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Filter"
            title="Filter"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 5h16l-6 7v5l-4 2v-7L4 5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="relative min-w-[160px] flex-1 basis-[180px] sm:max-w-[220px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:border-[#E85D75] focus:ring-[#E85D75]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setNotice("AI quotation coming soon");
              window.setTimeout(() => setNotice(""), 1600);
            }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-violet-600"
            style={{
              border: "1.5px solid transparent",
              backgroundImage:
                "linear-gradient(#fff, #fff), linear-gradient(90deg, #a855f7, #ec4899)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3L12 3zM18 14l.7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14z"
                fill="currentColor"
              />
            </svg>
            Generate AI Quotation
          </button>
          <button
            type="button"
            onClick={requestCreate}
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
          >
            + Create Quotation
          </button>
          <MoreMenu
            items={[
              {
                label: "Export CSV",
                onClick: () => {
                  setNotice("Export coming soon");
                  window.setTimeout(() => setNotice(""), 1600);
                },
              },
              {
                label: "Import",
                onClick: () => {
                  setNotice("Import coming soon");
                  window.setTimeout(() => setNotice(""), 1600);
                },
              },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1080px]">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="w-12 px-3 py-3 text-theme-xs font-medium text-gray-500"
                  >
                    #
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    Project/Lead
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    <SortLabel label="Quotation name" keyName="name" />
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    Ver
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    <div>
                      <SortLabel label="Amount" keyName="amount" />
                      <p className="mt-0.5 text-[11px] font-normal text-gray-400">
                        Items
                      </p>
                    </div>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    State
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    Action
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("activity")}
                      className="inline-flex flex-col items-start gap-0.5 text-left"
                    >
                      <span className="inline-flex items-center gap-1">
                        Created
                        <span className="text-[10px] leading-none text-gray-400">
                          {sortKey === "activity"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : "↕"}
                        </span>
                      </span>
                      <span className="text-[11px] font-normal text-gray-400">
                        Last Updated
                      </span>
                    </button>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="px-4 py-12 text-center text-sm text-gray-500"
                    >
                      Loading quotations…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-4 py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <p className="text-base font-semibold text-gray-800 dark:text-white/90">
                          No quotations yet
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Create your first quotation to get started.
                        </p>
                        <button
                          type="button"
                          onClick={requestCreate}
                          className={`mt-4 inline-flex h-10 items-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
                        >
                          + Create Quotation
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, index) => {
                    const state =
                      stateMeta[row.status] || stateMeta.Draft;
                    const projectLabel =
                      row.projectType ||
                      (row.sourceType === "Lead" ? "Lead" : "Project");
                    return (
                      <TableRow
                        key={row.id}
                        className="border-b border-gray-100 hover:bg-gray-50/70 dark:border-white/[0.04]"
                      >
                        <TableCell className="px-3 py-3.5 text-sm text-gray-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <div className="min-w-[140px]">
                            <div className="flex items-center gap-1.5">
                              <p
                                className="max-w-[150px] truncate text-sm font-medium text-gray-800 dark:text-white/90"
                                title={row.clientName || projectLabel}
                              >
                                {row.clientName || projectLabel}
                              </p>
                              <button
                                type="button"
                                className="shrink-0 text-blue-500 hover:text-blue-600"
                                title="Open lead"
                                onClick={() => {
                                  if (row.sourceType === "Lead" && row.sourceId) {
                                    router.push(
                                      `/sales/leads/${row.sourceId}?module=quotations`
                                    );
                                    return;
                                  }
                                  setNotice("Project link coming soon");
                                  window.setTimeout(() => setNotice(""), 1400);
                                }}
                              >
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M14 5h5v5M19 5l-9 9M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {projectLabel}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <div className="flex min-w-0 items-start gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNotice("Clone coming soon");
                                window.setTimeout(() => setNotice(""), 1400);
                              }}
                              className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600"
                              title="Clone"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                {menuIcons.clone}
                              </svg>
                            </button>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openMaker(row.id)}
                                  className="min-w-0 truncate text-left text-sm font-semibold text-gray-900 hover:text-[#E85D75] dark:text-white/90"
                                  title={row.title}
                                >
                                  {row.title || "Untitled"}
                                </button>
                                {row.isModular && (
                                  <span className="inline-flex shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                                    Modular
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => void copyText(row.id)}
                                className="mt-0.5 block max-w-full truncate text-left text-xs text-gray-500 hover:text-gray-700"
                                title={row.id}
                              >
                                {row.id}
                              </button>
                            </div>
                            <div className="shrink-0">
                            <MoreMenu
                              items={[
                                {
                                  label: "Edit",
                                  icon: "edit",
                                  onClick: () => openMaker(row.id),
                                },
                                {
                                  label: "Create",
                                  icon: "create",
                                  onClick: requestCreate,
                                },
                                {
                                  label: "Favourite",
                                  icon: "favourite",
                                  onClick: () => {
                                    setNotice("Added to favourites");
                                    window.setTimeout(
                                      () => setNotice(""),
                                      1400
                                    );
                                  },
                                },
                                {
                                  label: "Comments",
                                  icon: "comments",
                                  onClick: () => {
                                    setNotice("Comments coming soon");
                                    window.setTimeout(
                                      () => setNotice(""),
                                      1400
                                    );
                                  },
                                },
                                {
                                  label: "Copy",
                                  icon: "copy",
                                  onClick: () => void copyText(row.id),
                                },
                                {
                                  label: "Clone",
                                  icon: "clone",
                                  onClick: () => {
                                    setNotice("Clone coming soon");
                                    window.setTimeout(
                                      () => setNotice(""),
                                      1400
                                    );
                                  },
                                },
                                {
                                  label: "Delete",
                                  icon: "delete",
                                  danger: true,
                                  onClick: () => {
                                    setNotice("Delete coming soon");
                                    window.setTimeout(
                                      () => setNotice(""),
                                      1400
                                    );
                                  },
                                },
                                {
                                  label: "Discard",
                                  icon: "discard",
                                  danger: true,
                                  onClick: () => {
                                    setNotice("Quotation discarded");
                                    window.setTimeout(
                                      () => setNotice(""),
                                      1400
                                    );
                                  },
                                },
                              ]}
                            />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              className="text-sm font-medium text-blue-600 underline decoration-blue-600/70 underline-offset-2 hover:text-blue-700"
                            >
                              ver {row.version || 1}
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                              title="New version"
                              onClick={() => setVersionTarget(row)}
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M12 5v14M5 12h14"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            ₹ {Number(row.amount || 0).toLocaleString("en-IN")}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {row.itemCount || 0} items
                          </p>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: state.color }}
                            />
                            {state.label}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setNotice("Share link copied (demo)");
                              window.setTimeout(() => setNotice(""), 1400);
                            }}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M4 6h16v12H4V6zm0 0l8 7 8-7"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Share with Client
                          </button>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-semibold text-white">
                              {initials(row.createdBy || "U")}
                            </span>
                            <div className="leading-tight">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {formatShortDate(row.createdAt)}
                              </p>
                              <p className="mt-0.5 text-[11px] text-gray-400">
                                {formatShortDate(
                                  row.updatedAt || row.createdAt
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {versionTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/45 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => !creatingVersion && setVersionTarget(null)}
          >
            <div
              className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-[15px] leading-relaxed text-gray-800 dark:text-white/90">
                Do you want to create a new version of
              </p>
              <p
                className="mt-2 break-words text-center text-[15px] font-semibold leading-snug text-gray-900 dark:text-white"
                title={versionTarget.title}
              >
                {versionTarget.title.trim() || "Untitled"}{" "}
                <span className="whitespace-nowrap font-semibold text-gray-700 dark:text-gray-200">
                  (v{versionTarget.version || 1})
                </span>
                ?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={creatingVersion}
                  onClick={() => void confirmNewVersion()}
                  className={`inline-flex h-11 flex-1 items-center justify-center rounded-lg ${accent.bg} text-sm font-medium text-white ${accent.bgHover} disabled:opacity-60`}
                >
                  {creatingVersion ? "Creating…" : "Confirm"}
                </button>
                <button
                  type="button"
                  disabled={creatingVersion}
                  onClick={() => setVersionTarget(null)}
                  className={`inline-flex h-11 flex-1 items-center justify-center rounded-lg border ${accent.border} bg-white text-sm font-medium ${accent.text} hover:bg-[#E85D75]/5 disabled:opacity-60 dark:bg-transparent`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {!leadContext || !onCreateClick ? (
        <CreateQuotationModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          leadContext={leadContext}
          onCreated={(id) => {
            setCreateOpen(false);
            if (id) {
              openMaker(id);
              return;
            }
            setNotice("Quotation created");
            window.setTimeout(() => setNotice(""), 1800);
            onRefresh?.();
          }}
        />
      ) : null}
    </div>
  );
}
