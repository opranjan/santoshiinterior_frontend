"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/ui/modal";
import DatePickerField from "@/components/form/DatePickerField";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  procurementRequestsApi,
  projectsApi,
  type ProcurementRequestDto,
} from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";

const GOLD = "#c4a574";
const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    d.getMonth()
  ];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function avatarTone(name: string) {
  const palette = ["#1c1610", "#9a7748", "#5c472c", "#7d6139", "#c4a574"];
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % palette.length;
  return palette[hash];
}

type FormState = {
  name: string;
  type: "MATERIAL" | "SERVICE";
  projectId: string;
  expectedDelivery: string;
  files: File[];
};

const emptyForm: FormState = {
  name: "",
  type: "MATERIAL",
  projectId: "",
  expectedDelivery: "",
  files: [],
};

export default function ProcurementRequests() {
  const router = useRouter();
  const { user } = useAuth();
  const vendorPanel = isVendorPanelUser(user);
  const [tab, setTab] = useState<"all" | "review">("all");
  const [items, setItems] = useState<ProcurementRequestDto[]>([]);
  const [pendingReview, setPendingReview] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProcurementRequestDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await procurementRequestsApi.list({
        limit: 100,
        tab: tab === "review" ? "review" : undefined,
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        stage: tab === "all" && stageFilter ? stageFilter : undefined,
      });
      setItems(data.items || []);
      setPendingReview(data.pendingReview || 0);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [tab, typeFilter, stageFilter, search]);

  useEffect(() => {
    projectsApi
      .list({ limit: 200 })
      .then((data) =>
        setProjects(
          (data.items || []).map((row) => {
            const item = row as { id: string; name?: string };
            return { id: item.id, name: item.name || "Untitled project" };
          })
        )
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node | HTMLElement;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !(target instanceof Element && target.closest("[data-request-actions]"))
      ) {
        setMenu(null);
      }
    };
    const onScroll = () => setMenu(null);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const goNext = async () => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Title");
    if (!form.projectId) missing.push("Project");
    if (!form.expectedDelivery) missing.push("Expected Delivery date");
    if (missing.length) {
      toastWarning(`Please fill ${missing.join(", ")}.`);
      return;
    }
    try {
      setSaving(true);
      const created = await procurementRequestsApi.create({
        name: form.name.trim(),
        type: form.type,
        projectId: form.projectId,
        expectedDelivery: form.expectedDelivery,
        isDraft: true,
      });
      if (form.files.length) {
        await procurementRequestsApi.uploadFiles(created.id, form.files);
      }
      setFormOpen(false);
      router.push(`/operations/procurement/requests/${created.id}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to start request");
    } finally {
      setSaving(false);
    }
  };

  const copyRow = async (row: ProcurementRequestDto) => {
    setMenu(null);
    try {
      await procurementRequestsApi.copy(row.id);
      toastSuccess("Request copied.");
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to copy request");
    }
  };

  const setStage = async (row: ProcurementRequestDto, stage: ProcurementRequestDto["stage"]) => {
    setMenu(null);
    try {
      await procurementRequestsApi.update(row.id, { stage });
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to update request");
    }
  };

  const setReview = async (
    row: ProcurementRequestDto,
    reviewStatus: "APPROVED" | "REJECTED"
  ) => {
    setMenu(null);
    try {
      await procurementRequestsApi.update(row.id, {
        reviewStatus,
        stage: reviewStatus === "REJECTED" ? "CANCELLED" : "APPROVED",
      });
      toastSuccess(reviewStatus === "APPROVED" ? "Request approved." : "Request rejected.");
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to update request");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await procurementRequestsApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      toastSuccess("Request deleted.");
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to delete request");
    } finally {
      setDeleting(false);
    }
  };

  const activeFilters = useMemo(
    () => [search, typeFilter, stageFilter].filter(Boolean).length,
    [search, typeFilter, stageFilter]
  );
  const stats = useMemo(() => {
    return {
      pending: items.filter((row) => row.stage === "PENDING").length,
      approved: items.filter((row) => row.stage === "APPROVED").length,
      ordered: items.filter((row) => row.stage === "ORDERED").length,
    };
  }, [items]);
  const menuRow = menu ? items.find((item) => item.id === menu.id) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            Procurement
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Requests
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            {vendorPanel ? "Requests for your assigned projects." : "Raise material and service needs, then send them to RFQ or order."}
          </p>
        </div>
        {vendorPanel ? null : (
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 w-fit shrink-0 items-center self-start rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] hover:bg-black dark:bg-[#e8d5b5] dark:text-[#1c1610] lg:self-auto"
        >
          + Raise request
        </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-y divide-[#eadfcf] sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-[#3a342c]">
          <StatTile label="On this list" value={loading ? "—" : String(items.length)} />
          <StatTile label="Pending" value={loading ? "—" : String(stats.pending)} />
          <StatTile label="Approved" value={loading ? "—" : String(stats.approved)} />
          {vendorPanel ? (
            <StatTile label="Ordered" value={loading ? "—" : String(stats.ordered)} />
          ) : (
            <StatTile label="Need review" value={loading ? "—" : String(pendingReview)} accent />
          )}
        </div>
      </div>

      {vendorPanel ? null : (
      <div className="inline-flex overflow-hidden rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
            tab === "all"
              ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              : "bg-[#fdfbf7] text-[#8a7b68] dark:bg-[#1a1714]"
          }`}
        >
          All requests
        </button>
        <button
          type="button"
          onClick={() => setTab("review")}
          className={`inline-flex h-11 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
            tab === "review"
              ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              : "bg-[#fdfbf7] text-[#8a7b68] dark:bg-[#1a1714]"
          }`}
        >
          Pending review
          {pendingReview ? (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                tab === "review"
                  ? "bg-[#e8d5b5] text-[#1c1610] dark:bg-[#1c1610] dark:text-[#e8d5b5]"
                  : "bg-[#eadfcf] text-[#9a7748]"
              }`}
            >
              {pendingReview}
            </span>
          ) : null}
        </button>
      </div>
      )}

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, name, or project"
              className={`${fieldClass} pl-10`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`${fieldClass} lg:max-w-[180px]`}
          >
            <option value="">All types</option>
            <option value="MATERIAL">Material</option>
            <option value="SERVICE">Service</option>
          </select>
          {tab === "all" ? (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className={`${fieldClass} lg:max-w-[180px]`}
            >
              <option value="">All stages</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="ORDERED">Ordered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          ) : null}
          {activeFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setStageFilter("");
              }}
              className="h-11 shrink-0 rounded-xl px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748] hover:bg-white dark:hover:bg-white/10"
            >
              Reset · {activeFilters}
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Name</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Project</th>
                <th className="px-4 py-3.5">Expected</th>
                <th className="px-4 py-3.5">Raised by</th>
                <th className="px-4 py-3.5">Stage</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                    Loading requests…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <p
                      className="font-serif text-xl text-[#1c1610] dark:text-[#f4efe6]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {tab === "review" ? "Nothing waiting for review" : "No requests yet"}
                    </p>
                    <p className="mt-1 text-sm text-[#8a7b68]">
                      {tab === "review"
                        ? "New requests that need approval will show up here."
                        : vendorPanel
                          ? "No requests are assigned to your projects yet."
                          : "Raise a request to start procurement for a project."}
                    </p>
                    {tab === "all" && !vendorPanel ? (
                      <button
                        type="button"
                        onClick={openCreate}
                        className="mt-4 h-10 rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
                      >
                        + Raise request
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const creator = row.createdBy?.name || "Procurement";
                  const color = avatarTone(creator);
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-[#f0e8db] last:border-0 hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                      onClick={() => router.push(`/operations/procurement/requests/${row.id}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <Link
                          href={`/operations/procurement/requests/${row.id}`}
                          className="font-semibold text-[#9a7748] hover:text-[#1c1610] dark:hover:text-[#e8d5b5]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.code}
                        </Link>
                      </td>
                      <td className="max-w-[240px] px-4 py-3.5">
                        <Link
                          href={`/operations/procurement/requests/${row.id}`}
                          className="line-clamp-2 font-medium text-[#1c1610] hover:text-[#9a7748] dark:text-[#f3ece2]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.name}
                        </Link>
                        {row.isDraft ? (
                          <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                            Draft
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <TypeBadge type={row.type} />
                      </td>
                      <td className="max-w-[200px] px-4 py-3.5 text-[#6b645b]">
                        <span className="line-clamp-2">{row.project?.name || "Unknown"}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[#6b645b]">
                        {formatDate(row.expectedDelivery)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: color,
                              color: color === GOLD ? "#1c1610" : "#e8d5b5",
                            }}
                          >
                            {initials(creator)}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">{creator}</p>
                            <p className="text-xs text-[#8a7b68]">{formatDate(row.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StageBadge stage={row.stage} count={row.linkedCount} />
                      </td>
                      <td
                        className="relative px-4 py-3.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {vendorPanel ? null : (
                        <button
                          type="button"
                          data-request-actions
                          onClick={(event) => {
                            if (menu?.id === row.id) {
                              setMenu(null);
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            const width = 188;
                            const height = tab === "review" ? 140 : 268;
                            const openUp = window.innerHeight - rect.bottom < height + 16;
                            setMenu({
                              id: row.id,
                              top: openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
                              left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
                            });
                          }}
                          className="rounded-lg p-1.5 text-[#8a7b68] hover:bg-[#eadfcf] hover:text-[#1c1610] dark:hover:bg-[#2a251f] dark:hover:text-[#e8d5b5]"
                          aria-label="Request actions"
                        >
                          ⋮
                        </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {menu && menuRow
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: menu.top, left: menu.left }}
              className="fixed z-[100000] w-48 overflow-hidden rounded-xl border border-[#eadfcf] bg-white py-1 text-sm shadow-xl dark:border-[#3a342c] dark:bg-[#161411]"
            >
              {tab === "review" ? (
                <>
                  <MenuItem onClick={() => void copyRow(menuRow)}>Copy request</MenuItem>
                  <MenuItem onClick={() => void setReview(menuRow, "APPROVED")}>Approve request</MenuItem>
                  <MenuItem danger onClick={() => void setReview(menuRow, "REJECTED")}>
                    Reject request
                  </MenuItem>
                </>
              ) : (
                <>
                  <MenuItem
                    onClick={() => {
                      setMenu(null);
                      router.push(`/operations/procurement/requests/${menuRow.id}?edit=1`);
                    }}
                  >
                    Edit request
                  </MenuItem>
                  <MenuItem onClick={() => void copyRow(menuRow)}>Copy request</MenuItem>
                  <MenuItem
                    onClick={() => {
                      void setStage(menuRow, "ORDERED");
                      router.push(`/operations/procurement/orders?requestId=${menuRow.id}`);
                    }}
                  >
                    Request order
                  </MenuItem>
                  {vendorPanel ? null : (
                  <MenuItem
                    onClick={() => {
                      setMenu(null);
                      router.push(`/operations/procurement/rfq?requestId=${menuRow.id}`);
                    }}
                  >
                    Raise RFQ
                  </MenuItem>
                  )}
                  {menuRow.stage !== "CANCELLED" ? (
                    <MenuItem onClick={() => void setStage(menuRow, "CANCELLED")}>Cancel request</MenuItem>
                  ) : null}
                  <MenuItem
                    danger
                    onClick={() => {
                      setMenu(null);
                      setDeleteTarget(menuRow);
                    }}
                  >
                    Delete request
                  </MenuItem>
                </>
              )}
            </div>,
            document.body
          )
        : null}

      <NewRequestModal
        open={formOpen}
        form={form}
        saving={saving}
        projects={projects}
        onChange={setForm}
        onClose={() => setFormOpen(false)}
        onNext={() => void goNext()}
      />

      <DeleteDialog
        row={deleteTarget}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">{label}</p>
      <p
        className={`mt-1 font-serif text-2xl ${accent ? "text-[#9a7748]" : "text-[#1c1610] dark:text-[#f3ece2]"}`}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {value}
      </p>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const service = type === "SERVICE";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
        service
          ? "bg-[#1c1610] text-[#e8d5b5]"
          : "bg-[#f6efe4] text-[#9a7748] dark:bg-[#c4a574]/15 dark:text-[#e8d5b5]"
      }`}
    >
      {service ? "Service" : "Material"}
    </span>
  );
}

function StageBadge({ stage, count }: { stage: string; count: number }) {
  const styles: Record<string, string> = {
    APPROVED: "bg-[#efe8dc] text-[#5c472c] dark:bg-white/10 dark:text-[#e8d5b5]",
    ORDERED: "bg-[#1c1610] text-[#e8d5b5]",
    CANCELLED: "bg-[#f4f1eb] text-[#8a7b68] dark:bg-white/5",
    PENDING: "bg-[#f6efe4] text-[#9a7748] dark:bg-[#c4a574]/15 dark:text-[#e8d5b5]",
  };
  const labels: Record<string, string> = {
    APPROVED: `Approved (${count})`,
    ORDERED: `Ordered (${count})`,
    CANCELLED: "Cancelled",
    PENDING: `Pending (${count})`,
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[stage] || styles.PENDING}`}>
      {labels[stage] || `Pending (${count})`}
    </span>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left ${
        danger
          ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          : "text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f3ece2] dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function NewRequestModal({
  open,
  form,
  saving,
  projects,
  onChange,
  onClose,
  onNext,
}: {
  open: boolean;
  form: FormState;
  saving: boolean;
  projects: Array<{ id: string; name: string }>;
  onChange: (next: FormState) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      className="w-full max-w-xl overflow-hidden border border-[#eadfcf] bg-[#fdfbf7] p-0 shadow-xl dark:border-[#3a342c] dark:bg-[#161411]"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/40"
    >
      <div className="border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c] dark:bg-[#1c1914]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">New</p>
        <h3
          className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Raise a request
        </h3>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
            Request type <span className="text-[#c4a574]">*</span>
          </label>
          <select
            value={form.type}
            onChange={(e) => onChange({ ...form, type: e.target.value as FormState["type"] })}
            className={fieldClass}
          >
            <option value="MATERIAL">Material</option>
            <option value="SERVICE">Service</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
            Title <span className="text-[#c4a574]">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="e.g. Kitchen hardware for Villa 12"
            className={fieldClass}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
              Project <span className="text-[#c4a574]">*</span>
            </label>
            <select
              value={form.projectId}
              onChange={(e) => onChange({ ...form, projectId: e.target.value })}
              className={fieldClass}
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
              Expected delivery <span className="text-[#c4a574]">*</span>
            </label>
            <DatePickerField
              id="new-request-expected-delivery"
              value={form.expectedDelivery}
              onChange={(date) => onChange({ ...form, expectedDelivery: date })}
              placeholder="Select date"
            />
          </div>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) =>
              onChange({
                ...form,
                files: [...form.files, ...Array.from(e.target.files || [])],
              })
            }
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-[#c4a574]/70 bg-white px-3 text-sm font-medium text-[#9a7748] hover:bg-[#fbf8f3] dark:bg-[#1a1714]"
          >
            + Add attachment
          </button>
          {form.files.length ? (
            <p className="mt-1.5 text-xs text-[#8a7b68]">
              {form.files.length} file{form.files.length > 1 ? "s" : ""} selected
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[#eadfcf] px-6 py-4 dark:border-[#3a342c]">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border border-[#eadfcf] px-5 text-sm font-medium text-[#6b645b] dark:border-[#3a342c]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onNext}
          className="h-11 rounded-xl bg-[#1c1610] px-6 text-sm font-semibold text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          {saving ? "Opening..." : "Next"}
        </button>
      </div>
    </Modal>
  );
}

function DeleteDialog({
  row,
  busy,
  onCancel,
  onConfirm,
}: {
  row: ProcurementRequestDto | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      isOpen={Boolean(row)}
      onClose={onCancel}
      className="w-full max-w-md overflow-hidden border border-[#eadfcf] bg-[#fdfbf7] p-0 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/40"
    >
      {row ? (
        <div className="px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1c1610] text-[#e8d5b5]">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12"
              />
            </svg>
          </div>
          <h3
            className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Delete this request?
          </h3>
          <p className="mt-1 text-sm text-[#8a7b68]">
            {row.code} · {row.name}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="h-11 rounded-xl border border-[#eadfcf] text-sm font-medium text-[#1c1610] dark:border-[#3a342c] dark:text-[#f3ece2]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="h-11 rounded-xl bg-[#1c1610] text-sm font-medium text-[#e8d5b5] disabled:opacity-50"
            >
              {busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
