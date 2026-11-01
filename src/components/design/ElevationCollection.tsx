"use client";

import React, { useEffect, useState } from "react";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  elevationSeriesApi,
  type ElevationSeriesDto,
  type ElevationSeriesMaterialDto,
} from "@/services/crmApi";

type DraftMaterial = {
  key: string;
  material: string;
  sizes: string;
  code: string;
  thickness: string;
};

type View = "list" | "create" | "detail";

const cellInput =
  "h-9 w-full min-w-0 border-0 bg-transparent px-2 text-sm text-[#1c1610] outline-none placeholder:text-[#c4b8a8] focus:bg-[#fbf8f3] dark:text-[#f3ece2] dark:placeholder:text-[#5a5044] dark:focus:bg-white/[0.04]";

const metaInput =
  "h-10 w-full rounded-lg border border-[#eadfcf] bg-[#fdfbf7] px-3 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] focus:ring-2 focus:ring-[#c4a574]/20 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

function emptyMaterial(): DraftMaterial {
  return {
    key: `${Date.now()}-${Math.random()}`,
    material: "",
    sizes: "",
    code: "",
    thickness: "",
  };
}

function fromDto(materials?: ElevationSeriesMaterialDto[]): DraftMaterial[] {
  if (!materials?.length) return [emptyMaterial()];
  return materials.map((item) => ({
    key: item.id || emptyMaterial().key,
    material: item.material || "",
    sizes: item.sizes || "",
    code: item.code || "",
    thickness: item.thickness || "",
  }));
}

