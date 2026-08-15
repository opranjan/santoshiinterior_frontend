"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type BulkLeadAction =
  | "MOVE_TO"
  | "ADD_ASSIGNEE"
  | "UPDATE_STATUS"
  | "UPDATE_SOURCE"
  | "UPDATE_PROJECT_TYPE"
  | "REMOVE_ASSIGNEE"
  | "DELETE";

export type AssigneeOption = {
  id: string;
  name: string;
  kind?: "user" | "team";
};

type Props = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  assigneeOptions: AssigneeOption[];
  loading?: boolean;
  canDelete?: boolean;
  onApply: (payload: {
    action: BulkLeadAction;
    assigneeIds?: string[];
    status?: string;
    source?: string;
    projectType?: string;
  }) => Promise<void>;
};

const accent = "#E85D75";

const actionOptions: Array<{ key: BulkLeadAction; label: string }> = [
  { key: "MOVE_TO", label: "Move To" },
  { key: "ADD_ASSIGNEE", label: "Add Assignee" },
  { key: "UPDATE_STATUS", label: "Update Status" },
  { key: "UPDATE_SOURCE", label: "Update Source" },
  { key: "UPDATE_PROJECT_TYPE", label: "Update Project Type" },
  { key: "REMOVE_ASSIGNEE", label: "Remove Assignee" },
  { key: "DELETE", label: "Delete Leads" },
];

const statusOptions = [
  "Created",
  "New",
  "Contacted",
  "Site Visit",
  "Quotation",
  "Negotiation",
  "Won",
  "Lost",
];

const sourceOptions = [
  "Walk-in",
  "Referral",
  "Website",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Exhibition",
  "Other",
];

const projectTypeOptions = [
  "Residential",
  "Commercial",
  "Office",
  "Retail Showroom",
  "Renovation",
];

function actionLabel(action: BulkLeadAction | null) {
  return actionOptions.find((o) => o.key === action)?.label || "Action";
}

