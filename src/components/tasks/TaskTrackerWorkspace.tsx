"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";
import {
  projectsApi,
  taskTrackerApi,
  usersApi,
  type TrackerHistoryDto,
  type TrackerTaskDto,
  type TrackerTaskStatus,
} from "@/services/crmApi";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";

const TEAMS = ["Design", "Sales", "Procurement", "Site", "HR", "Inventory"] as const;

const COLUMNS: {
  id: TrackerTaskStatus;
  label: string;
  headerClass: string;
  countClass: string;
}[] = [
  { id: "TODO", label: "To Do", headerClass: "text-[#6b5d4d]", countClass: "bg-[#efe6d8] text-[#5c4a32]" },
  { id: "IN_PROGRESS", label: "In Progress", headerClass: "text-[#1d4ed8]", countClass: "bg-[#dbeafe] text-[#1e40af]" },
  { id: "IN_REVIEW", label: "In Review", headerClass: "text-[#7e22ce]", countClass: "bg-[#f3e8ff] text-[#6b21a8]" },
  { id: "COMPLETED", label: "Completed", headerClass: "text-[#15803d]", countClass: "bg-[#dcfce7] text-[#166534]" },
];

const TEAM_TAG: Record<string, string> = {
  Design: "bg-[#dbeafe] text-[#1e40af]",
  Sales: "bg-[#dcfce7] text-[#166534]",
  Procurement: "bg-[#ffedd5] text-[#9a3412]",
  Site: "bg-[#e0e7ff] text-[#3730a3]",
  HR: "bg-[#fce7f3] text-[#9d174d]",
  Inventory: "bg-[#f3e8ff] text-[#6b21a8]",
  CRM: "bg-[#efe6d8] text-[#5c4a32]",
};

function formatDue(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e8dfd2] bg-white px-3.5 py-3 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-medium text-[#8a7b68]">{label}</p>
        <p className="text-xl font-semibold text-[#2b2118]">{value}</p>
      </div>
    </div>
  );
}

