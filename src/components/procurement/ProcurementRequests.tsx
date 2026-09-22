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

const PINK = "#E85D75";
const fieldClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#E85D75] dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

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

function avatarColor(name: string) {
  const palette = ["#16A34A", "#0D9488", "#2563EB", "#CA8A04", "#7C3AED"];
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
  const [tab, setTab] = useState<"all" | "review">("all");
  const [items, setItems] = useState<ProcurementRequestDto[]>([]);
  const [pendingReview, setPendingReview] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const filterRef = useRef<HTMLDivElement | null>(null);

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
      if (filterRef.current && !filterRef.current.contains(target as Node)) setFiltersOpen(false);
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
  const menuRow = menu ? items.find((item) => item.id === menu.id) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Requests</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                tab === "all"
                  ? "border-[#2563EB] text-[#2563EB]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] border border-current text-[10px]">
                {tab === "all" ? "☑" : "☐"}
              </span>
              All Requests
            </button>
            <button
              type="button"
              onClick={() => setTab("review")}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                tab === "review"
                  ? "border-[#F59E0B] text-[#F59E0B]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="text-base leading-none">▣</span>
              Pending Review
              {pendingReview ? (
                <span className="rounded-full bg-[#FEF3C7] px-1.5 text-[11px] font-semibold text-[#B45309]">
                  {pendingReview}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              Filters
              {activeFilters ? (
                <span className="rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold">{activeFilters}</span>
              ) : null}
            </button>
            {filtersOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, name, project"
                  className={`${fieldClass} mb-2`}
                />
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${fieldClass} mb-2`}>
                  <option value="">All types</option>
                  <option value="MATERIAL">Material</option>
                  <option value="SERVICE">Service</option>
                </select>
                {tab === "all" ? (
                  <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={fieldClass}>
                    <option value="">All stages</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="ORDERED">Ordered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("");
                    setStageFilter("");
                  }}
                  className="mt-2 text-xs font-medium text-[#E85D75]"
                >
                  Reset
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-4 text-sm font-medium text-white hover:opacity-90"
            style={{ backgroundColor: PINK }}
          >
            + Raise Request
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-medium text-gray-500 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Expected Delivery</th>
                <th className="px-4 py-3 font-medium">Created by/date</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Loading requests...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    No requests yet. Raise a request to get started.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const creator = row.createdBy?.name || "Procurement";
                  const color = avatarColor(creator);
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                      onClick={() => router.push(`/operations/procurement/requests/${row.id}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                        <Link
                          href={`/operations/procurement/requests/${row.id}`}
                          className="hover:text-[#E85D75]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.code}
                        </Link>
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-gray-700 dark:text-white/80">
                        <Link
                          href={`/operations/procurement/requests/${row.id}`}
                          className="line-clamp-2 hover:text-[#E85D75]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">
                        {row.type === "SERVICE" ? "Service" : "Material"}
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-gray-600">
                        <span className="line-clamp-2">{row.project?.name || "Unknown"}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDate(row.expectedDelivery)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {initials(creator)}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{creator}</p>
                            <p className="text-xs text-gray-400">{formatDate(row.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={row.stage} count={row.linkedCount} />
                      </td>
                      <td
                        className="relative px-4 py-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          data-request-actions
                          onClick={(event) => {
                            if (menu?.id === row.id) {
                              setMenu(null);
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            const width = 176;
                            const height = tab === "review" ? 140 : 268;
                            const openUp = window.innerHeight - rect.bottom < height + 16;
                            setMenu({
                              id: row.id,
                              top: openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
                              left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
                            });
                          }}
                          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Request actions"
                        >
                          ⋮
                        </button>
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
              className="fixed z-[100000] w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl dark:border-gray-700 dark:bg-gray-900"
            >
              {tab === "review" ? (
                <>
                  <MenuItem onClick={() => void copyRow(menuRow)}>Copy Request</MenuItem>
                  <MenuItem onClick={() => void setReview(menuRow, "APPROVED")}>Approve Request</MenuItem>
                  <MenuItem danger onClick={() => void setReview(menuRow, "REJECTED")}>
                    Reject Request
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
                    Edit Request
                  </MenuItem>
                  <MenuItem onClick={() => void copyRow(menuRow)}>Copy Request</MenuItem>
                  <MenuItem
                    onClick={() => {
                      void setStage(menuRow, "ORDERED");
                      router.push(`/operations/procurement/orders?requestId=${menuRow.id}`);
                    }}
                  >
                    Request Order
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMenu(null);
                      router.push(`/operations/procurement/rfq?requestId=${menuRow.id}`);
                    }}
                  >
                    Raise RFQ
                  </MenuItem>
                  {menuRow.stage !== "CANCELLED" ? (
                    <MenuItem onClick={() => void setStage(menuRow, "CANCELLED")}>Cancel Request</MenuItem>
                  ) : null}
                  <MenuItem
                    danger
                    onClick={() => {
                      setMenu(null);
                      setDeleteTarget(menuRow);
                    }}
                  >
                    Delete Request
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

function StageBadge({ stage, count }: { stage: string; count: number }) {
  if (stage === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-[#0D9488]">
        <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
        Approved ({count})
      </span>
    );
  }
  if (stage === "ORDERED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-[#16A34A]">
        <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
        Ordered ({count})
      </span>
    );
  }
  if (stage === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[#2563EB]">
      <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
      Pending ({count})
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
      className={`block w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5 ${
        danger ? "text-error-500" : "text-gray-700 dark:text-white/80"
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
      className="w-full max-w-xl p-6 shadow-xl"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/25"
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">New Request</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            Request Type <span className="text-[#E85D75]">*</span>
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
          <label className="mb-1 block text-xs text-gray-500">
            Title <span className="text-[#E85D75]">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Project <span className="text-[#E85D75]">*</span>
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
            <label className="mb-1 block text-xs text-gray-500">
              Expected Delivery date <span className="text-[#E85D75]">*</span>
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
            className="inline-flex items-center gap-1 text-sm font-medium text-[#E85D75]"
          >
            <span className="text-lg leading-none">⊕</span> Add Attachment
          </button>
          {form.files.length ? (
            <p className="mt-1 text-xs text-gray-500">
              {form.files.length} file{form.files.length > 1 ? "s" : ""} selected
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-lg border border-gray-200 px-5 text-sm text-gray-600"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onNext}
          className="h-10 rounded-lg px-6 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: PINK }}
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
      className="w-full max-w-md overflow-hidden p-0 shadow-2xl"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/35"
    >
      {row ? (
        <div className="px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FDE8EC] text-[#E85D75]">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Delete this request?</h3>
          <p className="mt-1 text-sm text-gray-500">{row.code} · {row.name}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="h-11 rounded-xl bg-[#E85D75] text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
