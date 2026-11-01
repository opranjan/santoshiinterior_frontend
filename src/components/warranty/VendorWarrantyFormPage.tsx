"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  projectsApi,
  vendorsApi,
  warrantyCoverageApi,
} from "@/services/crmApi";

const fieldClass =
  "h-10 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

const cellInput =
  "h-9 w-full min-w-0 border-0 bg-transparent px-2 text-sm text-[#1c1610] outline-none placeholder:text-[#c4b8a8] focus:bg-[#fbf8f3] dark:text-[#f3ece2] dark:focus:bg-white/[0.04]";

type MaterialRow = {
  key: string;
  materialName: string;
  materialCategory: string;
  coverageSummary: string;
  startsOn: string;
  endsOn: string;
  notes: string;
};

function emptyMaterial(shared?: { startsOn?: string; endsOn?: string }): MaterialRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    materialName: "",
    materialCategory: "",
    coverageSummary: "",
    startsOn: shared?.startsOn || "",
    endsOn: shared?.endsOn || "",
    notes: "",
  };
}

function toYmd(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function VendorWarrantyFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; clientName?: string | null }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [defaultStartsOn, setDefaultStartsOn] = useState("");
  const [defaultEndsOn, setDefaultEndsOn] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([emptyMaterial()]);

  useEffect(() => {
    projectsApi
      .list({ limit: 200 })
      .then((data) =>
        setProjects(
          (data.items || []).map((p) => ({
            id: String(p.id || ""),
            name: String(p.name || ""),
            clientName: (p.clientName as string | null | undefined) ?? null,
          }))
        )
      )
      .catch(() => setProjects([]));
    vendorsApi
      .list({ limit: 200 })
      .then((data) =>
        setVendors((data.items || []).map((v) => ({ id: v.id, name: v.name })))
      )
      .catch(() => setVendors([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    warrantyCoverageApi
      .getVendor(id)
      .then((row) => {
        setProjectId(row.projectId);
        setVendorId(row.vendorId || "");
        setVendorName(row.vendorName || row.vendor?.name || "");
        setDefaultStartsOn(toYmd(row.startsOn));
        setDefaultEndsOn(toYmd(row.endsOn));
        setMaterials([
          {
            key: row.id,
            materialName: row.materialName || "",
            materialCategory: row.materialCategory || "",
            coverageSummary: row.coverageSummary || "",
            startsOn: toYmd(row.startsOn),
            endsOn: toYmd(row.endsOn),
            notes: row.notes || "",
          },
        ]);
      })
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const updateMaterial = (key: string, patch: Partial<MaterialRow>) => {
    setMaterials((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const applyDefaultDatesToEmpty = (starts: string, ends: string) => {
    setMaterials((prev) =>
      prev.map((row) => ({
        ...row,
        startsOn: row.startsOn || starts,
        endsOn: row.endsOn || ends,
      }))
    );
  };

  const save = async () => {
    if (!projectId) {
      toastWarning("Select a project.");
      return;
    }
    const filled = materials.filter((row) => row.materialName.trim());
    if (!filled.length) {
      toastWarning("Add at least one material.");
      return;
    }

    try {
      setSaving(true);
      if (editing && id) {
        const row = filled[0];
        await warrantyCoverageApi.updateVendor(id, {
          projectId,
          vendorId: vendorId || null,
          vendorName: vendorId ? null : vendorName.trim() || null,
          materialName: row.materialName.trim(),
          materialCategory: row.materialCategory.trim() || null,
          coverageSummary: row.coverageSummary.trim() || null,
          startsOn: row.startsOn || null,
          endsOn: row.endsOn || null,
          notes: row.notes.trim() || null,
        });
        toastSuccess("Vendor warranty updated.");
      } else {
        for (const row of filled) {
          await warrantyCoverageApi.createVendor({
            projectId,
            vendorId: vendorId || null,
            vendorName: vendorId ? null : vendorName.trim() || null,
            materialName: row.materialName.trim(),
            materialCategory: row.materialCategory.trim() || null,
            coverageSummary: row.coverageSummary.trim() || null,
            startsOn: row.startsOn || defaultStartsOn || null,
            endsOn: row.endsOn || defaultEndsOn || null,
            notes: row.notes.trim() || null,
          });
        }
        toastSuccess(
          filled.length === 1
            ? "Vendor warranty created."
            : `Added ${filled.length} material warranties.`
        );
      }
      router.push("/warranty-desk?tab=vendor");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#8a7b68]">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/warranty-desk?tab=vendor"
            className="text-sm font-semibold text-[#9a7748] hover:underline"
          >
            ← Vendor warranty
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#1c1610] dark:text-[#f3ece2]">
            {editing ? "Edit vendor warranty" : "New vendor warranty"}
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Choose project and vendor, then add materials in the list below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/warranty-desk?tab=vendor"
            className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] px-4 text-sm font-semibold text-[#8a7b68]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5] disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Save" : "Save materials"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
            Project & vendor
          </p>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
              Project
            </span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.clientName ? ` · ${p.clientName}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
              Vendor
            </span>
            <select
              value={vendorId}
              onChange={(e) => {
                setVendorId(e.target.value);
                const found = vendors.find((v) => v.id === e.target.value);
                setVendorName(found?.name || "");
              }}
              className={fieldClass}
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          {!vendorId ? (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                Vendor name
              </span>
              <input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className={fieldClass}
                placeholder="If vendor is not in list"
              />
            </label>
          ) : null}
          {!editing ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Default starts on
                </span>
                <DatePickerField
                  id="vw-page-default-starts"
                  value={defaultStartsOn}
                  onChange={(v) => {
                    setDefaultStartsOn(v);
                    applyDefaultDatesToEmpty(v, defaultEndsOn);
                  }}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Default ends on
                </span>
                <DatePickerField
                  id="vw-page-default-ends"
                  value={defaultEndsOn}
                  onChange={(v) => {
                    setDefaultEndsOn(v);
                    applyDefaultDatesToEmpty(defaultStartsOn, v);
                  }}
                />
              </label>
            </>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
              Material list
            </p>
            <p className="mt-0.5 text-xs text-[#8a7b68]">
              {editing
                ? "Update this material warranty."
                : "Add each material the vendor warranted for this project."}
            </p>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() =>
                setMaterials((prev) => [
                  ...prev,
                  emptyMaterial({ startsOn: defaultStartsOn, endsOn: defaultEndsOn }),
                ])
              }
              className="inline-flex h-9 items-center rounded-lg border border-dashed border-[#c4a574] px-3 text-sm font-semibold text-[#9a7748] hover:bg-[#f6efe4]"
            >
              + Add material
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#eadfcf] bg-[#1c1610] text-left text-[11px] uppercase tracking-[0.12em] text-[#e8d5b5]">
                <th className="w-12 px-3 py-3 font-medium">Sr.</th>
                <th className="min-w-[180px] px-3 py-3 font-medium">Material</th>
                <th className="min-w-[120px] px-3 py-3 font-medium">Category</th>
                <th className="min-w-[220px] px-3 py-3 font-medium">What vendor covers</th>
                <th className="min-w-[130px] px-3 py-3 font-medium">Starts on</th>
                <th className="min-w-[130px] px-3 py-3 font-medium">Ends on</th>
                <th className="min-w-[160px] px-3 py-3 font-medium">Notes</th>
                {!editing ? <th className="w-20 px-3 py-3 font-medium">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {materials.map((row, index) => (
                <tr
                  key={row.key}
                  className="border-b border-[#f0e8db] last:border-0 align-top dark:border-[#3a342c]"
                >
                  <td className="border-r border-[#f0e8db] px-3 py-2 text-center text-[#8a7b68] dark:border-[#3a342c]">
                    {index + 1}
                  </td>
                  <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                    <input
                      value={row.materialName}
                      onChange={(e) => updateMaterial(row.key, { materialName: e.target.value })}
                      className={cellInput}
                      placeholder="e.g. Marine plywood"
                    />
                  </td>
                  <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                    <input
                      value={row.materialCategory}
                      onChange={(e) =>
                        updateMaterial(row.key, { materialCategory: e.target.value })
                      }
                      className={cellInput}
                      placeholder="Optional"
                    />
                  </td>
                  <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                    <textarea
                      value={row.coverageSummary}
                      onChange={(e) =>
                        updateMaterial(row.key, { coverageSummary: e.target.value })
                      }
                      rows={2}
                      className="w-full resize-y border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-[#c4b8a8] focus:bg-[#fbf8f3] dark:focus:bg-white/[0.04]"
                      placeholder="Coverage details"
                    />
                  </td>
                  <td className="border-r border-[#f0e8db] px-2 py-2 dark:border-[#3a342c]">
                    <DatePickerField
                      id={`vw-mat-start-${row.key}`}
                      value={row.startsOn}
                      onChange={(v) => updateMaterial(row.key, { startsOn: v })}
                    />
                  </td>
                  <td className="border-r border-[#f0e8db] px-2 py-2 dark:border-[#3a342c]">
                    <DatePickerField
                      id={`vw-mat-end-${row.key}`}
                      value={row.endsOn}
                      onChange={(v) => updateMaterial(row.key, { endsOn: v })}
                    />
                  </td>
                  <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                    <input
                      value={row.notes}
                      onChange={(e) => updateMaterial(row.key, { notes: e.target.value })}
                      className={cellInput}
                      placeholder="Notes"
                    />
                  </td>
                  {!editing ? (
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setMaterials((prev) =>
                            prev.length <= 1
                              ? [emptyMaterial({ startsOn: defaultStartsOn, endsOn: defaultEndsOn })]
                              : prev.filter((item) => item.key !== row.key)
                          )
                        }
                        className="text-xs font-semibold text-[#8a7b68] hover:text-[#8a3424]"
                      >
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!editing ? (
          <div className="border-t border-[#f0e8db] px-4 py-3 dark:border-[#3a342c]">
            <button
              type="button"
              onClick={() =>
                setMaterials((prev) => [
                  ...prev,
                  emptyMaterial({ startsOn: defaultStartsOn, endsOn: defaultEndsOn }),
                ])
              }
              className="text-sm font-semibold text-[#9a7748]"
            >
              + Add material
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
