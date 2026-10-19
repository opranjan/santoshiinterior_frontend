"use client";

import React, { useEffect, useMemo, useState } from "react";
import { designAssetUrl } from "@/lib/designAssets";
import CasualUpdateComposer from "@/components/casual-staff/CasualUpdateComposer";
import {
  casualApi,
  type CasualTask,
  type CasualTaskStatus,
  type CasualTaskUpdate,
} from "@/services/crmApi";

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

function fmtDue(value?: string | null) {
  if (!value) return "No due date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<CasualTaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

function TaskUpdateRow({ item }: { item: CasualTaskUpdate }) {
  const files = item.files || [];
  const photos = files.filter((f) => f.kind !== "VIDEO");
  const videos = files.filter((f) => f.kind === "VIDEO");
  return (
    <div className="rounded-xl bg-[#fbf6ee] px-3 py-2.5">
      {item.note ? <p className="text-sm text-[#1c1610]">{item.note}</p> : null}
      {item.managerNote ? <p className="mt-1 text-sm text-[#5c5146]">{item.managerNote}</p> : null}
      {files.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((file) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={file.id}
              src={designAssetUrl(file.url)}
              alt=""
              className="h-16 w-20 rounded-lg object-cover"
            />
          ))}
          {videos.map((file) => (
            <video key={file.id} src={designAssetUrl(file.url)} className="h-16 w-20 rounded-lg object-cover" />
          ))}
        </div>
      ) : null}
      <p className="mt-1 text-[11px] text-[#8a7b68]">
        {item.user?.name || "You"} · {fmtWhen(item.createdAt)}
      </p>
    </div>
  );
}

export default function CasualStaffTasksPage() {
  const [items, setItems] = useState<CasualTask[]>([]);
  const [filter, setFilter] = useState<"ACTIVE" | CasualTaskStatus>("ACTIVE");
  const [openId, setOpenId] = useState("");
  const [markDone, setMarkDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await casualApi.listMyTasks();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ACTIVE") return items.filter((row) => row.status !== "DONE");
    return items.filter((row) => row.status === filter);
  }, [items, filter]);

  return (
    <div className="casual-home space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">Casual › Tasks</p>
        <h1 className="mt-1 font-serif text-[1.75rem] text-[#1c1610]" style={{ fontFamily: "Georgia, serif" }}>
          My Tasks
        </h1>
        <p className="mt-1 text-sm text-[#8a7b68]">
          Work assigned from the CRM. Open a task and share photos, videos, or a note.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["ACTIVE", "OPEN", "IN_PROGRESS", "DONE"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`h-9 rounded-xl px-3 text-sm font-medium ${
              filter === id ? "bg-[#9a7348] text-white" : "border border-[#eadfcf] bg-white text-[#6b5740]"
            }`}
          >
            {id === "ACTIVE" ? "Active" : STATUS_LABEL[id]}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-[#8a7b68]">Loading tasks…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">{saved}</p> : null}

      {!loading && filtered.length === 0 ? (
        <div className="rounded-[22px] border border-[#eadfcf] bg-white px-4 py-12 text-center text-sm text-[#8a7b68]">
          No tasks in this list yet.
        </div>
      ) : null}

      <div className="space-y-3">
        {filtered.map((row) => {
          const open = openId === row.id;
          return (
            <article key={row.id} className="rounded-[22px] border border-[#eadfcf] bg-white p-4 sm:p-5">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => setOpenId(open ? "" : row.id)}
              >
                <div>
                  <h2 className="font-serif text-xl text-[#1c1610]" style={{ fontFamily: "Georgia, serif" }}>
                    {row.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#8a7b68]">Due {fmtDue(row.dueAt)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    row.status === "DONE"
                      ? "bg-emerald-50 text-emerald-700"
                      : row.status === "IN_PROGRESS"
                        ? "bg-[#f6efe4] text-[#6b5740]"
                        : "bg-[#fff4e8] text-[#9a7348]"
                  }`}
                >
                  {STATUS_LABEL[row.status]}
                </span>
              </button>

              {open ? (
                <div className="mt-4 space-y-4 border-t border-[#eadfcf] pt-4">
                  {row.description ? <p className="text-sm text-[#5c5146]">{row.description}</p> : null}
                  {row.createdBy?.name ? (
                    <p className="text-xs text-[#8a7b68]">Assigned by {row.createdBy.name}</p>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c4a574]">Updates</p>
                    {row.updates.length === 0 ? (
                      <p className="text-sm text-[#8a7b68]">No updates yet.</p>
                    ) : (
                      row.updates.map((item) => <TaskUpdateRow key={item.id} item={item} />)
                    )}
                  </div>

                  {row.status !== "DONE" ? (
                    <CasualUpdateComposer
                      submitLabel="Submit Update"
                      extra={
                        <label className="mt-3 flex items-center gap-2 text-sm text-[#5c5146]">
                          <input
                            type="checkbox"
                            checked={markDone}
                            onChange={(e) => setMarkDone(e.target.checked)}
                          />
                          Mark as done
                        </label>
                      }
                      onSubmit={async (form) => {
                        form.append("status", markDone ? "DONE" : "IN_PROGRESS");
                        const savedTask = await casualApi.addTaskUpdate(row.id, form);
                        setItems((prev) => prev.map((item) => (item.id === savedTask.id ? savedTask : item)));
                        setMarkDone(false);
                        setSaved("Update sent.");
                        window.setTimeout(() => setSaved(""), 1800);
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
