"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { projectsApi, warrantyApi } from "@/services/crmApi";
import { formatDate, labelToEnum, warrantyTypeToLabel } from "@/lib/mappers";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  phone?: string | null;
  address?: string | null;
  assignees?: Array<{ userId?: string; user?: { id?: string; name?: string } | null }>;
};

type IssueRow = {
  id: string;
  subject?: string | null;
  type?: string | null;
  priority?: string | null;
  status?: string | null;
  issue?: string | null;
  resolution?: string | null;
  openedAt?: string | null;
  createdAt?: string;
  clientName?: string | null;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    clientName?: string | null;
    address?: string | null;
    assignees?: Array<{ userId?: string; user?: { id?: string; name?: string } | null }>;
  } | null;
};

const PAGE_SIZE = 8;

const ISSUE_TYPES = [
  { value: "COMPLAINT", label: "Complaint" },
  { value: "SERVICE_VISIT", label: "Service Visit" },
  { value: "WARRANTY_CLAIM", label: "Warranty Claim" },
  { value: "INSPECTION", label: "Inspection" },
];

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";

function codeFromId(prefix: string, id: string) {
  const digits = id.replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `${prefix}-${digits}`;
}

function statusMeta(status?: string | null) {
  const key = String(status || "OPEN").toUpperCase();
  if (key === "CLOSED") return { label: "Approved", color: "success" as const };
  if (key === "RESOLVED") return { label: "Pending approval", color: "warning" as const };
  if (key === "REJECTED") return { label: "Not solved", color: "error" as const };
  if (key === "IN_PROGRESS" || key === "ASSIGNED" || key === "WAITING_PARTS") {
    return { label: "In Progress", color: "warning" as const };
  }
  return { label: "Open", color: "error" as const };
}

function priorityMeta(priority?: string | null) {
  const key = String(priority || "MEDIUM").toUpperCase();
  if (key === "URGENT") return { label: "Urgent", color: "error" as const };
  if (key === "HIGH") return { label: "High", color: "warning" as const };
  if (key === "LOW") return { label: "Low", color: "info" as const };
  return { label: "Medium", color: "light" as const };
}

function typeLabel(type?: string | null) {
  return warrantyTypeToLabel(String(type || "COMPLAINT").toUpperCase());
}

function franchiseeNames(project?: ProjectRow | IssueRow["project"]) {
  return (project?.assignees || [])
    .map((row) => row.user?.name)
    .filter(Boolean)
    .join(", ");
}

