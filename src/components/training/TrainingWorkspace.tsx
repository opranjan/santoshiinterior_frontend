"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";
import {
  rolesApi,
  trainingApi,
  type TrainingVideoDto,
} from "@/services/crmApi";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";

type CategoryId = "ALL" | "CRM" | "PROCUREMENT" | "VENDOR" | "HR" | "CASUAL";

const CATEGORIES: {
  id: CategoryId;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tagClass: string;
}[] = [
  {
    id: "ALL",
    label: "All",
    hint: "Full library",
    tagClass: "bg-[#efe6d8] text-[#5c4a32]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "CRM",
    label: "CRM",
    hint: "Core CRM",
    tagClass: "bg-[#dbeafe] text-[#1e40af]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 19V5M4 19h16M8 15V9M12 15V7M16 15v-4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "PROCUREMENT",
    label: "Procurement",
    hint: "RFQ & orders",
    tagClass: "bg-[#dcfce7] text-[#166534]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 7h16l-1.5 11H5.5L4 7z" strokeLinejoin="round" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "VENDOR",
    label: "Vendor",
    hint: "Vendor panel",
    tagClass: "bg-[#f3e8ff] text-[#6b21a8]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c.8-3 3.2-5 6-5s5.2 2 6 5" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.2" />
      </svg>
    ),
  },
  {
    id: "HR",
    label: "HR",
    hint: "People ops",
    tagClass: "bg-[#fce7f3] text-[#9d174d]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19c1.2-3.5 3.8-5.5 7-5.5s5.8 2 7 5.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "CASUAL",
    label: "Casual",
    hint: "Field staff",
    tagClass: "bg-[#ffedd5] text-[#9a3412]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 17l4-8 4 4 4-6 4 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function formatBytes(n: number) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec?: number | null) {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function relativeDate(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function categoryMeta(panel: string) {
  return CATEGORIES.find((c) => c.id === panel) || CATEGORIES[1];
}

