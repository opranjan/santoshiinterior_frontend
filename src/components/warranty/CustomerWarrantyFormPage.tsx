"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  projectsApi,
  warrantyCoverageApi,
  type CustomerWarrantyDto,
  type VendorWarrantyDto,
} from "@/services/crmApi";
import CustomerWarrantyReceiptPreview from "@/components/warranty/CustomerWarrantyReceiptPreview";
import { openWarrantyReceiptPrintWindow } from "@/lib/warrantyReceiptPrint";

const fieldClass =
  "h-10 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

const cellInput =
  "h-9 w-full min-w-0 border-0 bg-transparent px-2 text-sm text-[#1c1610] outline-none placeholder:text-[#c4b8a8] focus:bg-[#fbf8f3] dark:text-[#f3ece2] dark:focus:bg-white/[0.04]";

type MaterialRow = {
  key: string;
  title: string;
  description: string;
  endsOn: string;
  vendorWarrantyId?: string | null;
  vendorName?: string | null;
};

function emptyMaterial(endsOn = ""): MaterialRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    title: "",
    description: "",
    endsOn,
    vendorWarrantyId: null,
    vendorName: null,
  };
}

function materialFromVendor(vw: VendorWarrantyDto): MaterialRow {
  const vendorLabel = vw.vendorName || vw.vendor?.name || "Vendor";
  return {
    key: `vw-${vw.id}`,
    title: vw.materialName || "",
    description:
      vw.coverageSummary || `Backed by ${vendorLabel} warranty${vw.materialCategory ? ` (${vw.materialCategory})` : ""}`,
    endsOn: toYmd(vw.endsOn),
    vendorWarrantyId: vw.id,
    vendorName: vendorLabel,
  };
}