export default function ElevationCollection() {
  const [series, setSeries] = useState<ElevationSeriesDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>("list");
  const [active, setActive] = useState<ElevationSeriesDto | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState<DraftMaterial[]>([emptyMaterial()]);

  const refreshList = async () => {
    const rows = await elevationSeriesApi.list();
    setSeries(rows);
    return rows;
  };

  useEffect(() => {
    setLoading(true);
    refreshList()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load series"))
      .finally(() => setLoading(false));
  }, []);

  const startCreate = () => {
    setView("create");
    setActive(null);
    setName("");
    setDescription("");
    setMaterials([emptyMaterial()]);
  };

  const openSeries = async (row: ElevationSeriesDto) => {
    try {
      setSaving(true);
      const full = await elevationSeriesApi.get(row.id);
      setActive(full);
      setName(full.name);
      setDescription(full.description || "");
      setMaterials(fromDto(full.materials));
      setView("detail");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to open series");
    } finally {
      setSaving(false);
    }
  };

  const backToList = async () => {
    setView("list");
    setActive(null);
    setName("");
    setDescription("");
    setMaterials([emptyMaterial()]);
    try {
      await refreshList();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to refresh series");
    }
  };

  const createSeries = async () => {
    if (!name.trim()) {
      toastWarning("Series name is required.");
      return;
    }
    try {
      setSaving(true);
      const created = await elevationSeriesApi.create({
        name: name.trim(),
        description: description.trim() || null,
        materials: [],
      });
      toastSuccess("Series created. Now add materials.");
      await refreshList();
      setActive(created);
      setName(created.name);
      setDescription(created.description || "");
      setMaterials([emptyMaterial()]);
      setView("detail");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create series");
    } finally {
      setSaving(false);
    }
  };

  const saveMaterials = async () => {
    if (!active?.id) return;
    if (!name.trim()) {
      toastWarning("Series name is required.");
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      materials: materials
        .filter(
          (row) =>
            row.material.trim() || row.sizes.trim() || row.code.trim() || row.thickness.trim()
        )
        .map((row) => ({
          material: row.material.trim(),
          sizes: row.sizes.trim(),
          code: row.code.trim(),
          thickness: row.thickness.trim(),
        })),
    };
    try {
      setSaving(true);
      const updated = await elevationSeriesApi.update(active.id, payload);
      setActive(updated);
      setMaterials(fromDto(updated.materials));
      await refreshList();
      toastSuccess("Materials saved.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to save materials");
    } finally {
      setSaving(false);
    }
  };

  const removeSeries = async () => {
    if (!active?.id) return;
    if (!window.confirm("Delete this series and all its materials?")) return;
    try {
      setSaving(true);
      await elevationSeriesApi.remove(active.id);
      toastSuccess("Series deleted.");
      await backToList();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to delete series");
    } finally {
      setSaving(false);
    }
  };

  const updateMaterial = (key: string, patch: Partial<DraftMaterial>) => {
    setMaterials((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeMaterial = (key: string) => {
    setMaterials((prev) =>
      prev.length <= 1 ? [emptyMaterial()] : prev.filter((item) => item.key !== key)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#b0a89d]">
            Architecture
          </p>
          <h1 className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-[#111111] dark:text-white">
            Elevation Collection
          </h1>
          <p className="mt-2 text-sm text-[#8a7b68]">
            {view === "list"
              ? "Add a series, then open it to manage materials."
              : view === "create"
                ? "Create the series first."
                : "Edit materials in this series."}
          </p>
        </div>
        {view === "list" ? (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
          >
            + Add series
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void backToList()}
            className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          >
            ← All series
          </button>
        )}
      </div>

      {view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="flex items-center justify-between border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
              Series list
            </p>
            <p className="text-xs text-[#8a7b68]">
              {loading ? "…" : `${series.length} series`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#eadfcf] bg-[#1c1610] text-left text-[11px] uppercase tracking-[0.12em] text-[#e8d5b5] dark:border-[#3a342c]">
                  <th className="w-14 px-4 py-3 font-medium">Sr.</th>
                  <th className="min-w-[220px] px-4 py-3 font-medium">Series name</th>
                  <th className="min-w-[220px] px-4 py-3 font-medium">Description</th>
                  <th className="w-28 px-4 py-3 font-medium">Materials</th>
                  <th className="w-36 px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[#8a7b68]">
                      Loading series…
                    </td>
                  </tr>
                ) : series.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <p className="text-[#8a7b68]">No series yet.</p>
                      <button
                        type="button"
                        onClick={startCreate}
                        className="mt-2 text-sm font-semibold text-[#9a7748]"
                      >
                        + Add your first series
                      </button>
                    </td>
                  </tr>
                ) : (
                  series.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-b border-[#f0e8db] last:border-0 hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 text-[#8a7b68]">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold uppercase tracking-[0.03em] text-[#1c1610] dark:text-[#f3ece2]">
                          {row.name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[#6b645b] dark:text-[#b8aea0]">
                        {row.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-[#f6efe4] px-2.5 py-1 text-xs font-semibold text-[#9a7748] dark:bg-[#c4a574]/15 dark:text-[#e8d5b5]">
                          {(row.materials || []).length}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void openSeries(row)}
                          className="inline-flex h-9 items-center rounded-lg bg-[#1c1610] px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#e8d5b5]"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {view === "create" ? (
        <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
              New series
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#eadfcf] bg-[#1c1610] text-left text-[11px] uppercase tracking-[0.12em] text-[#e8d5b5]">
                  <th className="min-w-[260px] px-4 py-3 font-medium">Series name</th>
                  <th className="min-w-[260px] px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#f0e8db] dark:border-[#3a342c]">
                  <td className="border-r border-[#f0e8db] px-2 py-2 dark:border-[#3a342c]">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. KITCHEN MATERIAL SHEET"
                      className={cellInput}
                      autoFocus
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional note"
                      className={cellInput}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#f0e8db] px-4 py-3 dark:border-[#3a342c]">
            <button
              type="button"
              onClick={() => void backToList()}
              className="h-10 rounded-xl border border-[#eadfcf] px-4 text-sm font-semibold text-[#8a7b68]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void createSeries()}
              className="h-10 rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5] disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create series"}
            </button>
          </div>
        </div>
      ) : null}

      {view === "detail" && active ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                  Series details
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                  {active.name}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void removeSeries()}
                className="h-9 rounded-lg border border-[#eadfcf] px-3 text-xs font-semibold text-[#8a3424] disabled:opacity-50"
              >
                Delete series
              </button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Series name
                </span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={metaInput} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Description
                </span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note"
                  className={metaInput}
                />
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                Material sheet
              </p>
              <p className="text-xs text-[#8a7b68]">
                {materials.filter((row) => row.material.trim()).length} filled row
                {materials.filter((row) => row.material.trim()).length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#eadfcf] bg-[#1c1610] text-left text-[11px] uppercase tracking-[0.12em] text-[#e8d5b5]">
                    <th className="w-14 px-3 py-3 font-medium">Sr.</th>
                    <th className="min-w-[200px] px-3 py-3 font-medium">Material</th>
                    <th className="min-w-[110px] px-3 py-3 font-medium">Sizes</th>
                    <th className="min-w-[180px] px-3 py-3 font-medium">Code No.</th>
                    <th className="min-w-[110px] px-3 py-3 font-medium">Thickness</th>
                    <th className="w-20 px-3 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((row, index) => (
                    <tr
                      key={row.key}
                      className="border-b border-[#f0e8db] last:border-0 hover:bg-[#fbf8f3]/80 dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                    >
                      <td className="border-r border-[#f0e8db] px-3 py-1.5 text-center text-[#8a7b68] dark:border-[#3a342c]">
                        {index + 1}
                      </td>
                      <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                        <input
                          value={row.material}
                          onChange={(e) => updateMaterial(row.key, { material: e.target.value })}
                          className={cellInput}
                          placeholder="Material name"
                        />
                      </td>
                      <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                        <input
                          value={row.sizes}
                          onChange={(e) => updateMaterial(row.key, { sizes: e.target.value })}
                          className={cellInput}
                          placeholder="8x4"
                        />
                      </td>
                      <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                        <input
                          value={row.code}
                          onChange={(e) => updateMaterial(row.key, { code: e.target.value })}
                          className={cellInput}
                          placeholder="Code"
                        />
                      </td>
                      <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                        <input
                          value={row.thickness}
                          onChange={(e) => updateMaterial(row.key, { thickness: e.target.value })}
                          className={cellInput}
                          placeholder="18mm"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeMaterial(row.key)}
                          className="text-xs font-semibold text-[#8a7b68] hover:text-[#8a3424]"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f0e8db] px-4 py-3 dark:border-[#3a342c]">
              <button
                type="button"
                onClick={() => setMaterials((prev) => [...prev, emptyMaterial()])}
                className="inline-flex h-9 items-center rounded-lg border border-dashed border-[#c4a574] px-3 text-sm font-semibold text-[#9a7748] hover:bg-[#f6efe4]"
              >
                + Add material row
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveMaterials()}
                className="inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save materials"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