export default function TrainingWorkspace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TrainingVideoDto[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [panels, setPanels] = useState<{ id: string; label: string }[]>([]);
  const [roles, setRoles] = useState<{ key: string; label: string }[]>([]);
  const [s3Ok, setS3Ok] = useState(true);

  const [category, setCategory] = useState<CategoryId>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "title">("latest");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [playLoading, setPlayLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [panel, setPanel] = useState("CRM");
  const [roleKeys, setRoleKeys] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

  const manageAllowed =
    canManage ||
    hasAnyPermission(user, ["training.manage", "users.manage", "settings.manage"]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, meta] = await Promise.all([
        trainingApi.list(),
        trainingApi.meta().catch(() => ({ panels: [], s3Configured: false })),
      ]);
      setItems(list.items || []);
      setCanManage(Boolean(list.canManage));
      setPanels(meta.panels || []);
      setS3Ok(meta.s3Configured !== false);
      if (list.canManage || hasAnyPermission(user, ["training.manage", "users.manage"])) {
        try {
          const roleList = await rolesApi.list();
          setRoles(
            (roleList || []).map((r) => ({
              key: r.key,
              label: r.label || r.key,
            }))
          );
        } catch {
          setRoles([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load training");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: items.length };
    for (const item of items) {
      map[item.panel] = (map[item.panel] || 0) + 1;
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    let rows = [...items];
    if (category !== "ALL") {
      rows = rows.filter((r) => r.panel === category || r.panel === "ALL");
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          String(r.description || "")
            .toLowerCase()
            .includes(q) ||
          String(r.panelLabel || r.panel)
            .toLowerCase()
            .includes(q)
      );
    }
    rows.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  }, [items, category, search, sort]);

  const active = useMemo(
    () => items.find((i) => i.id === activeId) || filtered[0] || null,
    [items, activeId, filtered]
  );

  const related = useMemo(() => {
    if (!active) return [];
    return filtered.filter((i) => i.id !== active.id).slice(0, 6);
  }, [filtered, active]);

  useEffect(() => {
    if (!activeId && filtered[0]) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setPlayLoading(true);
    setPlayUrl(null);
    void trainingApi
      .playbackUrl(activeId)
      .then((data) => {
        if (!cancelled) setPlayUrl(data.url);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load video");
        }
      })
      .finally(() => {
        if (!cancelled) setPlayLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const openPlayback = (video: TrainingVideoDto) => {
    setActiveId(video.id);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPanel("CRM");
    setRoleKeys([]);
    setFile(null);
    setUploadPct(0);
    setShowForm(false);
  };

  const toggleRole = (key: string) => {
    setRoleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const submitUpload = async () => {
    if (!file || !title.trim()) {
      setError("Title and video file are required");
      return;
    }
    const looksVideo =
      (file.type && file.type.startsWith("video/")) ||
      /\.(mp4|webm|mov|m4v|avi|mkv|mpeg|mpg)$/i.test(file.name);
    if (!looksVideo) {
      setError("Please choose a video file");
      return;
    }
    setSaving(true);
    setError(null);
    setUploadPct(2);
    try {
      await trainingApi.upload(
        {
          title: title.trim(),
          description: description.trim() || "",
          panel,
          roleKeys,
          isPublished: true,
        },
        file,
        (pct) => setUploadPct(pct)
      );
      setUploadPct(100);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const removeVideo = async (id: string) => {
    if (!confirm("Delete this training video?")) return;
    try {
      await trainingApi.remove(id);
      if (activeId === id) {
        setActiveId(null);
        setPlayUrl(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) return <PageSkeleton />;

  const panelOptions = panels.length
    ? panels
    : CATEGORIES.filter((c) => c.id !== "ALL").map((c) => ({
        id: c.id,
        label: c.label,
      }));

  const activeCat = categoryMeta(active?.panel || "CRM");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="font-serif text-[1.65rem] leading-tight text-[#2b2118] sm:text-[1.85rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Training & Walkthroughs
          </h1>
          <p className="mt-0.5 text-sm text-[#8a7b68]">
            Learn Santoshi CRM with short, practical videos
          </p>
        </div>
        {manageAllowed ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d2f24] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#2b2118]"
          >
            <span className="text-base leading-none">+</span>
            {showForm ? "Close" : "Upload Walkthrough"}
          </button>
        ) : null}
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/casual/hero-living-room.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2b2118]/92 via-[#2b2118]/75 to-[#2b2118]/35" />
        <div className="relative flex min-h-[168px] flex-col justify-center px-5 py-7 sm:min-h-[200px] sm:px-8">
          <p
            className="max-w-md font-serif text-2xl leading-snug text-white sm:text-3xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Learn. Practice. Work Smarter.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Short Videos", icon: "▶" },
              { label: "For Every Module", icon: "▦" },
              { label: "Learn at Your Own Pace", icon: "◷" },
            ].map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm"
              >
                <span className="opacity-80">{chip.icon}</span>
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {!s3Ok ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          S3 is not configured. Set AWS credentials to upload/play videos.
        </div>
      ) : null}
      {error ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" className="text-xs underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Upload form */}
      {manageAllowed && showForm ? (
        <section className="rounded-2xl border border-[#e8dfd2] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#2b2118]">Upload walkthrough</h2>
          <p className="mt-0.5 text-xs text-[#8a7b68]">Stored on AWS S3 · target panel & roles</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none focus:border-[#c4a574]"
                placeholder="e.g. Getting Started with Santoshi CRM"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none focus:border-[#c4a574]"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Panel / module</span>
              <select
                value={panel}
                onChange={(e) => setPanel(e.target.value)}
                className="w-full rounded-lg border border-[#e8dfd2] px-3 py-2.5 text-sm outline-none focus:border-[#c4a574]"
              >
                {panelOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-[#6b5d4d]">Video file</span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-medium text-[#6b5d4d]">
                Roles (optional — empty = all roles)
              </p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-[#e8dfd2] p-2">
                {roles.map((r) => {
                  const on = roleKeys.includes(r.key);
                  return (
                    <label
                      key={r.key}
                      className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs ${
                        on
                          ? "border-[#3d2f24] bg-[#3d2f24] text-white"
                          : "border-[#e8dfd2] text-[#6b5d4d]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => toggleRole(r.key)}
                      />
                      {r.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          {saving ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-[#efe6d8]">
                <div
                  className="h-full rounded-full bg-[#c4a574] transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-[#8a7b68]">Uploading… {uploadPct}%</p>
            </div>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submitUpload()}
              className="rounded-lg bg-[#3d2f24] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Uploading…" : "Publish"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="rounded-lg border border-[#e8dfd2] px-4 py-2 text-sm text-[#6b5d4d]"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {/* Category cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((cat) => {
          const count = counts[cat.id] || 0;
          const selected = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-[#3d2f24] bg-[#3d2f24] text-white shadow-sm"
                  : "border-[#e8dfd2] bg-white text-[#2b2118] hover:border-[#c4a574]/70"
              }`}
            >
              <div
                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${
                  selected ? "bg-white/15 text-[#e8d5b5]" : "bg-[#f5efe6] text-[#6b5d4d]"
                }`}
              >
                {cat.icon}
              </div>
              <p className="text-sm font-semibold">{cat.label}</p>
              <p className={`text-[11px] ${selected ? "text-white/70" : "text-[#8a7b68]"}`}>
                {count} video{count === 1 ? "" : "s"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Split: library + player */}
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
        {/* Library */}
        <div className="overflow-hidden rounded-2xl border border-[#e8dfd2] bg-white">
          <div className="border-b border-[#efe6d8] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#2b2118]">Video Library</h2>
              <span className="text-[11px] text-[#8a7b68]">{filtered.length} shown</span>
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a89478]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3-3" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search videos…"
                  className="w-full rounded-lg border border-[#e8dfd2] bg-[#faf7f2] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#c4a574]"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryId)}
                  className="flex-1 rounded-lg border border-[#e8dfd2] bg-white px-2 py-2 text-xs outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "latest" | "title")}
                  className="flex-1 rounded-lg border border-[#e8dfd2] bg-white px-2 py-2 text-xs outline-none"
                >
                  <option value="latest">Latest First</option>
                  <option value="title">Title A–Z</option>
                </select>
              </div>
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#8a7b68]">
                No videos in this category yet.
              </p>
            ) : (
              filtered.map((item, index) => {
                const selected = active?.id === item.id;
                const cat = categoryMeta(item.panel);
                const dur = formatDuration(item.durationSec);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openPlayback(item)}
                    className={`flex w-full gap-3 border-b border-[#f3ebe0] px-3 py-3 text-left transition last:border-0 ${
                      selected ? "bg-[#f7f1e8]" : "hover:bg-[#faf7f2]"
                    }`}
                  >
                    <div className="relative h-[64px] w-[96px] shrink-0 overflow-hidden rounded-lg bg-[#3d2f24]">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-70"
                        style={{
                          backgroundImage: "url('/images/casual/hero-living-room.jpg')",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#2b2118]">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 translate-x-px" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </div>
                      {dur ? (
                        <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 text-[9px] font-medium text-white">
                          {dur}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#2b2118]">
                        {index + 1}. {item.title}
                      </p>
                      {item.description ? (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-[#8a7b68]">
                          {item.description}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cat.tagClass}`}
                        >
                          {item.panelLabel || cat.label}
                        </span>
                        <span className="text-[10px] text-[#a89478]">
                          {item.sizeBytes ? formatBytes(item.sizeBytes) : ""}
                          {item.sizeBytes ? " · " : ""}
                          {relativeDate(item.createdAt)}
                        </span>
                      </div>
                      {manageAllowed ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="mt-1 inline-block text-[10px] text-red-600 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            void removeVideo(item.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              void removeVideo(item.id);
                            }
                          }}
                        >
                          Delete
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Player + details */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[#e8dfd2] bg-white shadow-sm">
            <div className="relative aspect-video bg-[#1a1510]">
              {playLoading ? (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-[#d4c4a8]">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#c4a574] border-t-transparent" />
                  <span className="text-sm">Loading video…</span>
                </div>
              ) : playUrl ? (
                <video
                  key={playUrl}
                  src={playUrl}
                  controls
                  autoPlay
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-6 text-center text-[#d4c4a8]">
                  <p className="text-sm">Select a video from the library</p>
                </div>
              )}
            </div>

            {active ? (
              <div className="border-t border-[#efe6d8] px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-[#2b2118] sm:text-lg">
                    {active.title}
                  </h3>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-medium ${activeCat.tagClass}`}
                  >
                    {active.panelLabel || activeCat.label}
                  </span>
                </div>
                {active.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-[#6b5d4d]">
                    {active.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#8a7b68]">
                  {formatDuration(active.durationSec) ? (
                    <span>Duration: {formatDuration(active.durationSec)}</span>
                  ) : null}
                  <span>{relativeDate(active.createdAt)}</span>
                  {active.createdBy?.name ? (
                    <span>Uploaded by {active.createdBy.name}</span>
                  ) : null}
                  {active.sizeBytes ? <span>{formatBytes(active.sizeBytes)}</span> : null}
                </div>
              </div>
            ) : null}
          </div>

          {related.length ? (
            <div className="rounded-2xl border border-[#e8dfd2] bg-white p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#2b2118]">Related Videos</h4>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {related.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openPlayback(item)}
                    className="w-[160px] shrink-0 text-left"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-[#3d2f24]">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-70"
                        style={{
                          backgroundImage: "url('/images/casual/hero-living-room.jpg')",
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 translate-x-px" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug text-[#2b2118]">
                      {item.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
