"use client";

import React, { useEffect, useMemo, useState } from "react";
import { designAssetUrl } from "@/lib/designAssets";
import {
  casualApi,
  type CasualTask,
  type CasualTaskStatus,
  type CasualTaskUpdate,
} from "@/services/crmApi";

const STATUS_LABEL: Record<CasualTaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

const STATUS_DOT: Record<CasualTaskStatus, string> = {
  OPEN: "bg-[#3d8fd9]",
  IN_PROGRESS: "bg-[#2fa36b]",
  DONE: "bg-[#2fa36b]",
};

const STATUS_PILL: Record<CasualTaskStatus, string> = {
  OPEN: "bg-[#eaf4fc] text-[#2f78b8]",
  IN_PROGRESS: "bg-[#e7f6ee] text-[#1f8a55]",
  DONE: "bg-[#e7f6ee] text-[#1f8a55]",
};

function initials(name?: string) {
  return String(name || "CS")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function fmtDue(value?: string | null) {
  if (!value) return "No due date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtWhen(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

type FeedItem = {
  key: string;
  task: CasualTask;
  update?: CasualTaskUpdate;
};

function MediaRow({ files }: { files: NonNullable<CasualTaskUpdate["files"]> }) {
  if (!files.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {files.map((file) =>
        file.kind === "VIDEO" ? (
          <video
            key={file.id}
            src={designAssetUrl(file.url)}
            controls
            className="h-[88px] w-[118px] rounded-lg bg-black object-cover"
          />
        ) : (
          <a
            key={file.id}
            href={designAssetUrl(file.url)}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={designAssetUrl(file.url)}
              alt={file.fileName || "Update photo"}
              className="h-[88px] w-[118px] object-cover"
            />
          </a>
        )
      )}
    </div>
  );
}

export default function CasualTasksAdminPage() {
  const [staff, setStaff] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [tasks, setTasks] = useState<CasualTask[]>([]);
  const [filter, setFilter] = useState<"" | CasualTaskStatus>("");
  const [view, setView] = useState<"task" | "user">("user");
  const [staffId, setStaffId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [menuId, setMenuId] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueAt: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [staffData, taskData] = await Promise.all([casualApi.listStaff(), casualApi.listAllTasks()]);
      setStaff(staffData.items || []);
      setTasks(taskData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load casual tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openAssign = () => {
    setForm((prev) => ({ ...prev, assigneeId: prev.assigneeId || staff[0]?.id || "" }));
    setShowForm(true);
  };

  const create = async () => {
    if (!form.title.trim() || !form.assigneeId) {
      setError("Title and assignee are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await casualApi.createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        assigneeId: form.assigneeId,
        dueAt: form.dueAt || undefined,
      });
      setShowForm(false);
      setForm({ title: "", description: "", assigneeId: staff[0]?.id || "", dueAt: "" });
      setNotice("Task assigned");
      window.setTimeout(() => setNotice(""), 1800);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign task");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: CasualTaskStatus) => {
    try {
      const saved = await casualApi.updateTask(id, { status });
      setTasks((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await casualApi.deleteTask(id);
      setTasks((prev) => prev.filter((row) => row.id !== id));
      setMenuId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
    }
  };

  const counts = useMemo(() => {
    const byUser = staffId ? tasks.filter((row) => row.assignee?.id === staffId) : tasks;
    return {
      total: byUser.length,
      OPEN: byUser.filter((row) => row.status === "OPEN").length,
      IN_PROGRESS: byUser.filter((row) => row.status === "IN_PROGRESS").length,
      DONE: byUser.filter((row) => row.status === "DONE").length,
    };
  }, [tasks, staffId]);

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((row) => {
      if (staffId && row.assignee?.id !== staffId) return false;
      if (filter && row.status !== filter) return false;
      if (!q) return true;
      const hay = `${row.title} ${row.description} ${row.assignee?.name || ""} ${(row.updates || [])
        .map((item) => `${item.note} ${item.managerNote || ""}`)
        .join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, staffId, filter, query]);

  const feed = useMemo<FeedItem[]>(() => {
    if (view === "task") {
      return visibleTasks.map((task) => ({ key: task.id, task }));
    }
    return visibleTasks
      .flatMap((task) =>
        (task.updates || []).map((update) => ({
          key: `${task.id}-${update.id}`,
          task,
          update,
        }))
      )
      .sort((a, b) => {
        const left = new Date(a.update?.createdAt || a.task.createdAt).getTime();
        const right = new Date(b.update?.createdAt || b.task.createdAt).getTime();
        return right - left;
      });
  }, [view, visibleTasks]);

  const recentUpdates = useMemo(() => {
    return tasks
      .flatMap((task) =>
        (task.updates || []).map((update) => ({
          id: update.id,
          taskTitle: task.title,
          userName: update.user?.name || task.assignee?.name || "Staff",
          createdAt: update.createdAt,
          files: update.files || [],
          note: update.note,
        }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [tasks]);

  return (
    <div className="space-y-5 text-[#2a2118]">
      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf6ee]">
        <div className="grid lg:grid-cols-[1fr_minmax(280px,42%)]">
          <div className="px-5 py-6 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">Admin</p>
            <h1 className="mt-1 font-serif text-[2rem] leading-tight text-[#1c1610]" style={{ fontFamily: "Georgia, serif" }}>
              Casual Staff Tasks
            </h1>
            <p className="mt-1 text-sm text-[#8a7b68]">Assign work to casual staff. They send updates from My Tasks.</p>
          </div>
          <div className="relative min-h-[132px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/casual/hero-living-room.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#3a2410]/20 to-[#3a2410]/70" />
            <p className="absolute right-6 top-1/2 max-w-[240px] -translate-y-1/2 text-right font-serif text-lg leading-snug text-white" style={{ fontFamily: "Georgia, serif" }}>
              “Small updates create a cleaner and brighter tomorrow.”
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-[#f3eadc] p-1">
          {(["task", "user"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`h-9 rounded-lg px-4 text-sm font-semibold ${
                view === id ? "bg-[#9a7348] text-white" : "text-[#6b5740]"
              }`}
            >
              {id === "task" ? "By task" : "By user"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={openAssign}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#9a7348] px-4 text-sm font-semibold text-white hover:bg-[#875f36]"
        >
          + Assign task
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["", "All status", counts.total],
            ["OPEN", "Open", counts.OPEN],
            ["IN_PROGRESS", "In progress", counts.IN_PROGRESS],
            ["DONE", "Done", counts.DONE],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id || "all"}
            type="button"
            onClick={() => setFilter(id)}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium ${
              filter === id ? "bg-[#9a7348] text-white" : "border border-[#eadfcf] bg-white text-[#6b5740]"
            }`}
          >
            {label}
            <span
              className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${
                filter === id ? "bg-white/20 text-white" : "bg-[#f6efe4] text-[#9a7348]"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-[#6b5740]">
          Casual user
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="h-11 min-w-[180px] rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610]"
          >
            <option value="">All Users</option>
            {staff.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <div className="relative min-w-[220px] flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search updates..."
            className="h-11 w-full rounded-xl border border-[#eadfcf] bg-white pl-3 pr-3 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a898] focus:border-[#c4a574]"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {loading ? <p className="py-10 text-center text-sm text-[#8a7b68]">Loading tasks…</p> : null}
          {!loading && feed.length === 0 ? (
            <div className="rounded-2xl border border-[#eadfcf] bg-white px-4 py-12 text-center text-sm text-[#8a7b68]">
              No updates in this list yet.
            </div>
          ) : null}

          <div className="relative space-y-3">
            {feed.length > 0 ? <div className="absolute bottom-4 left-[22px] top-4 w-px bg-[#eadfcf]" /> : null}
            {feed.map((item) => {
              const userName = item.update?.user?.name || item.task.assignee?.name || "Staff";
              const when = item.update?.createdAt || item.task.createdAt;
              const files = item.update?.files || [];
              return (
                <article key={item.key} className="relative rounded-2xl border border-[#eadfcf] bg-white p-4 pl-5">
                  <span className="absolute left-[18px] top-7 z-10 h-2.5 w-2.5 rounded-full bg-[#c4a574] ring-4 ring-[#fbf6ee]" />
                  <div className="ml-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d8c4a3] text-xs font-semibold text-[#2a2118]">
                        {initials(userName)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1c1610]">{userName}</p>
                        <p className="text-xs text-[#8a7b68]">{fmtWhen(when)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_PILL[item.task.status]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.task.status]}`} />
                        {STATUS_LABEL[item.task.status]}
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-lg text-[#b3a898] hover:bg-[#fbf6ee]"
                          onClick={() => setMenuId(menuId === item.key ? "" : item.key)}
                          aria-label="Task actions"
                        >
                          ⋯
                        </button>
                        {menuId === item.key ? (
                          <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-[#eadfcf] bg-white p-1 shadow-lg">
                            <select
                              value={item.task.status}
                              onChange={(e) => void setStatus(item.task.id, e.target.value as CasualTaskStatus)}
                              className="mb-1 h-9 w-full rounded-lg border border-[#eadfcf] px-2 text-sm"
                            >
                              <option value="OPEN">Open</option>
                              <option value="IN_PROGRESS">In progress</option>
                              <option value="DONE">Done</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => void remove(item.task.id)}
                              className="h-9 w-full rounded-lg text-left px-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete task
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="ml-[52px] mt-2">
                    <p className="font-semibold text-[#1c1610]">{item.task.title}</p>
                    {item.update?.note ? <p className="mt-1 text-sm text-[#5c5146]">{item.update.note}</p> : null}
                    {item.update?.managerNote ? (
                      <p className="mt-1 text-sm text-[#8a7b68]">{item.update.managerNote}</p>
                    ) : null}
                    {!item.update ? (
                      <p className="mt-1 text-sm text-[#8a7b68]">{item.task.description || `Due ${fmtDue(item.task.dueAt)}`}</p>
                    ) : null}
                    <MediaRow files={files} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#eadfcf] bg-white p-4">
            <h2 className="mb-3 font-semibold text-[#1c1610]">Task Summary</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Total Tasks", counts.total, "bg-[#f6efe4] text-[#6b5740]"],
                ["Open", counts.OPEN, "bg-[#eaf4fc] text-[#2f78b8]"],
                ["In Progress", counts.IN_PROGRESS, "bg-[#fff4e5] text-[#c07a22]"],
                ["Done", counts.DONE, "bg-[#e7f6ee] text-[#1f8a55]"],
              ].map(([label, count, cls]) => (
                <div key={String(label)} className={`rounded-xl px-3 py-3 ${cls}`}>
                  <p className="text-xl font-semibold">{count}</p>
                  <p className="text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#eadfcf] bg-white p-4">
            <h2 className="mb-3 font-semibold text-[#1c1610]">Recent Updates</h2>
            {recentUpdates.length === 0 ? <p className="text-sm text-[#8a7b68]">No updates yet.</p> : null}
            <div className="space-y-3">
              {recentUpdates.map((row) => (
                <div key={row.id} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d8c4a3] text-[10px] font-semibold">
                    {initials(row.userName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1c1610]">{row.taskTitle}</p>
                    <p className="text-[11px] text-[#8a7b68]">
                      {row.userName} · {fmtWhen(row.createdAt)}
                    </p>
                    {row.note ? <p className="mt-0.5 truncate text-xs text-[#5c5146]">{row.note}</p> : null}
                    <MediaRow files={row.files.slice(0, 3)} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#eadfcf] bg-white p-4">
            <h2 className="mb-3 font-semibold text-[#1c1610]">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={openAssign}
                className="rounded-xl border border-[#eadfcf] bg-[#fbf6ee] px-2 py-3 text-center text-[11px] font-semibold text-[#6b5740]"
              >
                Assign Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("task");
                  setFilter("");
                  setStaffId("");
                }}
                className="rounded-xl border border-[#eadfcf] bg-[#fbf6ee] px-2 py-3 text-center text-[11px] font-semibold text-[#6b5740]"
              >
                View All Tasks
              </button>
              <button
                type="button"
                onClick={() => setFilter("")}
                className="rounded-xl border border-[#eadfcf] bg-[#fbf6ee] px-2 py-3 text-center text-[11px] font-semibold text-[#6b5740]"
              >
                Reports
              </button>
            </div>
          </section>
        </aside>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1c1610]">Assign task</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-[#b3a898]">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5c5146]">Assign to</label>
                <select
                  value={form.assigneeId}
                  onChange={(e) => setForm((p) => ({ ...p, assigneeId: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#eadfcf] px-3 text-sm"
                >
                  <option value="">Select casual staff</option>
                  {staff.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5c5146]">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#eadfcf] px-3 text-sm"
                  placeholder="Site measurement at Andheri"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5c5146]">Details</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-[#eadfcf] px-3 py-2 text-sm"
                  rows={3}
                  placeholder="What should they do?"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5c5146]">Due date</label>
                <input
                  type="date"
                  value={form.dueAt}
                  onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#eadfcf] px-3 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-xl px-4 text-sm text-[#6b5740]">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void create()}
                className="h-10 rounded-xl bg-[#9a7348] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