function toYmd(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function CustomerWarrantyFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; clientName?: string | null }>>([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("Customer Project Warranty");
  const [coverageSummary, setCoverageSummary] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([emptyMaterial()]);
  const [vendorReview, setVendorReview] = useState<VendorWarrantyDto[]>([]);
  const [selectedVendorKey, setSelectedVendorKey] = useState("");
  const [pickedVendorIds, setPickedVendorIds] = useState<Set<string>>(new Set());
  const [savedWarranty, setSavedWarranty] = useState<CustomerWarrantyDto | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const vendorKeyOf = (vw: VendorWarrantyDto) =>
    vw.vendorId ? `id:${vw.vendorId}` : `name:${(vw.vendorName || vw.vendor?.name || "Vendor").trim()}`;

  useEffect(() => {
    projectsApi
      .list({ limit: 200 })
      .then((data) =>
        setProjects(
          (data.items || []).map((p: { id: string; name: string; clientName?: string | null }) => ({
            id: p.id,
            name: p.name,
            clientName: p.clientName,
          }))
        )
      )
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    warrantyCoverageApi
      .getCustomer(id)
      .then((row) => {
        setProjectId(row.projectId);
        setTitle(row.title || "Customer Project Warranty");
        setCoverageSummary(row.coverageSummary || "");
        setStartsOn(toYmd(row.startsOn));
        setEndsOn(toYmd(row.endsOn));
        setNotes(row.notes || "");
        setMaterials(
          row.coverageItems?.length
            ? row.coverageItems.map((item, index) => ({
                key: item.vendorWarrantyId ? `vw-${item.vendorWarrantyId}` : `${row.id}-${index}`,
                title: item.title || "",
                description: item.description || "",
                endsOn: toYmd(item.endsOn),
                vendorWarrantyId: item.vendorWarrantyId || null,
                vendorName: item.vendorName || null,
              }))
            : [emptyMaterial()]
        );
        setVendorReview(row.vendorWarranties || []);
        setSavedWarranty(row);
      })
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!projectId) {
      if (!editing) setVendorReview([]);
      setSelectedVendorKey("");
      return;
    }
    warrantyCoverageApi
      .listVendorByProject(projectId)
      .then((rows) => {
        setVendorReview(rows || []);
        setSelectedVendorKey("");
        setPickedVendorIds(new Set());
      })
      .catch(() => {
        setVendorReview([]);
        setSelectedVendorKey("");
      });
  }, [projectId, editing]);

  const projectVendors = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const vw of vendorReview) {
      const key = vendorKeyOf(vw);
      const label = vw.vendorName || vw.vendor?.name || "Vendor";
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { key, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [vendorReview]);

  const vendorMaterials = useMemo(() => {
    if (!selectedVendorKey) return [];
    return vendorReview.filter((vw) => vendorKeyOf(vw) === selectedVendorKey);
  }, [vendorReview, selectedVendorKey]);

  const alreadyInList = useMemo(() => {
    const ids = new Set<string>();
    for (const row of materials) {
      if (row.vendorWarrantyId) ids.add(row.vendorWarrantyId);
    }
    return ids;
  }, [materials]);

  const selectableVendors = useMemo(
    () => vendorMaterials.filter((vw) => !alreadyInList.has(vw.id)),
    [vendorMaterials, alreadyInList]
  );

  const updateMaterial = (key: string, patch: Partial<MaterialRow>) => {
    setMaterials((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const togglePick = (vendorId: string) => {
    setPickedVendorIds((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };

  const addVendorsToMaterials = (vendors: VendorWarrantyDto[]) => {
    if (!vendors.length) {
      toastWarning("Select at least one vendor material.");
      return;
    }
    setMaterials((prev) => {
      const existingIds = new Set(
        prev.map((row) => row.vendorWarrantyId).filter(Boolean) as string[]
      );
      const toAdd = vendors
        .filter((vw) => !existingIds.has(vw.id))
        .map((vw) => materialFromVendor(vw));
      if (!toAdd.length) return prev;
      const withoutBlankOnly =
        prev.length === 1 && !prev[0].title.trim() && !prev[0].vendorWarrantyId ? [] : prev;
      return [...withoutBlankOnly, ...toAdd];
    });

    const latestEnd = vendors
      .map((vw) => toYmd(vw.endsOn))
      .filter(Boolean)
      .sort()
      .at(-1);
    if (!endsOn && latestEnd) setEndsOn(latestEnd);

    setPickedVendorIds((prev) => {
      const next = new Set(prev);
      vendors.forEach((vw) => next.delete(vw.id));
      return next;
    });

    toastSuccess(
      vendors.length === 1
        ? `Added “${vendors[0].materialName}” from vendor warranty.`
        : `Added ${vendors.length} materials from vendor warranty.`
    );
  };

  const addSelected = () => {
    const selected = vendorMaterials.filter((vw) => pickedVendorIds.has(vw.id));
    addVendorsToMaterials(selected);
  };

  const addAll = () => {
    addVendorsToMaterials(selectableVendors);
  };

  const save = async () => {
    if (!projectId) {
      toastWarning("Select a project.");
      return;
    }
    const filled = materials.filter((row) => row.title.trim());
    if (!filled.length) {
      toastWarning("Pick materials from vendor warranty or add at least one material.");
      return;
    }

    const payload = {
      projectId,
      title: title.trim() || "Customer Project Warranty",
      coverageSummary: coverageSummary.trim() || null,
      coverageItems: filled.map((row) => ({
        title: row.title.trim(),
        description: row.description.trim() || null,
        durationMonths: null,
        endsOn: row.endsOn || null,
        vendorWarrantyId: row.vendorWarrantyId || null,
        vendorName: row.vendorName || null,
      })),
      startsOn: startsOn || null,
      endsOn: endsOn || null,
      notes: notes.trim() || null,
    };

    try {
      setSaving(true);
      if (editing && id) {
        await warrantyCoverageApi.updateCustomer(id, payload);
        toastSuccess("Customer warranty updated.");
      } else {
        await warrantyCoverageApi.createCustomer(payload);
        toastSuccess(
          filled.length === 1
            ? "Customer warranty created."
            : `Customer warranty saved with ${filled.length} materials.`
        );
      }
      router.push("/warranty-desk?tab=customer");
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
            href="/warranty-desk?tab=customer"
            className="text-sm font-semibold text-[#9a7748] hover:underline"
          >
            ← Customer warranty
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#1c1610] dark:text-[#f3ece2]">
            {editing ? "Edit customer warranty" : "New customer warranty"}
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Select project and vendor, then pick that vendor&apos;s materials for customer coverage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {savedWarranty ? (
            <>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] px-4 text-sm font-semibold text-[#1c1610]"
              >
                Preview receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  const ok = openWarrantyReceiptPrintWindow(savedWarranty);
                  if (!ok) toastWarning("Allow pop-ups to download the PDF.");
                }}
                className="inline-flex h-10 items-center rounded-xl border border-[#c4a574] px-4 text-sm font-semibold text-[#9a7748]"
              >
                Download PDF
              </button>
            </>
          ) : null}
          <Link
            href="/warranty-desk?tab=customer"
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
            {saving ? "Saving…" : "Save warranty"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                Project & coverage
              </p>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Project
                </span>
                <select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setSelectedVendorKey("");
                    setPickedVendorIds(new Set());
                  }}
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
                  value={selectedVendorKey}
                  onChange={(e) => {
                    setSelectedVendorKey(e.target.value);
                    setPickedVendorIds(new Set());
                  }}
                  disabled={!projectId}
                  className={fieldClass}
                >
                  <option value="">
                    {!projectId
                      ? "Select project first"
                      : projectVendors.length
                        ? "Select vendor"
                        : "No vendors with warranty on this project"}
                  </option>
                  {projectVendors.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label} ({v.count} material{v.count === 1 ? "" : "s"})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Title
                </span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Coverage summary
                </span>
                <textarea
                  value={coverageSummary}
                  onChange={(e) => setCoverageSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[#eadfcf] bg-white px-3 py-2 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714]"
                  placeholder="What warranty are you giving the customer?"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Starts on
                </span>
                <DatePickerField id="cw-page-starts" value={startsOn} onChange={setStartsOn} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Ends on
                </span>
                <DatePickerField id="cw-page-ends" value={endsOn} onChange={setEndsOn} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                  Notes
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#eadfcf] bg-white px-3 py-2 text-sm outline-none dark:border-[#3a342c] dark:bg-[#1a1714]"
                />
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                  Material list
                </p>
                <p className="mt-0.5 text-xs text-[#8a7b68]">
                  Materials picked from vendor warranty (or added manually).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMaterials((prev) => [...prev, emptyMaterial(endsOn)])}
                className="inline-flex h-9 items-center rounded-lg border border-dashed border-[#c4a574] px-3 text-sm font-semibold text-[#9a7748] hover:bg-[#f6efe4]"
              >
                + Manual material
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#eadfcf] bg-[#1c1610] text-left text-[11px] uppercase tracking-[0.12em] text-[#e8d5b5]">
                    <th className="w-12 px-3 py-3 font-medium">Sr.</th>
                    <th className="min-w-[180px] px-3 py-3 font-medium">Material</th>
                    <th className="min-w-[120px] px-3 py-3 font-medium">From vendor</th>
                    <th className="min-w-[220px] px-3 py-3 font-medium">What we cover</th>
                    <th className="min-w-[140px] px-3 py-3 font-medium">Ends on</th>
                    <th className="w-20 px-3 py-3 font-medium">Action</th>
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
                          value={row.title}
                          onChange={(e) => updateMaterial(row.key, { title: e.target.value })}
                          className={cellInput}
                          placeholder="e.g. Marine plywood"
                        />
                      </td>
                      <td className="border-r border-[#f0e8db] px-3 py-2 text-xs text-[#8a7b68] dark:border-[#3a342c]">
                        {row.vendorName || (row.vendorWarrantyId ? "Vendor" : "Manual")}
                      </td>
                      <td className="border-r border-[#f0e8db] px-1 py-1 dark:border-[#3a342c]">
                        <textarea
                          value={row.description}
                          onChange={(e) => updateMaterial(row.key, { description: e.target.value })}
                          rows={2}
                          className="w-full resize-y border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-[#c4b8a8] focus:bg-[#fbf8f3] dark:focus:bg-white/[0.04]"
                          placeholder="What this material warranty covers"
                        />
                      </td>
                      <td className="border-r border-[#f0e8db] px-2 py-2 dark:border-[#3a342c]">
                        <DatePickerField
                          id={`cw-mat-end-${row.key}`}
                          value={row.endsOn}
                          onChange={(v) => updateMaterial(row.key, { endsOn: v })}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setMaterials((prev) =>
                              prev.length <= 1 ? [emptyMaterial(endsOn)] : prev.filter((item) => item.key !== row.key)
                            )
                          }
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
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] shadow-sm dark:border-[#3a342c] dark:bg-[#1c1914]">
          <div className="border-b border-[#eadfcf] px-4 py-3 dark:border-[#3a342c]">
            <h4 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
              Pick from vendor warranty
            </h4>
            <p className="mt-1 text-xs text-[#8a7b68]">
              Choose project → vendor, then tick that vendor&apos;s materials.
            </p>
            {selectedVendorKey && selectableVendors.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addSelected}
                  disabled={pickedVendorIds.size === 0}
                  className="inline-flex h-9 items-center rounded-lg bg-[#1c1610] px-3 text-xs font-semibold text-[#e8d5b5] disabled:opacity-40"
                >
                  Add selected ({pickedVendorIds.size})
                </button>
                <button
                  type="button"
                  onClick={addAll}
                  className="inline-flex h-9 items-center rounded-lg border border-[#c4a574] px-3 text-xs font-semibold text-[#9a7748]"
                >
                  Add all from vendor
                </button>
              </div>
            ) : null}
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            {!projectId ? (
              <p className="text-sm text-[#8a7b68]">Select a project first.</p>
            ) : !projectVendors.length ? (
              <p className="text-sm text-[#8a7b68]">
                No vendor warranties for this project yet.{" "}
                <Link href="/warranty-desk/vendor/new" className="font-semibold text-[#9a7748]">
                  Add vendor materials
                </Link>
              </p>
            ) : !selectedVendorKey ? (
              <p className="text-sm text-[#8a7b68]">
                Select a vendor of this project to load materials.
              </p>
            ) : vendorMaterials.length === 0 ? (
              <p className="text-sm text-[#8a7b68]">No materials for this vendor.</p>
            ) : (
              <div className="space-y-2">
                {vendorMaterials.map((vw) => {
                  const inList = alreadyInList.has(vw.id);
                  const checked = pickedVendorIds.has(vw.id);
                  return (
                    <label
                      key={vw.id}
                      className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                        inList
                          ? "border-[#d9cbb8] bg-[#f3ebe0] opacity-80 dark:border-[#3a342c] dark:bg-[#161411]"
                          : checked
                            ? "border-[#c4a574] bg-white dark:border-[#c4a574] dark:bg-[#161411]"
                            : "border-[#eadfcf] bg-white hover:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#161411]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[#1c1610]"
                        checked={inList || checked}
                        disabled={inList}
                        onChange={() => togglePick(vw.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                            {vw.materialName}
                          </span>
                          {inList ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#9a7748]">
                              Picked
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#8a7b68]">
                          Until {formatDate(vw.endsOn)}
                          {vw.materialCategory ? ` · ${vw.materialCategory}` : ""}
                        </span>
                        {vw.coverageSummary ? (
                          <span className="mt-1.5 block text-xs text-[#6b645b]">{vw.coverageSummary}</span>
                        ) : null}
                        {!inList ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addVendorsToMaterials([vw]);
                            }}
                            className="mt-2 text-xs font-semibold text-[#9a7748]"
                          >
                            Add this →
                          </button>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPreview && savedWarranty ? (
        <CustomerWarrantyReceiptPreview
          warranty={savedWarranty}
          onClose={() => setShowPreview(false)}
        />
      ) : null}
    </div>
  );
}
