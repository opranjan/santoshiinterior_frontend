"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  taskTrackerApi,
  type TrackerTaskDto,
  type TrackerTaskStatus,
} from "@/services/crmApi";

const STATUS_TONE: Record<
  TrackerTaskStatus,
  { label: string; chip: string; bar: string }
> = {
  TODO: {
    label: "To do",
    chip: "bg-[#efe8dc] text-[#7d6139]",
    bar: "bg-[#c4a574]",
  },
  IN_PROGRESS: {
    label: "In progress",
    chip: "bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
  },
  IN_REVIEW: {
    label: "In review",
    chip: "bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
  COMPLETED: {
    label: "Done",
    chip: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
  },
};

function initials(name?: string | null) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

function formatDue(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function TaskRow({
  task,
  mode,
}: {
  task: TrackerTaskDto;
  mode: "mine" | "assigned";
}) {
  const tone = STATUS_TONE[task.status] || STATUS_TONE.TODO;
  const due = formatDue(task.dueDate);
  const people =
    mode === "mine"
      ? task.assignedBy?.name
        ? `From ${task.assignedBy.name}`
        : task.createdBy?.name
          ? `Created by ${task.createdBy.name}`
          : "Assigned to you"
      : task.assignees.map((a) => a.name).filter(Boolean).join(", ") || "Unassigned";

  return (
    <Link href="/task-tracker" className="dash-task-row group">
      <span className={`dash-task-rail ${tone.bar}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate font-serif text-[1.05rem] leading-snug tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {task.title}
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}>
            {tone.label}
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#8a8175]">
          <span className="truncate">{people}</span>
          {due ? (
            <span className={task.overdue ? "font-semibold text-rose-600" : ""}>
              · Due {due}
              {task.overdue ? " · overdue" : ""}
            </span>
          ) : null}
          {task.teams?.[0] ? <span>· {task.teams[0]}</span> : null}
        </span>
        {task.status === "IN_PROGRESS" ? (
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#efe8dc]">
            <span
              className={`block h-full rounded-full ${tone.bar}`}
              style={{ width: `${Math.min(100, task.progress || 0)}%` }}
            />
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 -space-x-1.5 self-center">
        {(mode === "assigned" ? task.assignees : task.assignedBy ? [task.assignedBy] : task.assignees)
          .slice(0, 3)
          .map((person) => (
            <span
              key={person.id}
              title={person.name}
              className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#1c1610] text-[9px] font-semibold text-[#e8d5b5] shadow-sm dark:border-[#2a241c]"
            >
              {person.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(person.name)
              )}
            </span>
          ))}
      </span>
    </Link>
  );
}

function TaskColumn({
  title,
  kicker,
  count,
  accent,
  empty,
  items,
  mode,
  loading,
}: {
  title: string;
  kicker: string;
  count: number;
  accent: "mine" | "assigned";
  empty: string;
  items: TrackerTaskDto[];
  mode: "mine" | "assigned";
  loading: boolean;
}) {
  return (
    <section className={`dash-task-board dash-task-board--${accent}`}>
      <header className="dash-task-board-head">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#9a7748]">
            {kicker}
          </p>
          <h2 className="mt-1 font-serif text-2xl tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {title}
          </h2>
        </div>
        <span className="dash-task-count">{count}</span>
      </header>

      <div className="dash-task-list">
        {loading ? (
          <div className="space-y-2.5 p-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[4.5rem] animate-pulse rounded-2xl bg-[#f4efe6] dark:bg-white/5" />
            ))}
          </div>
        ) : items.length ? (
          items.slice(0, 8).map((task) => <TaskRow key={task.id} task={task} mode={mode} />)
        ) : (
          <div className="dash-task-empty">
            <span className="dash-task-empty-icon" aria-hidden>
              {accent === "mine" ? "◎" : "⇢"}
            </span>
            <p>{empty}</p>
          </div>
        )}
      </div>

      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-[#eadfcf]/80 pt-3 dark:border-[#3a342c]">
        <p className="text-[11px] text-[#8a8175]">
          {items.length > 8 ? `Showing 8 of ${items.length}` : "Open tasks only"}
        </p>
        <Link
          href="/task-tracker"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a7748] hover:text-[#7d6139]"
        >
          Open tracker
        </Link>
      </footer>
    </section>
  );
}

export default function DashboardTaskBoards() {
  const [mine, setMine] = useState<TrackerTaskDto[]>([]);
  const [assigned, setAssigned] = useState<TrackerTaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await taskTrackerApi.boards();
        if (cancelled) return;
        setMine(data.mine?.items || []);
        setAssigned(data.assigned?.items || []);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setMine([]);
          setAssigned([]);
          setError(err instanceof Error ? err.message : "Could not load tasks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error && !mine.length && !assigned.length && !loading) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <TaskColumn
        title="My tasks"
        kicker="Assigned to me"
        count={mine.length}
        accent="mine"
        empty="Nothing on your plate right now."
        items={mine}
        mode="mine"
        loading={loading}
      />
      <TaskColumn
        title="I assigned"
        kicker="Sent to others"
        count={assigned.length}
        accent="assigned"
        empty="You haven’t assigned tasks to others yet."
        items={assigned}
        mode="assigned"
        loading={loading}
      />
    </div>
  );
}
