"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { settingsApi } from "@/services/crmApi";

const SETTINGS_KEY = "projects";

type OptionList = {
  id: string;
  title: string;
  hint: string;
  items: string[];
};

type ProjectValue = {
  lists: OptionList[];
  defaultFy: string;
  defaultStatus: string;
  autoAssignOwner: boolean;
  requireSiteAddress: boolean;
};

const defaultLists: OptionList[] = [
  {
    id: "project-types",
    title: "Project Types",
    hint: "Used on leads, projects, and design briefs",
    items: [
      "Residential",
      "Commercial",
      "Office",
      "Retail Showroom",
      "Renovation",
    ],
  },
  {
    id: "scopes",
    title: "Scopes",
    hint: "Work scope options for project & lead forms",
    items: [
      "Full Home Interiors",
      "Modular Kitchen",
      "Living Room",
      "Bedroom",
      "Office Fit-out",
      "Renovation",
      "Other",
    ],
  },
  {
    id: "budgets",
    title: "Budget Ranges",
    hint: "Shown in lead form and project filters",
    items: [
      "Under ₹5 Lakh",
      "₹5 – 10 Lakh",
      "₹10 – 25 Lakh",
      "₹25 – 50 Lakh",
      "Above ₹50 Lakh",
    ],
  },
  {
    id: "statuses",
    title: "Project Statuses",
    hint: "Pipeline stages for projects & leads",
    items: [
      "Created",
      "New",
      "Contacted",
      "Site Visit",
      "Quotation Sent",
      "Negotiation",
      "Won",
      "Lost",
    ],
  },
  {
    id: "financial-years",
    title: "Financial Years",
    hint: "Default FY options on project details",
    items: ["2024-25", "2025-26", "2026-27", "2027-28"],
  },
  {
    id: "sources",
    title: "Lead / Project Sources",
    hint: "Where enquiries come from",
    items: [
      "Walk-in",
      "Referral",
      "Website",
      "Instagram",
      "Facebook",
      "WhatsApp",
      "Exhibition",
      "Other",
    ],
  },
];

const defaults: ProjectValue = {
  lists: defaultLists,
  defaultFy: "2026-27",
  defaultStatus: "Created",
  autoAssignOwner: true,
  requireSiteAddress: true,
};

const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";
const toggleRow =
  "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#eadfcf] bg-white px-4 py-3 dark:border-[#3a342c] dark:bg-[#1a1714]";

function mergeLists(saved?: OptionList[]): OptionList[] {
  if (!Array.isArray(saved) || !saved.length) return defaultLists;
  const byId = new Map(saved.map((l) => [l.id, l]));
  return defaultLists.map((base) => {
    const found = byId.get(base.id);
    if (!found) return base;
    return {
      ...base,
      items: Array.isArray(found.items) ? found.items : base.items,
    };
  });
}

export default function ProjectSettings() {
  const [lists, setLists] = useState(defaultLists);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [defaultFy, setDefaultFy] = useState(defaults.defaultFy);
  const [defaultStatus, setDefaultStatus] = useState(defaults.defaultStatus);
  const [autoAssignOwner, setAutoAssignOwner] = useState(true);
  const [requireSiteAddress, setRequireSiteAddress] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const setting = await settingsApi.getByKey(SETTINGS_KEY);
        if (cancelled) return;
        const value =
          setting.value && typeof setting.value === "object"
            ? (setting.value as Partial<ProjectValue>)
            : {};
        setLists(mergeLists(value.lists));
        setDefaultFy(value.defaultFy || defaults.defaultFy);
        setDefaultStatus(value.defaultStatus || defaults.defaultStatus);
        setAutoAssignOwner(
          value.autoAssignOwner ?? defaults.autoAssignOwner
        );
        setRequireSiteAddress(
          value.requireSiteAddress ?? defaults.requireSiteAddress
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load settings"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = (listId: string) => {
    const value = (drafts[listId] || "").trim();
    if (!value) return;
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId && !list.items.includes(value)
          ? { ...list, items: [...list.items, value] }
          : list
      )
    );
    setDrafts((prev) => ({ ...prev, [listId]: "" }));
  };

  const removeItem = (listId: string, item: string) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.filter((x) => x !== item) }
          : list
      )
    );
  };

  const handleSave = async () => {
    const payload: ProjectValue = {
      lists,
      defaultFy,
      defaultStatus,
      autoAssignOwner,
      requireSiteAddress,
    };
    try {
      setSaving(true);
      setError("");
      await settingsApi.upsertByKey(SETTINGS_KEY, payload);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <Link
          href="/settings"
          className="mb-2 inline-flex text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
        >
          ← Settings
        </Link>
        <h1
          className="font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Project settings
        </h1>
        <p className="mt-1 text-sm text-[#8a7b68]">
          Master options for leads, projects, quotations, and design — keep
          forms consistent across the CRM.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="text-sm text-[#8a7b68]">Loading settings…</div>
      ) : null}

      <section className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411] sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">Defaults</p>
        <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          New projects
        </h2>
        <p className="mt-1 text-xs text-[#8a7b68]">Applied when creating a lead or project</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Default status</label>
            <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)} className={selectClass}>
              {(lists.find((l) => l.id === "statuses")?.items || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Default financial year</label>
            <select value={defaultFy} onChange={(e) => setDefaultFy(e.target.value)} className={selectClass}>
              {(lists.find((l) => l.id === "financial-years")?.items || []).map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <label className={toggleRow}>
            <div>
              <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">Auto-assign creator as owner</p>
              <p className="text-xs text-[#8a7b68]">New projects get the logged-in user as Sales Owner / Assigned To</p>
            </div>
            <input type="checkbox" checked={autoAssignOwner} onChange={(e) => setAutoAssignOwner(e.target.checked)} className="h-4 w-4 accent-[#1c1610]" />
          </label>
          <label className={toggleRow}>
            <div>
              <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">Require site / project address</p>
              <p className="text-xs text-[#8a7b68]">Block save when project address is empty</p>
            </div>
            <input type="checkbox" checked={requireSiteAddress} onChange={(e) => setRequireSiteAddress(e.target.checked)} className="h-4 w-4 accent-[#1c1610]" />
          </label>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {lists.map((list) => (
          <div
            key={list.id}
            className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411] sm:p-6"
          >
            <h3 className="font-serif text-lg text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {list.title}
            </h3>
            <p className="mt-0.5 text-xs text-[#8a7b68]">{list.hint}</p>
            <div className="mb-3 mt-4 flex flex-wrap gap-2">
              {list.items.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#eadfcf] bg-white px-3 py-1.5 text-xs font-medium text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeItem(list.id, item)}
                    className="text-[#8a7b68] hover:text-red-600"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {list.items.length === 0 && (
                <span className="text-xs text-[#a89880]">No options yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={drafts[list.id] || ""}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [list.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(list.id);
                  }
                }}
                placeholder={`Add ${list.title.toLowerCase().slice(0, -1)}…`}
                className="h-11 flex-1 rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-4 text-sm text-[#1c1610] outline-none placeholder:text-[#a89880] focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              />
              <button
                type="button"
                onClick={() => addItem(list.id)}
                className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 z-20 -mx-1 flex items-center justify-end gap-3 border-t border-[#eadfcf] bg-[#fbf8f3]/95 px-1 py-3 backdrop-blur-sm dark:border-[#3a342c] dark:bg-[#161411]/95">
        {saved ? <span className="mr-auto text-sm font-medium text-emerald-700 dark:text-emerald-300">Saved</span> : null}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-6 text-sm font-semibold text-[#e8d5b5] disabled:opacity-40 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