export default function CrmCustomerIssues() {
  const searchParams = useSearchParams();
  const prefillProjectId = searchParams.get("projectId") || "";
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(Boolean(prefillProjectId));
  const [viewing, setViewing] = useState<IssueRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [form, setForm] = useState({
    projectId: prefillProjectId,
    type: "COMPLAINT",
    priority: "MEDIUM",
    subject: "",
    issue: "",
  });

  const load = async () => {
    const [projectRes, issueRes] = await Promise.all([
      projectsApi.list({ limit: 200 }),
      warrantyApi.list({ limit: 200 }),
    ]);
    setProjects((projectRes.items || []) as ProjectRow[]);
    setIssues((issueRes.items || []) as IssueRow[]);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load customer issues");
          setProjects([]);
          setIssues([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return issues.filter((row) => {
      const key = String(row.status || "OPEN").toUpperCase();
      if (statusFilter === "open") return key === "OPEN";
      if (statusFilter === "progress") {
        return key === "IN_PROGRESS" || key === "ASSIGNED" || key === "WAITING_PARTS";
      }
      if (statusFilter === "pending") return key === "RESOLVED";
      if (statusFilter === "approved") return key === "CLOSED";
      if (statusFilter === "rejected") return key === "REJECTED";
      return true;
    });
  }, [issues, statusFilter]);

  const totals = useMemo(() => {
    const pending = issues.filter((row) => String(row.status).toUpperCase() === "RESOLVED").length;
    const approved = issues.filter((row) => String(row.status).toUpperCase() === "CLOSED").length;
    const open = issues.filter((row) => statusMeta(row.status).label === "Open").length;
    return { total: issues.length, open, pending, approved };
  }, [issues]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedProject = projects.find((row) => row.id === form.projectId);

  const createIssue = async () => {
    if (!form.projectId) {
      setError("Select the project for this customer issue.");
      return;
    }
    if (!form.subject.trim()) {
      setError("Issue title is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await warrantyApi.create({
        projectId: form.projectId,
        type: form.type,
        priority: labelToEnum(form.priority) || form.priority,
        subject: form.subject.trim(),
        issue: form.issue.trim() || form.subject.trim(),
        clientName: selectedProject?.clientName || null,
        phone: selectedProject?.phone || null,
        status: "OPEN",
      });
      setShowForm(false);
      setForm({
        projectId: "",
        type: "COMPLAINT",
        priority: "MEDIUM",
        subject: "",
        issue: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add issue");
    } finally {
      setSaving(false);
    }
  };

  const decide = async (row: IssueRow, solved: boolean) => {
    setSaving(true);
    setError("");
    try {
      const note = approvalNote.trim();
      await warrantyApi.update(row.id, {
        status: solved ? "CLOSED" : "REJECTED",
        resolution: note
          ? `${row.resolution ? `${row.resolution}\n` : ""}${solved ? "CRM approved" : "CRM: not solved"}: ${note}`
          : row.resolution || (solved ? "Approved as solved" : "Not solved"),
        resolvedAt: solved ? new Date().toISOString() : null,
      });
      setApprovalNote("");
      setViewing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update issue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span className="mx-1">›</span>
            <span className="text-gray-800 dark:text-white/90">Customer Issue</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Customer Issue
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Add issues against a project. Assigned franchisees can see them and update work status.
            CRM approves whether the issue is solved.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
        >
          + Add Issue
        </Button>
      </div>

      {error && !showForm && !viewing ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={card}>
          <p className="text-xs text-gray-500">Total Issues</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">
            {loading ? "—" : totals.total}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Open</p>
          <p className="mt-2 text-2xl font-semibold text-error-500">{totals.open}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Pending approval</p>
          <p className="mt-2 text-2xl font-semibold text-warning-600">{totals.pending}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Approved</p>
          <p className="mt-2 text-2xl font-semibold text-success-600">{totals.approved}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Issues by Project
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="progress">In Progress</option>
            <option value="pending">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Not solved</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Franchisees</th>
                <th className="px-4 py-2">Issue ID</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Raised</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, index) => {
                const status = statusMeta(row.status);
                const priority = priorityMeta(row.priority);
                const key = String(row.status || "").toUpperCase();
                return (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 text-gray-500">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {row.project?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {row.project?.clientName || row.clientName || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {franchiseeNames(row.project) || "Not assigned"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{codeFromId("ISS", row.id)}</td>
                    <td className="max-w-[220px] px-4 py-3 text-gray-600">
                      <p className="truncate">{row.subject || row.issue || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(row.openedAt || row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" color={priority.color}>
                        {priority.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" color={status.color}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setApprovalNote("");
                            setViewing(row);
                          }}
                          className="text-sm font-medium text-brand-600"
                        >
                          Review
                        </button>
                        {key !== "CLOSED" ? (
                          <>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void decide(row, true)}
                              className="text-sm font-medium text-success-600"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void decide(row, false)}
                              className="text-sm font-medium text-error-500"
                            >
                              Not solved
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !paged.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    No customer issues yet. Add one for a project.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-500">
          <p>
            Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to{" "}
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </p>
          <div className="flex gap-1">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-lg text-sm ${
                  n === page
                    ? "bg-brand-500 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Add Customer Issue
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400">
                ✕
              </button>
            </div>
            {error ? (
              <p className="mb-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600">
                {error}
              </p>
            ) : null}
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-sm text-gray-600">Project</p>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className={fieldClass}
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.clientName ? ` · ${project.clientName}` : ""}
                    </option>
                  ))}
                </select>
                {selectedProject ? (
                  <p className="mt-1 text-xs text-gray-400">
                    Franchisees: {franchiseeNames(selectedProject) || "none assigned yet"}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-sm text-gray-600">Issue Type</p>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className={fieldClass}
                  >
                    {ISSUE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-600">Priority</p>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className={fieldClass}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Issue Title</p>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Kitchen shutter not closing"
                  className={fieldClass}
                />
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Description</p>
                <textarea
                  value={form.issue}
                  onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))}
                  placeholder="Describe the customer / site issue…"
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void createIssue()} disabled={saving}>
                {saving ? "Saving…" : "Add Issue"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {codeFromId("ISS", viewing.id)}
              </h3>
              <button type="button" onClick={() => setViewing(null)} className="text-gray-400">
                ✕
              </button>
            </div>
            {error ? (
              <p className="mb-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600">
                {error}
              </p>
            ) : null}
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">Project: </span>
                {viewing.project?.name || "—"}
              </p>
              <p>
                <span className="text-gray-400">Franchisees: </span>
                {franchiseeNames(viewing.project) || "Not assigned"}
              </p>
              <p>
                <span className="text-gray-400">Status: </span>
                {statusMeta(viewing.status).label}
              </p>
              <p className="font-medium text-gray-800 dark:text-white/90">{viewing.subject}</p>
              <p className="text-gray-600">{viewing.issue || "—"}</p>
              <p>
                <span className="text-gray-400">Franchisee update: </span>
                {viewing.resolution || "No update yet."}
              </p>
              {String(viewing.status).toUpperCase() !== "CLOSED" ? (
                <div>
                  <p className="mb-1 text-sm text-gray-600">Approval note</p>
                  <textarea
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    rows={3}
                    placeholder="Optional note when you approve or mark not solved"
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              {String(viewing.status).toUpperCase() !== "CLOSED" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void decide(viewing, false)}
                  >
                    Not solved
                  </Button>
                  <Button size="sm" disabled={saving} onClick={() => void decide(viewing, true)}>
                    Approve solved
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
