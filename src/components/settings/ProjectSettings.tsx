"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
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
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

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
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500">Loading settings…</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Project Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Master options for leads, projects, quotations, and design — keep
            forms consistent across the CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm font-medium text-success-600">Saved</span>
          )}
          <Button size="sm" onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Defaults for new projects
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Applied when creating a lead or project
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Default Status</Label>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value)}
              className={selectClass}
            >
              {(lists.find((l) => l.id === "statuses")?.items || []).map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <Label>Default Financial Year</Label>
            <select
              value={defaultFy}
              onChange={(e) => setDefaultFy(e.target.value)}
              className={selectClass}
            >
              {(
                lists.find((l) => l.id === "financial-years")?.items || []
              ).map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Auto-assign creator as owner
              </p>
              <p className="text-xs text-gray-500">
                New projects get the logged-in user as Sales Owner / Assigned To
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoAssignOwner}
              onChange={(e) => setAutoAssignOwner(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Require site / project address
              </p>
              <p className="text-xs text-gray-500">
                Block save when project address is empty
              </p>
            </div>
            <input
              type="checkbox"
              checked={requireSiteAddress}
              onChange={(e) => setRequireSiteAddress(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {lists.map((list) => (
          <div
            key={list.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
          >
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {list.title}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">{list.hint}</p>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {list.items.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-white/[0.06] dark:text-gray-300"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeItem(list.id, item)}
                    className="text-gray-400 hover:text-error-500"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {list.items.length === 0 && (
                <span className="text-xs text-gray-400">No options yet</span>
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
                className="h-11 flex-1 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => addItem(list.id)}
              >
                Add
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