function PriorityFlag({ priority }: { priority: string }) {
  const color =
    priority === "HIGH" || priority === "URGENT"
      ? "text-red-600"
      : priority === "LOW"
        ? "text-[#8a7b68]"
        : "text-amber-600";
  return (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${color}`} fill="currentColor">
      <path d="M6 3v18M6 4h10l-2 3 2 3H6" />
    </svg>
  );
}

export default function TaskTrackerWorkspace() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canCreate = isSuperAdmin;
  const canWorkOn = (task: TrackerTaskDto) =>
    isSuperAdmin ||
    task.assignees.some((a) => a.id === user?.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TrackerTaskDto[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    todo: 0,
    inProgress: 0,
    inReview: 0,
    completed: 0,
    overdue: 0,
  });
  const [view, setView] = useState<"kanban" | "list" | "calendar" | "history">(
    "kanban"
  );
  const [historyItems, setHistoryItems] = useState<TrackerHistoryDto[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [decisionDrafts, setDecisionDrafts] = useState<Record<string, string>>(
    {}
  );
  const [savingDecision, setSavingDecision] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (searchParams.get("mine") === "1" && user?.id) {
      setMineOnly(true);
      setMemberFilter(user.id);
    }
  }, [searchParams, user?.id]);

  const [users, setUsers] = useState<Array<{ id: string; name: string; avatarUrl?: string | null }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [workTask, setWorkTask] = useState<TrackerTaskDto | null>(null);
  const [workStatus, setWorkStatus] = useState<TrackerTaskStatus>("TODO");
  const [workComment, setWorkComment] = useState("");
  const [taskComments, setTaskComments] = useState<TrackerHistoryDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: "",
    assigneeIds: [] as string[],
    teams: [] as string[],
    priority: "MEDIUM",
    dueDate: "",
    status: "TODO" as TrackerTaskStatus,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assigneeId =
        mineOnly && user?.id ? user.id : memberFilter || undefined;
      const data = await taskTrackerApi.list({
        team: teamFilter || undefined,
        assigneeId,
        projectId: projectFilter || undefined,
        priority: priorityFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setItems(data.items || []);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [
    teamFilter,
    memberFilter,
    mineOnly,
    user?.id,
    projectFilter,
    priorityFilter,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadHistory = useCallback(async () => {
    if (!isSuperAdmin) return;
    setHistoryLoading(true);
    try {
      const data = await taskTrackerApi.history({
        search: historySearch || undefined,
        limit: 200,
      });
      setHistoryItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [isSuperAdmin, historySearch]);

  useEffect(() => {
    if (view === "history" && isSuperAdmin) void loadHistory();
  }, [view, isSuperAdmin, loadHistory]);

  const saveDecision = async (historyId: string) => {
    const note = (decisionDrafts[historyId] || "").trim();
    if (!note) {
      setError("Enter a decision note");
      return;
    }
    setSavingDecision(historyId);
    try {
      await taskTrackerApi.addDecision(historyId, note);
      setDecisionDrafts((d) => ({ ...d, [historyId]: "" }));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save decision");
    } finally {
      setSavingDecision(null);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const [u, p] = await Promise.all([
          usersApi.list({ limit: 100 }),
          projectsApi.list({ limit: 100 }),
        ]);
        const userItems = Array.isArray(u?.items) ? u.items : [];
        setUsers(
          userItems.map((row) => ({
            id: row.id,
            name: row.name,
            avatarUrl: row.avatarUrl,
          }))
        );
        const projItems = Array.isArray(p?.items) ? p.items : [];
        setProjects(
          projItems.map((row) => ({
            id: String(row.id),
            name: String(row.name || "Project"),
          }))
        );
      } catch {
        /* optional filters */
      }
    })();
  }, []);

  const byStatus = useMemo(() => {
    const map: Record<TrackerTaskStatus, TrackerTaskDto[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      COMPLETED: [],
    };
    for (const item of items) {
      if (map[item.status]) map[item.status].push(item);
    }
    return map;
  }, [items]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      projectId: "",
      assigneeIds: [],
      teams: [],
      priority: "MEDIUM",
      dueDate: "",
      status: "TODO",
    });
    setDrawerOpen(false);
  };

  const openWorkPanel = async (task: TrackerTaskDto) => {
    if (!canWorkOn(task)) return;
    setWorkTask(task);
    setWorkStatus(task.status);
    setWorkComment("");
    try {
      const hist = await taskTrackerApi.taskHistory(task.id);
      setTaskComments(
        (hist.items || []).filter(
          (h) => h.action === "COMMENT" || h.action === "STATUS_CHANGED"
        )
      );
    } catch {
      setTaskComments([]);
    }
  };

  const closeWorkPanel = () => {
    setWorkTask(null);
    setWorkComment("");
    setTaskComments([]);
  };

  const saveWorkUpdate = async () => {
    if (!workTask) return;
    setSaving(true);
    setError(null);
    try {
      await taskTrackerApi.update(workTask.id, {
        status: workStatus,
        comment: workComment.trim() || undefined,
        progress:
          workStatus === "COMPLETED"
            ? 100
            : workStatus === "IN_PROGRESS"
              ? Math.max(workTask.progress || 0, 20)
              : workTask.progress,
      });
      closeWorkPanel();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const toggleTeam = (team: string) => {
    setForm((f) => ({
      ...f,
      teams: f.teams.includes(team)
        ? f.teams.filter((t) => t !== team)
        : [...f.teams, team],
    }));
  };

  const toggleAssignee = (id: string) => {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter((x) => x !== id)
        : [...f.assigneeIds, id],
    }));
  };

  const createTask = async () => {
    if (!form.title.trim()) {
      setError("Task title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await taskTrackerApi.create({
        title: form.title.trim(),
        description: form.description.trim() || null,
        projectId: form.projectId || null,
        assigneeIds: form.assigneeIds,
        teams: form.teams,
        priority: form.priority,
        dueDate: form.dueDate || null,
        status: form.status,
        progress: form.status === "IN_PROGRESS" ? 20 : form.status === "COMPLETED" ? 100 : 0,
      });
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const moveTask = async (taskId: string, status: TrackerTaskStatus) => {
    const prev = items;
    setItems((rows) =>
      rows.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              progress:
                status === "COMPLETED"
                  ? 100
                  : status === "IN_PROGRESS" && t.progress < 10
                    ? 20
                    : t.progress,
            }
          : t
      )
    );
    try {
      await taskTrackerApi.update(taskId, {
        status,
        progress:
          status === "COMPLETED"
            ? 100
            : status === "IN_PROGRESS"
              ? undefined
              : undefined,
      });
      await load();
    } catch (err) {
      setItems(prev);
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const onDropColumn = async (status: TrackerTaskStatus) => {
    if (!dragId) return;
    const task = items.find((t) => t.id === dragId);
    setDragId(null);
    if (!task || task.status === status || !canWorkOn(task)) return;
    await moveTask(dragId, status);
  };

  if (loading && !items.length) return <PageSkeleton />;

  return (
    <div className="relative mx-auto max-w-[1500px] space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="font-serif text-[1.75rem] text-[#2b2118] sm:text-[2rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Task Tracker
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#8a7b68]">
            Create, assign and track tasks across teams. Keep your projects on schedule.
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5c4033] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#4a3429]"
          >
            <span className="text-base leading-none">+</span> Create Task
          </button>
        ) : (
          <p className="rounded-lg border border-[#e8dfd2] bg-[#faf7f2] px-3 py-2 text-xs text-[#8a7b68]">
            Open your assigned card to update status or add a comment
          </p>
        )}
      </div>

      {error ? (
        <div className="flex justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" className="underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Tasks"
          value={summary.total}
          tone="bg-[#efe6d8] text-[#5c4033]"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 9h8M8 13h5" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="To Do"
          value={summary.todo}
          tone="bg-amber-100 text-amber-800"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="8" />
            </svg>
          }
        />
        <StatCard
          label="In Progress"
          value={summary.inProgress}
          tone="bg-blue-100 text-blue-800"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 6v6l4 2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="8" />
            </svg>
          }
        />
        <StatCard
          label="In Review"
          value={summary.inReview}
          tone="bg-purple-100 text-purple-800"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={summary.completed}
          tone="bg-green-100 text-green-800"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Overdue"
          value={summary.overdue}
          tone="bg-red-100 text-red-800"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
              <circle cx="12" cy="12" r="8" />
            </svg>
          }
        />
      </div>

      {/* Filters + view */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e8dfd2] bg-white p-3">
        <button
          type="button"
          onClick={() => {
            const next = !mineOnly;
            setMineOnly(next);
            setMemberFilter(next && user?.id ? user.id : "");
          }}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
            mineOnly
              ? "bg-[#5c4033] text-white"
              : "border border-[#e8dfd2] bg-[#faf7f2] text-[#6b5d4d]"
          }`}
        >
          Assigned to me
        </button>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-lg border border-[#e8dfd2] bg-[#faf7f2] px-2.5 py-2 text-xs outline-none"
        >
          <option value="">All Teams</option>
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={mineOnly ? user?.id || "" : memberFilter}
          onChange={(e) => {
            setMineOnly(false);
            setMemberFilter(e.target.value);
          }}
          className="rounded-lg border border-[#e8dfd2] bg-[#faf7f2] px-2.5 py-2 text-xs outline-none"
        >
          <option value="">All Members</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-[#e8dfd2] bg-[#faf7f2] px-2.5 py-2 text-xs outline-none"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-[#e8dfd2] bg-[#faf7f2] px-2.5 py-2 text-xs outline-none"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded-lg border border-[#e8dfd2] bg-[#faf7f2] px-2.5 py-2 text-xs outline-none"
        />
        <span className="text-xs text-[#a89478]">–</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded-lg border border-[#e8dfd2] bg-[#faf7f2] px-2.5 py-2 text-xs outline-none"
        />
        <div className="ml-auto flex rounded-lg border border-[#e8dfd2] p-0.5">
          {(
            [
              "kanban",
              "list",
              "calendar",
              ...(isSuperAdmin ? (["history"] as const) : []),
            ] as const
          ).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                view === v ? "bg-[#5c4033] text-white" : "text-[#6b5d4d] hover:bg-[#f5efe6]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      {view === "kanban" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="min-h-[420px] rounded-2xl border border-[#e8dfd2] bg-[#f7f3ed]/80 p-2.5"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDropColumn(col.id)}
            >
              <div className="mb-2.5 flex items-center justify-between px-1">
                <p className={`text-sm font-semibold ${col.headerClass}`}>{col.label}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${col.countClass}`}>
                  {byStatus[col.id].length}
                </span>
              </div>
              <div className="space-y-2.5">
                {byStatus[col.id].map((task) => (
                  <article
                    key={task.id}
                    draggable={canWorkOn(task)}
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => void openWorkPanel(task)}
                    className={`cursor-pointer rounded-xl border border-[#e8dfd2] bg-white p-3 shadow-sm transition ${
                      dragId === task.id ? "opacity-60" : "hover:border-[#c4a574]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-[#2b2118]">
                        {task.title}
                      </p>
                      {task.status === "COMPLETED" ? (
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                    {task.project?.name ? (
                      <p className="mt-1 text-[11px] text-[#8a7b68]">{task.project.name}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {(task.teams.length ? task.teams : ["CRM"]).slice(0, 2).map((team) => (
                        <span
                          key={team}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            TEAM_TAG[team] || TEAM_TAG.CRM
                          }`}
                        >
                          {team}
                        </span>
                      ))}
                    </div>
                    {task.status === "IN_PROGRESS" ? (
                      <div className="mt-2.5">
                        <div className="mb-1 flex justify-between text-[10px] text-[#8a7b68]">
                          <span>Progress</span>
                          <span>{task.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#efe6d8]">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, task.progress || 0)}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8a7b68]">
                        {task.dueDate ? (
                          <span className={`inline-flex items-center gap-1 ${task.overdue ? "text-red-600" : ""}`}>
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="4" y="5" width="16" height="15" rx="2" />
                              <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
                            </svg>
                            {formatDue(task.dueDate)}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                        <PriorityFlag priority={task.priority} />
                      </div>
                      <div className="flex -space-x-1.5">
                        {task.assignees.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            title={a.name}
                            className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#5c4033] text-[9px] font-semibold text-white"
                          >
                            {a.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initials(a.name)
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                    {canWorkOn(task) ? (
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-[#f3ebe0] pt-2">
                        {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void moveTask(task.id, c.id);
                            }}
                            className="rounded px-1.5 py-0.5 text-[10px] text-[#6b5d4d] hover:bg-[#f5efe6]"
                          >
                            → {c.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openWorkPanel(task);
                          }}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#5c4033] hover:bg-[#f5efe6]"
                        >
                          Comment
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-[#e8dfd2] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f3ed] text-[11px] uppercase tracking-wide text-[#8a7b68]">
              <tr>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Assignees</th>
              </tr>
            </thead>
            <tbody>
              {items.map((task) => (
                <tr key={task.id} className="border-t border-[#efe6d8]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#2b2118]">{task.title}</p>
                    <p className="text-[11px] text-[#8a7b68]">{task.project?.name || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{task.status.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-xs">{task.priority}</td>
                  <td className={`px-4 py-3 text-xs ${task.overdue ? "text-red-600" : ""}`}>
                    {formatDue(task.dueDate) || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {task.assignees.map((a) => a.name).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "history" && isSuperAdmin ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e8dfd2] bg-white px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[#2b2118]">
                Full task history
              </h2>
              <p className="text-[11px] text-[#8a7b68]">
                Every create, move, assign, and delete — add Super Admin decisions below.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history…"
                className="rounded-lg border border-[#e8dfd2] px-3 py-2 text-xs outline-none focus:border-[#c4a574]"
              />
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="rounded-lg bg-[#5c4033] px-3 py-2 text-xs font-medium text-white"
              >
                Refresh
              </button>
            </div>
          </div>
          {historyLoading ? (
            <p className="py-10 text-center text-sm text-[#8a7b68]">Loading history…</p>
          ) : historyItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#d4c4a8] bg-white py-12 text-center text-sm text-[#8a7b68]">
              No history yet. Create or move tasks to build the audit trail.
            </p>
          ) : (
            <div className="space-y-2">
              {historyItems.map((h) => (
                <article
                  key={h.id}
                  className="rounded-xl border border-[#e8dfd2] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[#efe6d8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5c4033]">
                          {h.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-semibold text-[#2b2118]">
                          {h.taskTitle}
                        </span>
                        {h.task?.deleted ? (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
                            Deleted
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[#6b5d4d]">{h.message}</p>
                      <p className="mt-1 text-[11px] text-[#a89478]">
                        {h.actor?.name || "System"}
                        {h.actor?.role ? ` · ${h.actor.role}` : ""}
                        {" · "}
                        {new Date(h.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {h.decisionNote ? (
                    <div className="mt-3 rounded-lg border border-[#c4a574]/40 bg-[#fbf8f3] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9a7748]">
                        Super Admin decision
                      </p>
                      <p className="mt-0.5 text-sm text-[#2b2118]">{h.decisionNote}</p>
                    </div>
                  ) : h.action !== "DECISION" ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={decisionDrafts[h.id] || ""}
                        onChange={(e) =>
                          setDecisionDrafts((d) => ({
                            ...d,
                            [h.id]: e.target.value,
                          }))
                        }
                        placeholder="Add decision / note for this event…"
                        className="flex-1 rounded-lg border border-[#e8dfd2] px-3 py-2 text-sm outline-none focus:border-[#c4a574]"
                      />
                      <button
                        type="button"
                        disabled={savingDecision === h.id}
                        onClick={() => void saveDecision(h.id)}
                        className="rounded-lg bg-[#5c4033] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {savingDecision === h.id ? "Saving…" : "Save decision"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#d4c4a8] bg-white px-6 py-16 text-center text-sm text-[#8a7b68]">
          Calendar view coming soon — use Kanban or List for now.
        </div>
      )}

      {/* Assignee / update drawer */}
      {workTask ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close"
            onClick={closeWorkPanel}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#efe6d8] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#2b2118]">Update task</h2>
                <p className="text-[11px] text-[#8a7b68]">Change status and leave a comment</p>
              </div>
              <button
                type="button"
                onClick={closeWorkPanel}
                className="rounded-lg p-1.5 text-[#8a7b68] hover:bg-[#f5efe6]"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#2b2118]">{workTask.title}</p>
                {workTask.description ? (
                  <p className="mt-1 text-xs text-[#8a7b68]">{workTask.description}</p>
                ) : null}
                {workTask.project?.name ? (
                  <p className="mt-1 text-[11px] text-[#a89478]">{workTask.project.name}</p>
                ) : null}
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Status</span>
                <select
                  value={workStatus}
                  onChange={(e) => setWorkStatus(e.target.value as TrackerTaskStatus)}
                  className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Comment</span>
                <textarea
                  value={workComment}
                  onChange={(e) => setWorkComment(e.target.value)}
                  rows={4}
                  placeholder="Add an update or note…"
                  className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none focus:border-[#c4a574]"
                />
              </label>
              {taskComments.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9a7748]">
                    Recent activity
                  </p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {taskComments.slice(0, 12).map((h) => (
                      <div
                        key={h.id}
                        className="rounded-lg border border-[#efe6d8] bg-[#faf7f2] px-3 py-2"
                      >
                        <p className="text-[10px] font-medium uppercase text-[#a89478]">
                          {h.action.replace(/_/g, " ")} · {h.actor?.name || "User"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#2b2118]">{h.message}</p>
                        <p className="mt-0.5 text-[10px] text-[#a89478]">
                          {new Date(h.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 border-t border-[#efe6d8] px-5 py-4">
              <button
                type="button"
                onClick={closeWorkPanel}
                className="flex-1 rounded-lg border border-[#e8dfd2] py-2.5 text-sm text-[#6b5d4d]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveWorkUpdate()}
                className="flex-1 rounded-lg bg-[#5c4033] py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save update"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Create drawer — Super Admin only */}
      {drawerOpen && canCreate ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close"
            onClick={resetForm}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#efe6d8] px-5 py-4">
              <h2 className="text-base font-semibold text-[#2b2118]">Create New Task</h2>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-1.5 text-[#8a7b68] hover:bg-[#f5efe6]"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Task Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Prepare design layout"
                  className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none focus:border-[#c4a574]"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Add task details…"
                  className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none focus:border-[#c4a574]"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Project</span>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="mb-1 text-xs font-medium text-[#6b5d4d]">Assign To</p>
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-[#e8dfd2] p-2">
                  {users.map((u) => (
                    <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#faf7f2]">
                      <input
                        type="checkbox"
                        checked={form.assigneeIds.includes(u.id)}
                        onChange={() => toggleAssignee(u.id)}
                      />
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5c4033] text-[9px] text-white">
                        {initials(u.name)}
                      </span>
                      {u.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#6b5d4d]">Team / Department</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEAMS.map((team) => {
                    const on = form.teams.includes(team);
                    return (
                      <button
                        key={team}
                        type="button"
                        onClick={() => toggleTeam(team)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          on
                            ? "border-[#5c4033] bg-[#5c4033] text-white"
                            : "border-[#e8dfd2] text-[#6b5d4d]"
                        }`}
                      >
                        {team}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#6b5d4d]">Priority</p>
                <div className="flex gap-2">
                  {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-xs font-medium ${
                        form.priority === p
                          ? p === "HIGH"
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-[#5c4033] bg-[#f5efe6] text-[#2b2118]"
                          : "border-[#e8dfd2] text-[#6b5d4d]"
                      }`}
                    >
                      <PriorityFlag priority={p} />
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Due Date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as TrackerTaskStatus }))
                  }
                  className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-dashed border-[#d4c4a8] bg-[#faf7f2] px-4 py-6 text-center text-xs text-[#8a7b68]">
                Attachments (Images, PDFs — coming soon)
              </div>
            </div>
            <div className="flex gap-2 border-t border-[#efe6d8] px-5 py-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 rounded-lg border border-[#e8dfd2] py-2.5 text-sm text-[#6b5d4d]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void createTask()}
                className="flex-1 rounded-lg bg-[#5c4033] py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Creating…" : "Create Task"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