function actionVerb(action: BulkLeadAction | null) {
  switch (action) {
    case "MOVE_TO":
      return "Move";
    case "ADD_ASSIGNEE":
      return "Assign";
    case "UPDATE_STATUS":
      return "Update Status";
    case "UPDATE_SOURCE":
      return "Update Source";
    case "UPDATE_PROJECT_TYPE":
      return "Update Type";
    case "REMOVE_ASSIGNEE":
      return "Remove Assignee";
    case "DELETE":
      return "Delete";
    default:
      return "Apply";
  }
}

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-800 focus:border-[#E85D75] focus:outline-hidden focus:ring-3 focus:ring-[#E85D75]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function BulkLeadActionsModal({
  open,
  onClose,
  selectedCount,
  assigneeOptions,
  loading = false,
  canDelete = false,
  onApply,
}: Props) {
  const [action, setAction] = useState<BulkLeadAction>("MOVE_TO");
  const [actionOpen, setActionOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [status, setStatus] = useState("New");
  const [source, setSource] = useState("Walk-in");
  const [projectType, setProjectType] = useState("Residential");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const actionRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setAction("MOVE_TO");
    setActionOpen(false);
    setAssigneeOpen(false);
    setAssigneeSearch("");
    setSelectedAssignees([]);
    setStatus("New");
    setSource("Walk-in");
    setProjectType("Residential");
    setSubmitting(false);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
        setActionOpen(false);
      }
      if (
        assigneeRef.current &&
        !assigneeRef.current.contains(e.target as Node)
      ) {
        setAssigneeOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const visibleActions = useMemo(
    () =>
      canDelete
        ? actionOptions
        : actionOptions.filter((opt) => opt.key !== "DELETE"),
    [canDelete]
  );

  const filteredAssignees = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return assigneeOptions;
    return assigneeOptions.filter((o) => o.name.toLowerCase().includes(q));
  }, [assigneeOptions, assigneeSearch]);

  const needsAssignee =
    action === "MOVE_TO" || action === "ADD_ASSIGNEE";

  const canSubmit = useMemo(() => {
    if (submitting || loading || selectedCount === 0) return false;
    if (needsAssignee) return selectedAssignees.length > 0;
    return true;
  }, [
    submitting,
    loading,
    selectedCount,
    needsAssignee,
    selectedAssignees.length,
  ]);

  const toggleAssignee = (id: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApply = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      setError("");
      await onApply({
        action,
        assigneeIds: needsAssignee ? selectedAssignees : undefined,
        status: action === "UPDATE_STATUS" ? status : undefined,
        source: action === "UPDATE_SOURCE" ? source : undefined,
        projectType:
          action === "UPDATE_PROJECT_TYPE" ? projectType : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  const secondaryLabel =
    action === "MOVE_TO"
      ? "Move To"
      : action === "ADD_ASSIGNEE"
        ? "Add Assignee"
        : action === "UPDATE_STATUS"
          ? "Status"
          : action === "UPDATE_SOURCE"
            ? "Source"
            : action === "UPDATE_PROJECT_TYPE"
              ? "Project Type"
              : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[100003] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-lead-actions-title"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-[520px] rounded-[20px] bg-white p-6 shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2
            id="bulk-lead-actions-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Bulk Lead Actions
          </h2>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.08] dark:text-gray-300"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div ref={actionRef} className="relative">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm text-gray-500">
              Select Bulk Action
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-400"
                title="Choose one action to apply on all selected leads"
              >
                i
              </span>
            </label>
            <button
              type="button"
              onClick={() => setActionOpen((v) => !v)}
              className={`${fieldClass} flex items-center justify-between text-left`}
            >
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                {action ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-sm text-gray-700 dark:bg-white/10 dark:text-gray-200">
                    {actionLabel(action)}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAction("MOVE_TO");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setAction("MOVE_TO");
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Reset action"
                    >
                      ×
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-400">Select</span>
                )}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="shrink-0 text-gray-400"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {actionOpen ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {visibleActions.map((opt) => {
                  const checked = action === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setAction(opt.key);
                        setActionOpen(false);
                        setSelectedAssignees([]);
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.04] ${
                        checked ? "bg-gray-50 dark:bg-white/[0.04]" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-[#E85D75] bg-[#E85D75] text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {needsAssignee ? (
            <div ref={assigneeRef} className="relative">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-sm text-gray-500">{secondaryLabel}</label>
                <span className="text-xs text-[#E85D75]">
                  Selected Users: {selectedAssignees.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAssigneeOpen((v) => !v)}
                className={`${fieldClass} flex items-center justify-between text-left ${
                  assigneeOpen ? "border-gray-900 ring-1 ring-gray-900" : ""
                }`}
              >
                <span className="truncate text-gray-500">
                  {selectedAssignees.length
                    ? assigneeOptions
                        .filter((o) => selectedAssignees.includes(o.id))
                        .map((o) => o.name)
                        .join(", ")
                    : "Select"}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="shrink-0 text-gray-400"
                >
                  <path
                    d={assigneeOpen ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {assigneeOpen ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <div className="border-b border-gray-100 p-2 dark:border-gray-800">
                    <input
                      type="text"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Search"
                      className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-[#E85D75] focus:outline-hidden dark:border-gray-700 dark:bg-gray-900"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {filteredAssignees.length ? (
                      filteredAssignees.map((opt) => {
                        const checked = selectedAssignees.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleAssignee(opt.id)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                          >
                            <span
                              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                checked
                                  ? "border-[#E85D75] bg-[#E85D75] text-white"
                                  : "border-[#E85D75]/60"
                              }`}
                            >
                              {checked ? "✓" : ""}
                            </span>
                            {opt.name}
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-3 py-4 text-center text-sm text-gray-400">
                        No users found
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {action === "UPDATE_STATUS" ? (
            <div>
              <label className="mb-1.5 block text-sm text-gray-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={fieldClass}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {action === "UPDATE_SOURCE" ? (
            <div>
              <label className="mb-1.5 block text-sm text-gray-500">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={fieldClass}
              >
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {action === "UPDATE_PROJECT_TYPE" ? (
            <div>
              <label className="mb-1.5 block text-sm text-gray-500">
                Project Type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className={fieldClass}
              >
                {projectTypeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {action === "DELETE" ? (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {selectedCount} lead{selectedCount === 1 ? "" : "s"} will be
              removed from the list. This is a soft delete — data is kept in the
              database but hidden from the CRM.
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full border border-gray-900 bg-white px-5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleApply()}
            className={`inline-flex h-11 min-w-[120px] items-center justify-center rounded-full px-5 text-sm font-medium text-white transition ${
              canSubmit
                ? "bg-[#E85D75] hover:bg-[#d94c65]"
                : "cursor-not-allowed bg-gray-300"
            }`}
          >
            {submitting
              ? "Applying…"
              : `${actionVerb(action)}: ${selectedCount}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
