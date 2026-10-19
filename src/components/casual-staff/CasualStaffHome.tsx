"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { designAssetUrl } from "@/lib/designAssets";
import Link from "next/link";
import { casualApi, type CasualTask, type CasualUpdate } from "@/services/crmApi";
import CasualUpdateComposer from "@/components/casual-staff/CasualUpdateComposer";

function initials(name?: string) {
  return String(name || "CS")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function fmtWhen(value?: string) {
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

function firstLine(text?: string | null) {
  const t = String(text || "").trim();
  if (!t) return "Work update";
  return t.split("\n")[0].slice(0, 60);
}

function IconNote({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3.8h7.2L19 8.6V20.2H7z" />
      <path d="M14.1 3.8v4.8H19" />
      <path d="M10 12.2h5.2M10 15.6h5.2" />
    </svg>
  );
}

function IconClock({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.2V12l2.6 1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function CasualStaffHome({
  mode = "home",
}: {
  mode?: "home" | "upload" | "updates";
}) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<CasualUpdate[]>([]);
  const [tasks, setTasks] = useState<CasualTask[]>([]);
  const [filter, setFilter] = useState<"ALL" | "SENT" | "REVIEWED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "updates") {
        const data = await casualApi.listUpdates({ limit: 500 });
        setUpdates(data.items || []);
        setTasks([]);
      } else {
        const data = await casualApi.home();
        setUpdates(data.updates || []);
        setTasks(data.tasks || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load updates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => (filter === "ALL" ? updates : updates.filter((row) => row.status === filter)),
    [updates, filter]
  );

  const name = user?.name || "Team member";

  return (
    <div className="casual-home space-y-5">
      {mode !== "updates" ? (
          <div className="casual-hero flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
            <div className="shrink-0 px-1 lg:w-[240px] xl:w-[260px]">
              <h1
                className="font-serif text-[1.75rem] leading-[1.12] text-[#2a2118] xl:text-[1.95rem]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Casual Staff Portal
              </h1>
              <p className="mt-1.5 text-[13px] text-[#8a7b68]">Share your daily work updates</p>
            </div>

            <div className="casual-hero-banner relative h-[132px] min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[#ead9c4] bg-[#f8f1e6] lg:h-[148px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/casual/hero-banner.jpg?v=3"
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="relative z-10 flex h-full max-w-[46%] items-center gap-3.5 px-5">
                <span className="grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-full bg-[#c4a574] text-[14px] font-semibold tracking-wide text-[#2a2118] shadow-[0_0_0_4px_rgba(248,241,230,0.5)]">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={designAssetUrl(user.avatarUrl)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(name)
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate font-serif text-[1.28rem] leading-tight text-[#2a2118]"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    Hello, {name} <span aria-hidden>👋</span>
                  </p>
                  <p className="mt-1 truncate text-[13px] text-[#6b5740]">Record what you completed today.</p>
                </div>
              </div>
            </div>
          </div>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">Casual › Updates</p>
          <h1 className="mt-1 font-serif text-[1.75rem] text-[#1c1610]" style={{ fontFamily: "Georgia, serif" }}>
            My Updates
          </h1>
        </div>
      )}

      {mode === "home" && tasks.length > 0 ? (
        <div className="rounded-[22px] border border-[#eadfcf] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-[1.25rem] text-[#1c1610]" style={{ fontFamily: "Georgia, serif" }}>
              My Tasks
            </h2>
            <Link href="/casual/tasks" className="text-sm font-medium text-[#9a7348]">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 4).map((row) => (
              <Link
                key={row.id}
                href="/casual/tasks"
                className="flex items-center justify-between rounded-xl border border-[#eadfcf] px-3 py-2.5"
              >
                <span className="truncate text-sm font-medium text-[#1c1610]">{row.title}</span>
                <span className="shrink-0 text-xs text-[#8a7b68]">
                  {row.status === "IN_PROGRESS" ? "In progress" : "Open"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`grid gap-5 ${mode === "home" ? "lg:grid-cols-[1.18fr_0.82fr]" : ""}`}>
        {mode !== "updates" ? (
          <CasualUpdateComposer
            onSubmit={async (form) => {
              const savedRow = await casualApi.createUpdate(form);
              setUpdates((prev) => [savedRow, ...prev]);
              setSaved("Update submitted.");
              window.setTimeout(() => setSaved(""), 1800);
            }}
          />
        ) : null}

        {mode !== "upload" ? (
          <div className="rounded-[22px] border border-[#eadfcf] bg-white p-4 shadow-[0_8px_24px_rgba(90,70,40,0.04)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f6efe4] text-[#b89158]">
                  <IconClock className="h-[18px] w-[18px]" />
                </span>
                <h2
                  className="font-serif text-[1.35rem] text-[#2a2118]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  My Updates
                </h2>
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="h-9 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm text-[#5c5146]"
              >
                <option value="ALL">All Updates</option>
                <option value="SENT">Sent</option>
                <option value="REVIEWED">Reviewed</option>
              </select>
            </div>
            {loading ? <p className="py-8 text-center text-sm text-[#8a7b68]">Loading updates…</p> : null}
            {!loading && filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#8a7b68]">
                {mode === "updates"
                  ? "No updates yet. Share work from Home or on a task."
                  : "No updates yet. Share today’s work on the left."}
              </p>
            ) : null}
            <div className="space-y-3">
              {filtered.map((row) => (
                <UpdateRow key={row.id} row={row} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {saved ? <p className="text-sm text-emerald-700">{saved}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function UpdateRow({ row }: { row: CasualUpdate }) {
  const photos = (row.files || []).filter((f) => f.kind !== "VIDEO");
  const videos = (row.files || []).filter((f) => f.kind === "VIDEO");
  const cover = videos[0] || photos[0];
  const second = photos[1] || (videos[0] && photos[0]);
  const reviewed = row.status === "REVIEWED";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#f0e8db] bg-[#fdfbf7] p-3">
      <div className="relative mt-0.5 h-[58px] w-[74px] shrink-0">
        {second ? (
          <div className="absolute left-3 top-1 h-[50px] w-[58px] overflow-hidden rounded-lg bg-[#eadfcf] ring-2 ring-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={designAssetUrl(second.url)} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className={`relative overflow-hidden rounded-lg bg-[#eadfcf] ${second ? "h-[54px] w-[58px]" : "h-[58px] w-[74px]"}`}>
          {cover ? (
            cover.kind === "VIDEO" ? (
              <video src={designAssetUrl(cover.url)} className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={designAssetUrl(cover.url)} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="grid h-full place-items-center text-[#c4a574]">
              <IconNote />
            </span>
          )}
          {cover?.kind === "VIDEO" ? (
            <>
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white">
                  <svg className="ml-0.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 6.5v11l9-5.5z" />
                  </svg>
                </span>
              </span>
              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-medium text-white">
                VIDEO
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold text-[#2a2118]">{row.title || firstLine(row.note)}</p>
        </div>
        <p className="text-xs text-[#8a7b68]">{fmtWhen(row.createdAt)}</p>
        <p className="mt-1 line-clamp-2 text-sm text-[#5c5146]">{row.note || row.managerNote || "—"}</p>
      </div>
      <span
        className={`mt-0.5 h-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          reviewed
            ? "bg-[#e8f0fb] text-[#3d7ea6]"
            : row.source === "TASK"
              ? "bg-[#f6efe4] text-[#6b5740]"
              : "bg-[#e5f6ee] text-[#1b9c6d]"
        }`}
      >
        {reviewed ? "Reviewed" : row.source === "TASK" ? "Task" : "Sent"}
      </span>
    </div>
  );
}
