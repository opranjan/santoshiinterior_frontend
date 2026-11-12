"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import {
  projectsApi,
  usersApi,
  vendorsApi,
  type ProjectTaskDto,
} from "@/services/crmApi";
import { enumToLabel } from "@/lib/mappers";
import { ListSkeleton, PageSkeleton } from "@/components/ui/loader/CrmLoader";

type Props = {
  projectId: string;
};

const statuses = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type FilterTab = "ALL" | "TODO" | "IN_PROGRESS" | "DONE";

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]";

function toYmd(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function dateLabel(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

function isOverdue(task: ProjectTaskDto) {
  if (!task.dueDate || task.status === "DONE" || task.status === "CANCELLED") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function parseAssigneeValue(value: string) {
  if (!value) return { assignedToId: null as string | null, vendorId: null as string | null };
  if (value.startsWith("vendor:")) {
    return { assignedToId: null as string | null, vendorId: value.slice(7) };
  }
  return { assignedToId: value, vendorId: null as string | null };
}

function assigneeDisplay(
  task: ProjectTaskDto,
  users: Array<{ id: string; name: string; vendorName?: string | null }>,
  vendors: Array<{ id: string; name: string }>
) {
  if (task.assignedTo?.name) return task.assignedTo.name;
  if (task.assignedToId) {
    const user = users.find((u) => u.id === task.assignedToId);
    if (user) return user.vendorName ? `${user.name} · ${user.vendorName}` : user.name;
  }
  const vendorId = (task as { vendorId?: string | null }).vendorId;
  if (vendorId) {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (vendor) return vendor.name;
  }
  return "Unassigned";
}

function assigneeSelectValue(task: ProjectTaskDto) {
  const vendorId = (task as { vendorId?: string | null }).vendorId;
  if (vendorId) return `vendor:${vendorId}`;
  return task.assignedToId || "";
}

function stripTone(task: ProjectTaskDto) {
  if (isOverdue(task)) return "bg-rose-500";
  if (task.status === "IN_PROGRESS") return "bg-[#5b7c99]";
  if (task.status === "DONE") return "bg-emerald-500";
  if (task.priority === "LOW") return "bg-emerald-400";
  if (task.priority === "HIGH" || task.priority === "URGENT") return "bg-[#c45c3a]";
  return "bg-[#d4a017]";
}

function badgeTone(task: ProjectTaskDto) {
  if (isOverdue(task)) return "bg-rose-50 text-rose-700";
  if (task.status === "IN_PROGRESS") return "bg-[#e8eef4] text-[#3d5a7a]";
  if (task.status === "DONE") return "bg-emerald-50 text-emerald-800";
  if (task.priority === "LOW") return "bg-emerald-50 text-emerald-700";
  if (task.priority === "HIGH" || task.priority === "URGENT") return "bg-[#f8ebe6] text-[#b4533a]";
  return "bg-[#f6efe4] text-[#9a7748]";
}

function badgeLabel(task: ProjectTaskDto) {
  if (isOverdue(task)) return "Overdue";
  if (task.status === "IN_PROGRESS") return "In Progress";
  if (task.status === "DONE") return "Done";
  return enumToLabel(task.priority || "MEDIUM");
}

export default function ProjectTasksPanel({ projectId }: Props) {
  const [project, setProject] = useState<{
    id: string;
    name: string;
    client: string;
    description?: string | null;
    startIso?: string;
    endIso?: string;
  } | null>(null);
  const [tasks, setTasks] = useState<ProjectTaskDto[]>([]);
  const [users, setUsers] = useState<
    Array<{ id: string; name: string; vendorId?: string | null; vendorName?: string | null }>
  >([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("TODO");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [dtoRaw, taskList] = await Promise.all([
          projectsApi.get(projectId),
          projectsApi.listTasks(projectId),
        ]);
        if (cancelled) return;
        const dto = dtoRaw as Record<string, unknown>;
        const customer = (dto.customer || null) as { name?: string } | null;
        setProject({
          id: String(dto.id || projectId),
          name: String(dto.name || "Project"),
          client: String(dto.clientName || customer?.name || ""),
          description: dto.description ? String(dto.description) : null,
          startIso: dto.startDate ? String(dto.startDate) : undefined,
          endIso: dto.endDate ? String(dto.endDate) : undefined,
        });
        setTasks(Array.isArray(taskList) ? taskList : []);
        try {
          const [userPage, vendorPage] = await Promise.all([
            usersApi.list({ limit: 100, isActive: "true" }),
            vendorsApi.list({ limit: 100 }).catch(() => ({ items: [] })),
          ]);
          if (!cancelled) {
            setUsers(
              (userPage.items || []).map((u) => ({
                id: u.id,
                name: u.name,
                vendorId: u.vendorId || u.vendor?.id || null,
                vendorName: u.vendor?.name || null,
              }))
            );
            setVendors(
              (vendorPage.items || [])
                .filter((v) => !/archiv|inactive|disabled/i.test(String(v.status || "")))
                .map((v) => ({ id: v.id, name: v.name }))
            );
          }
        } catch {
          /* optional */
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load project tasks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setPriority("MEDIUM");
    setStartDate("");
    setDueDate("");
    setAssignedToId("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (task: ProjectTaskDto) => {
    setEditingId(task.id);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setStatus(task.status || "TODO");
    setPriority(task.priority || "MEDIUM");
    setStartDate(toYmd(task.startDate));
    setDueDate(toYmd(task.dueDate));
    setAssignedToId(assigneeSelectValue(task));
    setShowForm(true);
  };

  const saveTask = async () => {
    if (!title.trim() || saving || !project) return;
    setSaving(true);
    setError("");
    try {
      const assignee = parseAssigneeValue(assignedToId);
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        startDate: startDate || null,
        dueDate: dueDate || null,
        ...(assignee.vendorId
          ? { vendorId: assignee.vendorId, assignedToId: null }
          : { assignedToId: assignee.assignedToId, vendorId: null }),
      };
      if (editingId) {
        const updated = await projectsApi.updateTask(project.id, editingId, body);
        setTasks((current) => current.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const created = await projectsApi.createTask(project.id, body);
        setTasks((current) =>
          [...current, created].sort((a, b) => {
            const aTime = new Date(a.startDate || a.dueDate || a.createdAt).getTime();
            const bTime = new Date(b.startDate || b.dueDate || b.createdAt).getTime();
            return aTime - bTime;
          })
        );
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const patchTask = async (taskId: string, body: Record<string, unknown>) => {
    const prev = tasks;
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, ...body } : t)));
    try {
      const updated = await projectsApi.updateTask(projectId, taskId, body);
      setTasks((current) => current.map((t) => (t.id === taskId ? updated : t)));
    } catch {
      setTasks(prev);
      setError("Could not update task");
    }
  };

  const removeTask = async (taskId: string) => {
    if (!window.confirm("Delete this task?")) return;
    const prev = tasks;
    setTasks(tasks.filter((t) => t.id !== taskId));
    try {
      await projectsApi.removeTask(projectId, taskId);
    } catch {
      setTasks(prev);
      setError("Could not delete task");
    }
  };

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "CANCELLED"), [tasks]);
  const counts = useMemo(
    () => ({
      all: activeTasks.length,
      todo: activeTasks.filter((t) => t.status === "TODO").length,
      progress: activeTasks.filter((t) => t.status === "IN_PROGRESS").length,
      done: activeTasks.filter((t) => t.status === "DONE").length,
      overdue: activeTasks.filter((t) => isOverdue(t)).length,
    }),
    [activeTasks]
  );

  const visible = useMemo(() => {
    let list = activeTasks;
    if (filter !== "ALL") list = list.filter((t) => t.status === filter);
    if (priorityFilter !== "ALL") list = list.filter((t) => t.priority === priorityFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          String(t.description || "").toLowerCase().includes(q) ||
          assigneeDisplay(t, users, vendors).toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTasks, filter, priorityFilter, search, users, vendors]);

  const tabs: Array<{ id: FilterTab; label: string; count: number }> = [
    { id: "ALL", label: "All", count: counts.all },
    { id: "TODO", label: "To Do", count: counts.todo },
    { id: "IN_PROGRESS", label: "In Progress", count: counts.progress },
    { id: "DONE", label: "Done", count: counts.done },
  ];

  if (loading) {
    return (
      <div className="vendor-form min-h-[70vh]">
        <PageSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="vendor-form rounded-2xl border border-[#eadfcf] bg-white p-8 text-sm text-rose-700 dark:border-[#3a342c] dark:bg-[#1a1714]">
        {error || "Project not found"}
        <div className="mt-4">
          <Link href="/projects" className="font-semibold text-[#9a7748] hover:text-[#1c1610]">
            ← Back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-form min-h-[calc(100vh-7rem)] space-y-5">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-[#8a7b68]">
        <Link href="/" className="hover:text-[#1c1610]">
          Home
        </Link>
        <span>/</span>
        <Link href="/projects" className="hover:text-[#1c1610]">
          Projects
        </Link>
        <span>/</span>
        <span className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{project.name}</span>
      </nav>

      <section className="rounded-3xl border border-[#eadfcf] bg-[#f7f1e8] p-5 dark:border-[#3a342c] dark:bg-[#1a1714] sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#ebe1d3] text-[#9a7748]">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 20V10l8-6 8 6v10" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1
                className="font-serif text-3xl leading-tight text-[#1c1610] dark:text-[#f3ece2]"
                style={serif}
              >
                {project.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[#8a7b68]">
                {project.description ||
                  "Track interior work across stores – status, progress, and team."}
              </p>
              <p className="mt-1 text-xs text-[#b3a594]">
                {project.client || "No client"}
                {project.startIso || project.endIso
                  ? ` · ${dateLabel(project.startIso)} → ${dateLabel(project.endIso)}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:w-auto xl:min-w-[520px]">
            {[
              {
                label: "Total Tasks",
                value: counts.all,
                icon: (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#5c2a2a] text-white">✓</span>
                ),
              },
              {
                label: "To Do",
                value: counts.todo,
                icon: (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ebe1d3] text-[#9a7748]">⏱</span>
                ),
              },
              {
                label: "In Progress",
                value: counts.progress,
                icon: (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ebe1d3] text-[#9a7748]">▶</span>
                ),
              },
              {
                label: "Overdue",
                value: counts.overdue,
                icon: (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-100 text-rose-700">!</span>
                ),
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/70 bg-white px-3.5 py-3 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                      {card.label}
                    </p>
                    <p className="mt-1 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]" style={serif}>
                      {card.value}
                    </p>
                  </div>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-[#eadfcf] bg-white p-1 dark:border-[#3a342c] dark:bg-[#1a1714]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${
                  filter === tab.id
                    ? "bg-[#5c2a2a] text-white"
                    : "text-[#8a7b68] hover:bg-[#fbf8f3]"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#5c2a2a] px-5 text-sm font-semibold text-white"
          >
            + Add Task
          </button>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="h-11 w-full rounded-full border border-[#eadfcf] bg-white pl-10 pr-4 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-11 rounded-full border border-[#eadfcf] bg-white px-4 text-sm text-[#6b645b] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          >
            <option value="ALL">All Priority</option>
            {priorities.map((p) => (
              <option key={p} value={p}>
                {enumToLabel(p)}
              </option>
            ))}
          </select>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#eadfcf] bg-white px-4 text-sm font-medium text-[#6b645b] dark:border-[#3a342c] dark:bg-[#1a1714]"
          >
            Project detail
          </Link>
          <Link
            href="/projects"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#eadfcf] bg-white px-4 text-sm font-medium text-[#6b645b] dark:border-[#3a342c] dark:bg-[#1a1714]"
          >
            All projects
          </Link>
        </div>
      </section>

      {showForm ? (
        <form
          className="space-y-3 rounded-3xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#1a1714]"
          onSubmit={(e) => {
            e.preventDefault();
            void saveTask();
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
              {editingId ? "Edit task" : "New task"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68]"
            >
              Close
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={fieldClass}
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${fieldClass} h-auto py-2.5`}
                placeholder="Optional details"
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {enumToLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={fieldClass}>
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {enumToLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Start date</label>
              <DatePickerField
                id={`project-task-start-${project.id}`}
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start"
              />
            </div>
            <div>
              <label className={labelClass}>Due date</label>
              <DatePickerField
                id={`project-task-end-${project.id}`}
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select due"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Assign to</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Unassigned</option>
                <optgroup label="Team">
                  {users
                    .filter((u) => !u.vendorId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </optgroup>
                {vendors.length ? (
                  <optgroup label="Vendors">
                    {vendors.map((v) => (
                      <option key={v.id} value={`vendor:${v.id}`}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="inline-flex h-11 items-center rounded-full bg-[#5c2a2a] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Save task"}
          </button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <section className="space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#eadfcf] bg-white px-6 py-16 text-center dark:border-[#3a342c] dark:bg-[#1a1714]">
            <p className="font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]" style={serif}>
              {filter === "ALL" && !search ? "No tasks yet" : "No matching tasks"}
            </p>
            <p className="mt-2 text-sm text-[#8a7b68]">
              Add a task with dates and an assignee so the team knows what to do next.
            </p>
            {!showForm ? (
              <button
                type="button"
                onClick={openCreate}
                className="mt-5 inline-flex h-11 items-center rounded-full bg-[#5c2a2a] px-5 text-sm font-semibold text-white"
              >
                + Add first task
              </button>
            ) : null}
          </div>
        ) : (
          visible.map((task) => {
            const overdue = isOverdue(task);
            return (
              <article
                key={task.id}
                className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
              >
                <div className="flex">
                  <div className={`w-1.5 shrink-0 ${stripTone(task)}`} />
                  <div className="min-w-0 flex-1 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeTone(task)}`}
                          >
                            {badgeLabel(task)}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a7b68]">
                            {enumToLabel(task.status)}
                          </span>
                        </div>
                        <h3
                          className={`mt-2 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2] ${
                            task.status === "DONE" ? "line-through opacity-60" : ""
                          }`}
                          style={serif}
                        >
                          {task.title}
                        </h3>
                        {task.description ? (
                          <p className="mt-1 text-sm leading-relaxed text-[#6b645b]">{task.description}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#8a7b68]">
                          <span>
                            Start <strong className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{dateLabel(task.startDate)}</strong>
                          </span>
                          <span>
                            Due{" "}
                            <strong className={`font-medium ${overdue ? "text-rose-700" : "text-[#1c1610] dark:text-[#f3ece2]"}`}>
                              {dateLabel(task.dueDate)}
                            </strong>
                          </span>
                          <span>
                            Assigned{" "}
                            <strong className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                              {assigneeDisplay(task, users, vendors)}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => void patchTask(task.id, { status: e.target.value })}
                          className="h-10 rounded-full border border-[#eadfcf] bg-[#fdfbf7] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b645b] dark:border-[#3a342c] dark:bg-[#161411]"
                          aria-label="Update status"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {enumToLabel(s)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={assigneeSelectValue(task)}
                          onChange={(e) => {
                            const next = parseAssigneeValue(e.target.value);
                            void patchTask(
                              task.id,
                              next.vendorId
                                ? { vendorId: next.vendorId, assignedToId: null }
                                : { assignedToId: next.assignedToId, vendorId: null }
                            );
                          }}
                          className="h-10 max-w-[160px] rounded-full border border-[#eadfcf] bg-[#fdfbf7] px-3 text-xs font-semibold text-[#6b645b] dark:border-[#3a342c] dark:bg-[#161411]"
                          aria-label="Reassign"
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.vendorName ? `${u.name} · ${u.vendorName}` : u.name}
                            </option>
                          ))}
                          {vendors.map((v) => (
                            <option key={v.id} value={`vendor:${v.id}`}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          className="grid h-10 w-10 place-items-center rounded-full border border-[#eadfcf] text-[#8a7b68] hover:bg-[#fbf8f3]"
                          aria-label="Edit"
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeTask(task.id)}
                          className="grid h-10 w-10 place-items-center rounded-full border border-[#eadfcf] text-[#b4533a] hover:bg-rose-50"
                          aria-label="Delete"
                          title="Delete"
                        >
                          ⌫
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-sm text-[#8a7b68]">
        <p>
          Showing {visible.length ? 1 : 0}-{visible.length} of {visible.length} tasks
        </p>
        <p className="text-xs uppercase tracking-[0.12em]">
          {counts.overdue ? `${counts.overdue} overdue` : "All on track"}
        </p>
      </div>
    </div>
  );
}

export { dateLabel, toYmd, ListSkeleton };
