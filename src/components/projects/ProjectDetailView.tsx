"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { projectsApi, type ProjectTaskDto } from "@/services/crmApi";
import { enumToLabel } from "@/lib/mappers";
import { designAssetUrl } from "@/lib/designAssets";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";

type ProjectDetail = {
  id: string;
  name: string;
  clientName?: string | null;
  phone?: string | null;
  status?: string;
  projectType?: string | null;
  scope?: string | null;
  address?: string | null;
  budget?: string | null;
  vendorBudget?: string | null;
  delayDays?: number;
  retentionPercent?: number;
  retentionAmount?: number;
  progress?: number;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  latestRemark?: string | null;
  financialYear?: string | null;
  store?: { id: string; name: string } | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  assignedTo?: { id: string; name: string } | null;
  salesOwner?: { id: string; name: string } | null;
  tasks?: Array<{
    id: string;
    title: string;
    startDate?: string | null;
    dueDate?: string | null;
    status: string;
  }>;
};

type ProjectFile = {
  id: string;
  name?: string;
  fileName?: string;
  url?: string;
  fileUrl?: string;
  kind?: string;
};

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

function statusTone(status?: string) {
  const key = String(status || "").toUpperCase();
  if (key === "COMPLETED" || key === "DONE") return "bg-emerald-50 text-emerald-800";
  if (key === "ON_HOLD" || key === "CANCELLED") return "bg-rose-50 text-rose-800";
  if (key === "IN_PROGRESS" || key === "EXECUTION") return "bg-amber-50 text-amber-800";
  return "bg-[#f4efe6] text-[#9a7748]";
}

function priorityTone(priority?: string) {
  const key = String(priority || "").toUpperCase();
  if (key === "URGENT") return "text-rose-700";
  if (key === "HIGH") return "text-[#b4533a]";
  if (key === "LOW") return "text-[#8a8175]";
  return "text-[#9a7748]";
}

function isTaskForVendor(task: ProjectTaskDto, userId?: string, vendorId?: string | null) {
  if (task.assignedToId && userId && task.assignedToId === userId) return true;
  const assigneeVendorId = task.assignedTo?.vendorId;
  if (vendorId && assigneeVendorId && assigneeVendorId === vendorId) return true;
  return false;
}

function isOverdue(task: ProjectTaskDto) {
  if (!task.dueDate || task.status === "DONE" || task.status === "CANCELLED") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#9a7748]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#111]">{value || "—"}</p>
    </div>
  );
}

