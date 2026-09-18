"use client";

import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import DatePickerField from "@/components/form/DatePickerField";
import {
  projectsApi,
  usersApi,
  type ProjectTaskDto,
} from "@/services/crmApi";
import { enumToLabel } from "@/lib/mappers";

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
};

const statuses = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const statusColor: Record<
  string,
  "primary" | "info" | "warning" | "success" | "error" | "light"
> = {
  TODO: "light",
  IN_PROGRESS: "info",
  DONE: "success",
  CANCELLED: "error",
};

function toYmd(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function dateLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

function timelineLabel(start?: string | null, end?: string | null) {
  const from = dateLabel(start);
  const to = dateLabel(end);
  if (from && to) return { from, to };
  if (from) return { from, to: "—" };
  if (to) return { from: to, to: "" };
  return { from: "No dates", to: "" };
}

export default function ProjectTasksPanel({
  project,
  onClose,
  onCountChange,
  onTasksChange,
}: Props) {
  const [tasks, setTasks] = useState<ProjectTaskDto[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("TODO");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [startDate, setStartDate] = useState(project.startIso || "");
  const [dueDate, setDueDate] = useState(project.endIso || "");
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
          const userPage = await usersApi.list({ limit: 100, isActive: "true" });
          if (!cancelled) {
            setUsers(
              (userPage.items || []).map((u) => ({ id: u.id, name: u.name }))
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
    setStartDate(project.startIso || "");
    setDueDate(project.endIso || "");
    setAssignedToId("");
  };

  const addTask = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await projectsApi.createTask(project.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        startDate: startDate || null,
        dueDate: dueDate || null,
        assignedToId: assignedToId || null,
      });
      const next = [...tasks, created].sort((a, b) => {
        const aTime = new Date(a.startDate || a.dueDate || a.createdAt).getTime();
        const bTime = new Date(b.startDate || b.dueDate || b.createdAt).getTime();
        return aTime - bTime;
      });
      setTasks(next);
      emitTasks(next);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setSaving(false);
    }
  };

  const patchTask = async (taskId: string, body: Record<string, unknown>) => {
    const prev = tasks;
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, ...body } : t))
    );
    try {
      const updated = await projectsApi.updateTask(project.id, taskId, body);
      setTasks((current) => {
        const next = current.map((t) => (t.id === taskId ? updated : t));
        emitTasks(next);
        return next;
      });
    } catch {
      setTasks(prev);
      setError("Could not update task");
    }
  };

  const removeTask = async (taskId: string) => {
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

  const projectSpan = timelineLabel(project.startIso, project.endIso);
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== "CANCELLED"),
    [tasks]
  );

  const selectClass =
    "h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

  return (
    <div className="fixed inset-0 z-[99999] flex justify-end bg-black/40">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Project timeline
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {project.name}
              {project.client ? ` · ${project.client}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
          <p className="text-theme-xs uppercase tracking-wide text-gray-400">
            Project dates
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {projectSpan.from}
          </p>
          {projectSpan.to ? (
            <p className="text-xs text-gray-400">→ {projectSpan.to}</p>
          ) : null}
        </div>

        <div className="mb-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Add timeline task
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title *"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${selectClass} w-full`}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {enumToLabel(s)}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={`${selectClass} w-full`}
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {enumToLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500">Start date</p>
            <DatePickerField
              id={`project-task-start-${project.id}`}
              value={startDate}
              onChange={setStartDate}
              placeholder="Start date"
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500">End date</p>
            <DatePickerField
              id={`project-task-end-${project.id}`}
              value={dueDate}
              onChange={setDueDate}
              placeholder="End date"
            />
          </div>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => void addTask()}
            disabled={!title.trim() || saving}
          >
            {saving ? "Saving…" : "Add to timeline"}
          </Button>
        </div>

        {error ? (
          <p className="mb-4 text-sm text-error-500">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-gray-500">Loading timeline…</p>
        ) : openTasks.length === 0 ? (
          <p className="text-sm text-gray-500">
            No timeline tasks yet. Add one with start and end dates.
          </p>
        ) : (
          <div className="relative space-y-0 border-l border-gray-200 pl-4 dark:border-gray-700">
            {openTasks.map((task) => {
              const span = timelineLabel(task.startDate, task.dueDate);
              return (
                <div key={task.id} className="relative mb-5">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 dark:border-gray-900" />
                  <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium text-gray-800 dark:text-white/90 ${
                          task.status === "DONE" ? "line-through opacity-70" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => void removeTask(task.id)}
                        className="text-xs text-error-500 hover:text-error-600"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {span.from}
                    </p>
                    {span.to ? (
                      <p className="text-xs text-gray-400">→ {span.to}</p>
                    ) : null}
                    {task.description ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {task.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge size="sm" color={statusColor[task.status] || "light"}>
                        {enumToLabel(task.status)}
                      </Badge>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          void patchTask(task.id, { status: e.target.value })
                        }
                        className="h-8 rounded-md border border-gray-200 bg-transparent px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {enumToLabel(s)}
                          </option>
                        ))}
                      </select>
                      {task.assignedTo?.name ? (
                        <span className="text-xs text-gray-400">
                          {task.assignedTo.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export { dateLabel, toYmd };
