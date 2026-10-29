"use client";

import React, { useEffect, useMemo, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import {
  projectsApi,
  usersApi,
  vendorsApi,
  type ProjectTaskDto,
} from "@/services/crmApi";
import { enumToLabel } from "@/lib/mappers";
import { ListSkeleton } from "@/components/ui/loader/CrmLoader";

type Props = {
  project: {
    id: string;
    name: string;
    client: string;
    startIso?: string;
    endIso?: string;
  };
  onClose: () => void;
  onCountChange?: (count: number) => void;
  onTasksChange?: (
    tasks: Array<{
      id: string;
      title: string;
      startDate?: string | null;
      dueDate?: string | null;
      status: string;
    }>
  ) => void;
  onProjectChange?: (project: Record<string, unknown>) => void;
};

const statuses = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type FilterTab = "ALL" | "TODO" | "IN_PROGRESS" | "DONE";

const statusTone: Record<string, string> = {
  TODO: "border-[#eadfcf] bg-[#fbf8f3] text-[#8a7b68]",
  IN_PROGRESS: "border-[#c4a574]/50 bg-[#f6efe4] text-[#9a7748]",
  DONE: "border-[#c5d4c2] bg-[#eef4ec] text-[#3d5a3a]",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

const priorityTone: Record<string, string> = {
  LOW: "text-[#8a7b68]",
  MEDIUM: "text-[#9a7748]",
  HIGH: "text-[#b4533a]",
  URGENT: "text-rose-700 font-semibold",
};

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]";

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

export default function ProjectTasksPanel({
  project,
  onClose,
  onCountChange,
  onTasksChange,
  onProjectChange,
}: Props) {
  const [tasks, setTasks] = useState<ProjectTaskDto[]>([]);
  const [users, setUsers] = useState<
    Array<{ id: string; name: string; vendorId?: string | null; vendorName?: string | null }>
  >([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("TODO");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  const emitTasks = (list: ProjectTaskDto[]) => {
    onCountChange?.(list.filter((t) => t.status !== "CANCELLED").length);
    onTasksChange?.(
      list
        .filter((t) => t.status !== "CANCELLED")
        .slice(0, 4)
        .map((t) => ({
          id: t.id,
          title: t.title,
          startDate: t.startDate,
          dueDate: t.dueDate,
          status: t.status,
        }))
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const taskList = await projectsApi.listTasks(project.id);
        if (cancelled) return;
        const list = Array.isArray(taskList) ? taskList : [];
        setTasks(list);
        emitTasks(list);
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
          /* assignee list is optional */
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tasks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setPriority("MEDIUM");
    setStartDate("");
    setDueDate("");
    setAssignedToId("");
  };

  const refreshProject = async () => {
    if (!onProjectChange) return;
    try {
      const dto = await projectsApi.get(project.id);
      onProjectChange(dto as Record<string, unknown>);
    } catch {
      /* table can stay stale until next reload */
    }
  };

  const addTask = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const assignee = parseAssigneeValue(assignedToId);
      const created = await projectsApi.createTask(project.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        startDate: startDate || null,
        dueDate: dueDate || null,
        ...(assignee.vendorId
          ? { vendorId: assignee.vendorId }
          : { assignedToId: assignee.assignedToId }),
      });
      const next = [...tasks, created].sort((a, b) => {
        const aTime = new Date(a.startDate || a.dueDate || a.createdAt).getTime();
        const bTime = new Date(b.startDate || b.dueDate || b.createdAt).getTime();
        return aTime - bTime;
      });
      setTasks(next);
      emitTasks(next);
      resetForm();
      setShowForm(false);
      if (assignee.assignedToId || assignee.vendorId) {
        await refreshProject();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setSaving(false);
    }
  };

  const patchTask = async (taskId: string, body: Record<string, unknown>) => {
    const prev = tasks;
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, ...body } : t)));
    try {
      const updated = await projectsApi.updateTask(project.id, taskId, body);
      setTasks((current) => {
        const next = current.map((t) => (t.id === taskId ? updated : t));
        emitTasks(next);
        return next;
      });
      if (body.assignedToId !== undefined || body.vendorId !== undefined) {
        await refreshProject();
      }
    } catch {
      setTasks(prev);
      setError("Could not update task");
    }
  };

  const removeTask = async (taskId: string) => {
    if (!window.confirm("Delete this task?")) return;
    const prev = tasks;
    const next = tasks.filter((t) => t.id !== taskId);
    setTasks(next);
    emitTasks(next);
    try {
      await projectsApi.removeTask(project.id, taskId);
    } catch {
      setTasks(prev);
      emitTasks(prev);
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
    if (filter === "ALL") return activeTasks;
    return activeTasks.filter((t) => t.status === filter);
  }, [activeTasks, filter]);

  const tabs: Array<{ id: FilterTab; label: string; count: number }> = [
    { id: "ALL", label: "All", count: counts.all },
    { id: "TODO", label: "To do", count: counts.todo },
    { id: "IN_PROGRESS", label: "In progress", count: counts.progress },
    { id: "DONE", label: "Done", count: counts.done },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-[#eadfcf] bg-[#fbf8f3] shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[#eadfcf] bg-[#fdfbf7] px-5 py-4 dark:border-[#3a342c] dark:bg-[#1a1714]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">
                Project tasks
              </p>
              <h3 className="mt-1 truncate font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={serif}>
                {project.name}
              </h3>
              <p className="mt-0.5 text-sm text-[#8a7b68]">
                {project.client || "No client"}
                {project.startIso || project.endIso
                  ? ` · ${dateLabel(project.startIso)} → ${dateLabel(project.endIso)}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#eadfcf] text-[#8a7b68] hover:bg-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "Total", value: counts.all },
              { label: "To do", value: counts.todo },
              { label: "Doing", value: counts.progress },
              { label: "Overdue", value: counts.overdue, rose: true },
            ].map((chip) => (
              <div
                key={chip.label}
                className="rounded-xl border border-[#eadfcf] bg-white px-2.5 py-2 text-center dark:border-[#3a342c] dark:bg-[#161411]"
              >
                <p
                  className={`font-serif text-lg ${chip.rose && chip.value ? "text-rose-700" : "text-[#1c1610] dark:text-[#f3ece2]"}`}
                  style={serif}
                >
                  {chip.value}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  {chip.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#eadfcf] bg-[#fdfbf7] px-5 py-3 dark:border-[#3a342c] dark:bg-[#1a1714]">
            <div className="inline-flex max-w-full overflow-x-auto overflow-hidden rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`h-9 shrink-0 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                    filter === tab.id
                      ? "bg-[#1c1610] text-[#e8d5b5]"
                      : "bg-[#fdfbf7] text-[#8a7b68] hover:bg-white"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 opacity-70">{tab.count}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex h-9 shrink-0 items-center rounded-xl bg-[#1c1610] px-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#e8d5b5]"
            >
              {showForm ? "Close form" : "+ Add task"}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {showForm ? (
              <form
                id="project-task-create-form"
                className="space-y-3 border-b border-[#eadfcf] bg-white px-5 py-4 dark:border-[#3a342c] dark:bg-[#1a1714]"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void addTask();
                }}
              >
                <p className="text-sm font-medium text-[#1c1610]">New task</p>
                <div>
                  <label className={labelClass}>Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className={fieldClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional details"
                    className={`${fieldClass} h-auto py-2.5`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                </div>
                <div>
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
              </form>
            ) : null}

            {error ? <p className="px-5 pt-3 text-sm text-rose-700">{error}</p> : null}

            <div className="px-5 py-4">
            {loading ? (
              <ListSkeleton rows={5} />
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-white px-4 py-12 text-center dark:border-[#3a342c] dark:bg-[#1a1714]">
                <p className="font-serif text-xl text-[#1c1610]" style={serif}>
                  {filter === "ALL" ? "No tasks yet" : `No ${enumToLabel(filter).toLowerCase()} tasks`}
                </p>
                <p className="mt-1 text-sm text-[#8a7b68]">
                  Add a task with dates and an assignee so the team knows what to do next.
                </p>
                {filter === "ALL" && !showForm ? (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#e8d5b5]"
                  >
                    + Add first task
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {visible.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <article
                      key={task.id}
                      className={`rounded-2xl border bg-white p-4 dark:bg-[#1a1714] ${
                        overdue ? "border-rose-200" : "border-[#eadfcf] dark:border-[#3a342c]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                                statusTone[task.status] || statusTone.TODO
                              }`}
                            >
                              {enumToLabel(task.status)}
                            </span>
                            <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${priorityTone[task.priority] || priorityTone.MEDIUM}`}>
                              {enumToLabel(task.priority)} priority
                            </span>
                            {overdue ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                Overdue
                              </span>
                            ) : null}
                          </div>
                          <h4
                            className={`mt-2 font-serif text-lg leading-snug text-[#1c1610] dark:text-[#f3ece2] ${
                              task.status === "DONE" ? "line-through opacity-60" : ""
                            }`}
                            style={serif}
                          >
                            {task.title}
                          </h4>
                          {task.description ? (
                            <p className="mt-1 text-sm leading-relaxed text-[#6b645b]">{task.description}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeTask(task.id)}
                          className="shrink-0 text-xs font-semibold text-[#b4533a] hover:text-[#8a3424]"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#fbf8f3] p-3 text-sm dark:bg-[#161411] sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                            Start
                          </p>
                          <p className="mt-0.5 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                            {dateLabel(task.startDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                            Due
                          </p>
                          <p
                            className={`mt-0.5 font-medium ${
                              overdue ? "text-rose-700" : "text-[#1c1610] dark:text-[#f3ece2]"
                            }`}
                          >
                            {dateLabel(task.dueDate)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                            Assigned to
                          </p>
                          <p className="mt-0.5 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                            {assigneeDisplay(task, users, vendors)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Update status</label>
                          <select
                            value={task.status}
                            onChange={(e) => void patchTask(task.id, { status: e.target.value })}
                            className={`${fieldClass} h-10`}
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s}>
                                {enumToLabel(s)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Reassign</label>
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
                            className={`${fieldClass} h-10`}
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
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          {showForm ? (
            <div className="shrink-0 border-t border-[#eadfcf] bg-[#fdfbf7] px-5 py-3 dark:border-[#3a342c] dark:bg-[#1a1714]">
              <button
                type="submit"
                form="project-task-create-form"
                disabled={!title.trim() || saving}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#1c1610] text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save task"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { dateLabel, toYmd };