export default function ProjectDetailView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const vendorPanel = isVendorPanelUser(user);
  const [row, setRow] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<ProjectTaskDto[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([
      projectsApi.get(projectId),
      projectsApi.listTasks(projectId).catch(() => [] as ProjectTaskDto[]),
      projectsApi.listProjectFiles(projectId).catch(() => [] as ProjectFile[]),
    ])
      .then(([project, nextTasks, nextFiles]) => {
        if (!alive) return;
        setRow(project as ProjectDetail);
        setTasks(Array.isArray(nextTasks) ? nextTasks : []);
        setFiles(Array.isArray(nextFiles) ? (nextFiles as ProjectFile[]) : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load project");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const timeline = useMemo(() => {
    const source = (tasks.length ? tasks : row?.tasks || []) as ProjectTaskDto[];
    const active = source.filter((task) => String(task.status).toUpperCase() !== "CANCELLED");
    if (!vendorPanel) return active;
    return active.filter((task) => isTaskForVendor(task, user?.id, user?.vendorId));
  }, [tasks, row?.tasks, vendorPanel, user?.id, user?.vendorId]);

  const taskStats = useMemo(() => {
    const todo = timeline.filter((t) => String(t.status).toUpperCase() === "TODO").length;
    const doing = timeline.filter((t) => String(t.status).toUpperCase() === "IN_PROGRESS").length;
    const done = timeline.filter((t) => String(t.status).toUpperCase() === "DONE").length;
    return { todo, doing, done, total: timeline.length };
  }, [timeline]);

  if (loading) {
    return <PageSkeleton />;
  }
  if (error || !row) {
    return (
      <div className="space-y-3">
        <Link href="/projects" className="text-sm text-[#9a7748]">
          ← Back to projects
        </Link>
        <p className="text-sm text-[#8a7b68]">{error || "Project not found."}</p>
      </div>
    );
  }

  const customer = row.customer?.name || row.clientName || "—";
  const phone = vendorPanel ? "" : row.customer?.phone || row.phone || "";

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#9a7748]"
        >
          <span className="text-lg leading-none">‹</span>
          Projects
        </Link>
        {vendorPanel ? (
          <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-[#9a7748]">Vendor panel</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">
              {row.projectType ? enumToLabel(row.projectType) : "Assigned site"}
            </p>
            <h1 className="vendor-serif mt-1 text-2xl text-[#111] sm:text-3xl">{row.name}</h1>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusTone(row.status)}`}>
            {enumToLabel(row.status || "KICKOFF")}
          </span>
        </div>
        <p className="mt-2 text-sm text-[#6b645b]">{row.address || "Location not listed"}</p>
      </div>

      <div className="vendor-card grid gap-5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        <Field label="Customer" value={<>{customer}{phone ? <span className="mt-0.5 block text-xs font-normal text-[#8a8175]">{phone}</span> : null}</>} />
        <Field
          label={vendorPanel ? "Vendor budget" : "Customer budget"}
          value={
            vendorPanel
              ? row.vendorBudget
                ? `₹ ${row.vendorBudget}`
                : "—"
              : row.budget
                ? `₹ ${row.budget}`
                : "—"
          }
        />
        {vendorPanel ? (
          <Field
            label="Delay retention"
            value={
              row.retentionPercent
                ? `${row.retentionPercent}%${row.delayDays ? ` · ${row.delayDays}d late` : ""}${
                    row.retentionAmount ? ` · ₹ ${row.retentionAmount}` : ""
                  }`
                : "None"
            }
          />
        ) : null}
        <Field label="Progress" value={`${Number(row.progress || 0)}%`} />
        <Field label="Store" value={row.store?.name} />
        <Field label="Scope" value={row.scope ? enumToLabel(row.scope) : "—"} />
        <Field label="Start" value={formatDate(row.startDate)} />
        <Field label="End" value={formatDate(row.endDate)} />
        <Field label="Financial year" value={row.financialYear} />
        <Field label="Assigned to" value={row.assignedTo?.name} />
        <Field label="Sales owner" value={row.salesOwner?.name} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="vendor-card p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3f3a33]">
            {row.description || "No description added."}
          </p>
        </div>
        <div className="vendor-card p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">Latest remark</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3f3a33]">
            {row.latestRemark || "No remarks yet."}
          </p>
        </div>
      </div>

      <div className="vendor-card overflow-hidden">
        <div className="border-b border-[#eee6d8] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">
                {vendorPanel ? "Your tasks" : "Tasks"}
              </p>
              <h2 className="vendor-serif mt-1 text-xl text-[#111]">
                {vendorPanel ? "Assigned to you" : "Work on this site"}
              </h2>
            </div>
            {vendorPanel && taskStats.total ? (
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-[#f4efe6] px-2.5 py-1 text-[#9a7748]">
                  {taskStats.todo} todo
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                  {taskStats.doing} in progress
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                  {taskStats.done} done
                </span>
              </div>
            ) : null}
          </div>
        </div>
        {timeline.length ? (
          <ul className="space-y-3 p-4 sm:p-5">
            {timeline.map((task) => {
              const overdue = isOverdue(task);
              const status = String(task.status || "TODO").toUpperCase();
              return (
                <li
                  key={task.id}
                  className="rounded-2xl border border-[#eee6d8] bg-[#fdfbf7] p-4 shadow-[0_1px_0_rgba(28,22,16,0.03)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-[#111]">{task.title}</p>
                        {task.priority ? (
                          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${priorityTone(task.priority)}`}>
                            {enumToLabel(task.priority)}
                          </span>
                        ) : null}
                      </div>
                      {task.description ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#6b645b]">{task.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8a8175]">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#eadfcf] bg-white px-2.5 py-1">
                          <span className="text-[#9a7748]">Schedule</span>
                          {formatDate(task.startDate)} – {formatDate(task.dueDate)}
                        </span>
                        {overdue ? (
                          <span className="rounded-lg bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                            Overdue
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusTone(status)}`}>
                      {enumToLabel(status)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-[#8a8175] sm:px-5">
            {vendorPanel
              ? "No tasks assigned to your vendor on this project."
              : "No tasks listed on this project."}
          </p>
        )}
      </div>

      <div className="vendor-card overflow-hidden">
        <div className="border-b border-[#eee6d8] px-4 py-3 sm:px-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">Documents</p>
          <h2 className="vendor-serif mt-1 text-xl text-[#111]">Files</h2>
        </div>
        {files.length ? (
          <ul className="divide-y divide-[#eee6d8]">
            {files.map((file) => {
              const name = file.fileName || file.name || "File";
              const href = designAssetUrl(file.fileUrl || file.url);
              return (
                <li key={file.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-sm font-medium text-[#111]">{name}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8a8175]">
                      {enumToLabel(file.kind || "document")}
                    </p>
                  </div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs uppercase tracking-[0.14em] text-[#9a7748]"
                    >
                      Open
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-[#8a8175] sm:px-5">No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
