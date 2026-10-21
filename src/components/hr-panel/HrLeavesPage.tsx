"use client";

import React, { useEffect, useState } from "react";
import { hrApi } from "@/services/crmApi";
import { mapLeave } from "@/lib/crmMappers";
import HrPageHeader from "./HrPageHeader";

type Leave = ReturnType<typeof mapLeave>;

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  user: "M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a7.5 7.5 0 0115 0",
  calendar: "M8 3v3m8-3v3M4.5 8.5h15M6 21h12a1.5 1.5 0 001.5-1.5V7A1.5 1.5 0 0018 5.5H6A1.5 1.5 0 004.5 7v12.5A1.5 1.5 0 006 21z",
  clock: "M12 6v6l3.5 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  doc: "M8 3.5h6l4 4V20a1.5 1.5 0 01-1.5 1.5h-8.5A1.5 1.5 0 016.5 20V5A1.5 1.5 0 018 3.5zM14 3.5V8h4.5",
  chat: "M5 18.5l1.6-3.2A8 8 0 1112 20H6.5L5 18.5z",
  close: "M6 6l12 12M18 6L6 18",
  x: "M9 9l6 6M15 9l-6 6",
  check: "M5 13l4 4L19 7",
  refresh: "M4 12a8 8 0 0113.66-5.66M20 4v6h-6M20 12a8 8 0 01-13.66 5.66M4 20v-6h6",
};

function Field({
  icon,
  label,
  value,
  valueClass = "text-[#1c1610]",
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5 text-[#b9a48a]">
        <Icon d={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-[#9a8b78]">{label}</p>
        <p className={`truncate text-sm font-semibold ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ statusKey, status }: { statusKey: string; status: string }) {
  if (statusKey === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fde8e8] px-3 py-1 text-xs font-semibold text-[#e11d48]">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#e11d48] text-white">
          <Icon d={ICONS.x} className="h-3 w-3" />
        </span>
        {status}
      </span>
    );
  }
  if (statusKey === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f6ec] px-3 py-1 text-xs font-semibold text-[#2f7a45]">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#2f7a45] text-white">
          <Icon d={ICONS.check} className="h-3 w-3" />
        </span>
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3d6] px-3 py-1 text-xs font-semibold text-[#b45309]">
      <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
      {status}
    </span>
  );
}

export default function HrLeavesPage() {
  const [items, setItems] = useState<Leave[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Leave | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await hrApi.listLeaves({ limit: 100 });
    const rows = (data.items || []).map((row) => mapLeave(row));
    setItems(rows);
    setSelected((prev) => (prev ? rows.find((row) => row.id === prev.id) || prev : null));
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load leaves"));
  }, []);

  const setStatus = async (id: string, status: string) => {
    setSaving(true);
    setError("");
    try {
      await hrApi.updateLeave(id, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update leave");
    } finally {
      setSaving(false);
    }
  };

  const statusColor =
    selected?.statusKey === "REJECTED"
      ? "text-[#e11d48]"
      : selected?.statusKey === "APPROVED"
        ? "text-[#2f7a45]"
        : "text-[#b45309]";
  const statusDot =
    selected?.statusKey === "REJECTED"
      ? "bg-[#e11d48]"
      : selected?.statusKey === "APPROVED"
        ? "bg-[#2f7a45]"
        : "bg-[#f59e0b]";

  return (
    <div className="space-y-5">
      <HrPageHeader crumb="HR › Leave Requests" title="Leave Requests" subtitle="Approve or reject employee leave" />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/60 text-[11px] uppercase tracking-[0.12em] text-[#8a7b68]">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-[#eadfcf] hover:bg-white/70 dark:hover:bg-white/5"
                onClick={() => setSelected(row)}
              >
                <td className="px-4 py-3 font-medium text-[#1c1610] dark:text-[#f3ece2]">{row.name}</td>
                <td className="px-4 py-3">{row.type}</td>
                <td className="px-4 py-3">{row.from}</td>
                <td className="px-4 py-3">{row.to}</td>
                <td className="px-4 py-3">{row.days}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#8a5a2b] hover:underline"
                      onClick={() => setSelected(row)}
                    >
                      View
                    </button>
                    {row.statusKey === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#2f6b3a]"
                          onClick={() => void setStatus(row.id, "APPROVED")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#a33]"
                          onClick={() => void setStatus(row.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#8a7b68]">
                  No leave requests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <div className="relative flex max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] bg-[#fbf7f2] shadow-[0_24px_60px_rgba(40,24,8,0.22)]">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8a7b68] hover:bg-white"
              aria-label="Close"
            >
              <Icon d={ICONS.close} className="h-4 w-4" />
            </button>

            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5 pr-12">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#efe4d4] text-[#c4a574]">
                  <Icon d={ICONS.user} className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">
                    Leave request
                  </p>
                  <h3 className="text-lg font-bold leading-tight text-[#1c1610]">{selected.name || "Employee"}</h3>
                  <p className="text-xs text-[#9a8b78]">
                    {selected.department ? `${selected.department} Department` : selected.roleTitle || "Employee"}
                  </p>
                </div>
              </div>
              <div className="pt-1">
                <StatusBadge statusKey={selected.statusKey} status={selected.status} />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="rounded-2xl border border-[#efe4d4] bg-white px-4 py-2">
              <div className="grid grid-cols-2 gap-x-3">
                <Field icon={ICONS.calendar} label="Leave Type" value={selected.type || "—"} />
                <Field icon={ICONS.calendar} label="Department" value={selected.department || "—"} />
                <Field icon={ICONS.calendar} label="From" value={selected.from || "—"} />
                <Field icon={ICONS.calendar} label="To" value={selected.to || "—"} />
                <Field icon={ICONS.clock} label="Total Days" value={`${selected.days} ${selected.days === 1 ? "day" : "days"}`} />
                <Field
                  icon={ICONS.clock}
                  label="Current Status"
                  value={
                    <span className={`inline-flex items-center gap-1.5 ${statusColor}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                      {selected.status}
                    </span>
                  }
                  valueClass=""
                />
                <Field icon={ICONS.doc} label="Requested On" value={selected.requestedOn || "—"} />
                <Field icon={ICONS.chat} label="Reason" value={selected.reason || "No reason given"} />
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#1c1610]">
                <span className="text-[#b9a48a]">
                  <Icon d={ICONS.chat} />
                </span>
                Reason for Leave
              </p>
              <div className="rounded-2xl border border-[#efe4d4] bg-white px-4 py-3 text-sm text-[#5c5146]">
                {selected.reason || "No reason given"}
              </div>
            </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-[#eadfcf] bg-white text-sm font-semibold text-[#1c1610]"
              >
                Close
              </button>
              {selected.statusKey === "PENDING" ? (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void setStatus(selected.id, "REJECTED")}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-[#f3c4c4] bg-white text-sm font-semibold text-[#e11d48] disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void setStatus(selected.id, "APPROVED")}
                    className="inline-flex h-11 flex-[1.2] items-center justify-center rounded-2xl !bg-[#1c1610] text-sm font-semibold !text-white disabled:opacity-60"
                    style={{ backgroundColor: "#1c1610", color: "#ffffff" }}
                  >
                    {saving ? "Saving…" : "Approve"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setStatus(selected.id, "PENDING")}
                  className="inline-flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-2xl !bg-[#1c1610] text-sm font-semibold !text-white disabled:opacity-60"
                  style={{ backgroundColor: "#1c1610", color: "#ffffff" }}
                >
                  <Icon d={ICONS.refresh} className="h-4 w-4" />
                  {saving ? "Saving…" : "Reconsider Request"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
