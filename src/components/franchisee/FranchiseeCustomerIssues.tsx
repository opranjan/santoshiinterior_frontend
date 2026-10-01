"use client";

import Link from "next/link";
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
  if (key === "RESOLVED" || key === "CLOSED") {
    return { label: key === "CLOSED" ? "Closed" : "Resolved", color: "success" as const };
  }
  if (key === "IN_PROGRESS" || key === "ASSIGNED" || key === "WAITING_PARTS") {
    return { label: "In Progress", color: "warning" as const };
  }
  if (key === "REJECTED") return { label: "Rejected", color: "error" as const };
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

export default function FranchiseeCustomerIssues() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<IssueRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    projectId: "",
    type: "COMPLAINT",
    priority: "MEDIUM",
    subject: "",
    issue: "",
  });

  const load = async () => {
    const [projectRes, issueRes] = await Promise.all([
      projectsApi.list({ limit: 100 }),
      warrantyApi.list({ limit: 100 }),
    ]);
    setProjects((projectRes.items || []) as ProjectRow[]);
    setIssues((issueRes.items || []) as IssueRow[]);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) {
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

  const assignedIds = useMemo(() => new Set(projects.map((row) => row.id)), [projects]);

  const mine = useMemo(
    () =>
      issues.filter((row) => {
        const projectId = row.projectId || row.project?.id;
        return projectId && assignedIds.has(projectId);
      }),
    [issues, assignedIds]
  );

  const filtered = useMemo(() => {
    return mine.filter((row) => {
      const bucket = statusMeta(row.status).label;
      if (statusFilter === "open") return bucket === "Open";
      if (statusFilter === "progress") return bucket === "In Progress";
      if (statusFilter === "resolved") return bucket === "Resolved" || bucket === "Closed";
      return true;
    });
  }, [mine, statusFilter]);

  const totals = useMemo(() => {
    const open = mine.filter((row) => statusMeta(row.status).label === "Open").length;
    const progress = mine.filter((row) => statusMeta(row.status).label === "In Progress").length;
    const resolved = mine.filter((row) => {
      const label = statusMeta(row.status).label;
      return label === "Resolved" || label === "Closed";
    }).length;
    return { total: mine.length, open, progress, resolved };
  }, [mine]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedProject = projects.find((row) => row.id === form.projectId);

  const raiseIssue = async () => {
    if (!form.projectId) {
      setError("Select the assigned project for this customer issue.");
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
      setError(err instanceof Error ? err.message : "Failed to raise issue");
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
            Raise site problems on your assigned projects. The company team updates status after you
            raise them.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
        >
          + Raise Issue
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={card}>
          <p className="text-xs text-gray-500">Total Issues</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">
            {loading ? "—" : totals.total}
          </p>
          <p className="mt-2 text-xs font-medium text-brand-600">All cases</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Open</p>
          <p className="mt-2 text-2xl font-semibold text-error-500">{totals.open}</p>
          <p className="mt-2 text-xs text-gray-400">Awaiting company</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">In Progress</p>
          <p className="mt-2 text-2xl font-semibold text-warning-600">{totals.progress}</p>
          <p className="mt-2 text-xs text-gray-400">Being worked</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Resolved</p>
          <p className="mt-2 text-2xl font-semibold text-success-600">{totals.resolved}</p>
          <p className="mt-2 text-xs text-gray-400">Closed by company</p>
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
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Site / Project Name</th>
                <th className="px-4 py-2">Issue ID</th>
                <th className="px-4 py-2">Issue Type</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Raised Date</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, index) => {
                const status = statusMeta(row.status);
                const priority = priorityMeta(row.priority);
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
                    <td className="px-4 py-3 text-gray-600">{codeFromId("ISS", row.id)}</td>
                    <td className="px-4 py-3 text-gray-600">{typeLabel(row.type)}</td>
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
                      <button
                        type="button"
                        onClick={() => setViewing(row)}
                        className="text-sm font-medium text-brand-600"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && !paged.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    No customer issues yet. Raise one when a site problem comes up.
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

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-gray-600 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-gray-300">
        Customer issues are site problems you raise for assigned projects. The company reviews and
        updates them — this is not a customer collection screen.
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Raise Issue
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
                  <option value="">Select assigned project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.clientName ? ` · ${project.clientName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {selectedProject?.clientName ? (
                <p className="text-xs text-gray-500">Customer: {selectedProject.clientName}</p>
              ) : null}
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
              <Button size="sm" onClick={raiseIssue} disabled={saving}>
                {saving ? "Raising…" : "Raise Issue"}
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
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">Project: </span>
                {viewing.project?.name || "—"}
              </p>
              <p>
                <span className="text-gray-400">Customer: </span>
                {viewing.project?.clientName || viewing.clientName || "—"}
              </p>
              <p>
                <span className="text-gray-400">Type: </span>
                {typeLabel(viewing.type)}
              </p>
              <p className="font-medium text-gray-800 dark:text-white/90">{viewing.subject}</p>
              <p className="text-gray-600">{viewing.issue || "—"}</p>
              <p>
                <span className="text-gray-400">Company update: </span>
                {viewing.resolution || "No update yet."}
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <Button size="sm" onClick={() => setViewing(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
