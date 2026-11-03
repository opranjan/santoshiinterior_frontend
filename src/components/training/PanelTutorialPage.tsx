"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { trainingApi, type TrainingVideoDto } from "@/services/crmApi";

const PANEL_LABELS: Record<string, string> = {
  ALL: "All panels",
  CRM: "CRM",
  PROCUREMENT: "Procurement",
  VENDOR: "Vendor",
  HR: "HR",
  CASUAL: "Casual staff",
};

function formatDuration(sec?: number | null) {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PanelTutorialPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPanel, setUserPanel] = useState("CRM");
  const [items, setItems] = useState<TrainingVideoDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [playLoading, setPlayLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void trainingApi
      .list()
      .then((data) => {
        if (cancelled) return;
        const panel = String(data.panel || "CRM").toUpperCase();
        setUserPanel(panel);
        const published = (data.items || []).filter((row) => row.isPublished);
        const forPanel = published.filter(
          (row) => row.panel === "ALL" || String(row.panel).toUpperCase() === panel
        );
        const list = forPanel.length ? forPanel : published;
        const sorted = [...list].sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setItems(sorted);
        if (sorted[0]) setActiveId(sorted[0].id);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tutorials");
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      setPlayUrl(null);
      return;
    }
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

  const active = useMemo(
    () => items.find((row) => row.id === activeId) || null,
    [items, activeId]
  );

  const panelLabel = PANEL_LABELS[userPanel] || userPanel;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7748]">
            Tutorial · {panelLabel}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1c1610] dark:text-white sm:text-3xl">
            Walkthroughs for your role
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#8a7b68]">
            Videos uploaded for your panel and team. Select a tutorial to watch the full walkthrough.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-xl border border-[#eadfcf] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68] hover:border-[#c4a574] hover:text-[#1c1610]"
        >
          Back
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#eadfcf] bg-white px-5 py-16 text-sm text-[#8a7b68]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a574] border-t-transparent" />
          Loading tutorials…
        </div>
      ) : error && !items.length ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-sm text-rose-700">
          {error}
        </div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-[#eadfcf] bg-white px-5 py-16 text-center">
          <p className="text-base font-semibold text-[#1c1610]">No tutorials yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#8a7b68]">
            No tutorial videos for your role yet. Ask an admin to upload one in Training for your panel
            and role.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm">
            <div className="border-b border-[#efe6d8] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                {items.length} video{items.length === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="max-h-[70vh] divide-y divide-[#f0e8db] overflow-y-auto p-2">
              {items.map((item) => {
                const selected = item.id === activeId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setActiveId(item.id);
                      }}
                      className={`w-full rounded-xl px-3 py-3 text-left transition ${
                        selected
                          ? "bg-[#1c1610] text-[#e8d5b5]"
                          : "text-[#2b2118] hover:bg-[#f7f0e6]"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">
                        {item.title}
                      </p>
                      <p
                        className={`mt-1 text-[11px] ${
                          selected ? "text-[#c4a574]" : "text-[#8a7b68]"
                        }`}
                      >
                        {item.panelLabel || PANEL_LABELS[item.panel] || item.panel}
                        {formatDuration(item.durationSec)
                          ? ` · ${formatDuration(item.durationSec)}`
                          : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm">
            <div className="relative aspect-video bg-[#1a1510]">
              {playLoading ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-[#d4c4a8]">
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
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center text-[#d4c4a8]">
                  <svg viewBox="0 0 24 24" className="h-10 w-10 opacity-70" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <p className="text-sm">Select a tutorial from the list</p>
                </div>
              )}
            </div>
            <div className="border-t border-[#efe6d8] px-5 py-5 sm:px-6">
              {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
              {active ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-[#1c1610] dark:text-white sm:text-xl">
                      {active.title}
                    </h2>
                    <span className="rounded-md bg-[#efe6d8] px-2 py-0.5 text-[11px] font-medium text-[#5c4a32]">
                      {active.panelLabel || PANEL_LABELS[active.panel] || active.panel}
                    </span>
                  </div>
                  {active.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#6b5d4d]">
                      {active.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[#8a7b68]">No description provided.</p>
                  )}
                </>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
