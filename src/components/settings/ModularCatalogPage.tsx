"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Label from "@/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import {
  modularCatalogsApi,
  vendorsApi,
  type ModularCatalog,
  type ModularCatalogItem,
  type ModularSeries,
  type ModularSizeItem,
  type ModularUom,
  type VendorDto,
} from "@/services/crmApi";

type TabId = "series" | "catalogs" | "uoms";

const accent = {
  text: "text-[#E85D75]",
  border: "border-[#E85D75]",
  bg: "bg-[#E85D75]",
  bgHover: "hover:bg-[#d94c65]",
  underline: "bg-[#E85D75]",
  ring: "focus:border-[#E85D75] focus:ring-[#E85D75]/15",
};

const fieldClass = `h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`;

const tabs: { id: TabId; label: string }[] = [
  { id: "series", label: "Series" },
  { id: "catalogs", label: "Catalogues" },
  { id: "uoms", label: "UOMs" },
];

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function MoreMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06]"
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-[150px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function ModularCatalogPage() {
  const [tab, setTab] = useState<TabId>("series");
  const [search, setSearch] = useState("");
  const [series, setSeries] = useState<ModularSeries[]>([]);
  const [uoms, setUoms] = useState<ModularUom[]>([]);
  const [formAbbr, setFormAbbr] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formUom, setFormUom] = useState("NOS");
  const [formQty, setFormQty] = useState("1");
  const [formAmount, setFormAmount] = useState("");
  const [formVendorId, setFormVendorId] = useState("");
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [drillSeriesId, setDrillSeriesId] = useState("");
  const [drillCatalogId, setDrillCatalogId] = useState("");
  const [drillSizeId, setDrillSizeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInclusions, setFormInclusions] = useState("");
  const [formSeriesId, setFormSeriesId] = useState("");
  const [formCatalogId, setFormCatalogId] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<unknown>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, vendorData] = await Promise.all([
        modularCatalogsApi.tree(),
        vendorsApi.list({ limit: 200 }).catch(() => ({ items: [] as VendorDto[] })),
      ]);
      setSeries(data.series || []);
      setUoms(data.uoms || []);
      setVendors(vendorData.items || []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load modular catalog"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const catalogs = useMemo(
    () =>
      series.flatMap((s) =>
        (s.catalogs || []).map((c) => ({ ...c, seriesName: s.name }))
      ),
    [series]
  );

  const drillSeries = series.find((s) => s.id === drillSeriesId) || null;
  const drillCatalog = catalogs.find((c) => c.id === drillCatalogId) || null;
  const drillSizes = drillCatalog?.items || [];
  const drillSize = drillSizes.find((s) => s.id === drillSizeId) || null;
  const drillParts = drillSize?.parts || [];

  const q = search.trim().toLowerCase();

  const filteredSeries = useMemo(() => {
    if (!q) return series;
    return series.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.description || "").toLowerCase().includes(q)
    );
  }, [series, q]);

  const filteredCatalogs = useMemo(() => {
    const rows = drillSeriesId
      ? catalogs.filter((row) => row.seriesId === drillSeriesId)
      : catalogs;
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.description || "").toLowerCase().includes(q) ||
        row.seriesName.toLowerCase().includes(q)
    );
  }, [catalogs, q, drillSeriesId]);

  const filteredSizes = useMemo(() => {
    if (!q) return drillSizes;
    return drillSizes.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.code || "").toLowerCase().includes(q)
    );
  }, [drillSizes, q]);

  const filteredParts = useMemo(() => {
    if (!q) return drillParts;
    return drillParts.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.code || "").toLowerCase().includes(q) ||
        (row.vendorName || "").toLowerCase().includes(q) ||
        (row.category || "").toLowerCase().includes(q)
    );
  }, [drillParts, q]);

  const filteredUoms = useMemo(() => {
    if (!q) return uoms;
    return uoms.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.abbreviation || "").toLowerCase().includes(q)
    );
  }, [uoms, q]);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormInclusions("");
    setFormSeriesId(drillSeriesId || series[0]?.id || "");
    setFormCatalogId(series[0]?.catalogs[0]?.id || "");
    setFormCode("");
    setFormArea("");
    setFormPrice("");
    setFormAbbr("");
    setFormCategory("");
    setFormSubCategory("");
    setFormUom(uoms.find((u) => u.name === "NOS")?.name || uoms[0]?.name || "NOS");
    setFormQty("1");
    setFormAmount("");
    setFormVendorId("");
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEditSeries = (row: ModularSeries) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormDescription(row.description || "");
    setShowForm(true);
  };

  const openEditCatalog = (row: ModularCatalog & { seriesName: string }) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormDescription(row.description || "");
    setFormInclusions(row.inclusions || "");
    setFormSeriesId(row.seriesId);
    setShowForm(true);
  };

  const openEditSize = (row: ModularCatalogItem) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormCode(row.code || "");
    setFormArea(row.areaSqFt ? String(row.areaSqFt) : "");
    setFormPrice(row.price ? String(row.price) : "");
    setShowForm(true);
  };

  const openEditPart = (row: ModularSizeItem) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormCode(row.code || "");
    setFormQty(row.qty ? String(row.qty) : "1");
    setFormUom(row.uom || "NOS");
    setFormAmount(row.amount ? String(row.amount) : "");
    setFormVendorId(row.vendorId || "");
    setFormCategory(row.category || "");
    setFormSubCategory(row.subCategory || "");
    setFormDescription(row.description || "");
    setShowForm(true);
  };

  const openEditUom = (row: ModularUom) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormAbbr(row.abbreviation || "");
    setShowForm(true);
  };

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const saveForm = async () => {
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (tab === "series") {
        if (editingId) {
          await modularCatalogsApi.updateSeries(editingId, {
            name: formName.trim(),
            description: formDescription.trim(),
          });
        } else {
          await modularCatalogsApi.createSeries({
            name: formName.trim(),
            description: formDescription.trim(),
          });
        }
      } else if (tab === "catalogs" && drillSizeId) {
        if (editingId) {
          await modularCatalogsApi.updateSizeItem(editingId, {
            name: formName.trim(),
            code: formCode.trim(),
            qty: Number(formQty) || 1,
            uom: formUom.trim() || "NOS",
            amount: Number(formAmount) || 0,
            vendorId: formVendorId.trim() || null,
            category: formCategory.trim(),
            subCategory: formSubCategory.trim(),
            description: formDescription.trim(),
          });
        } else {
          await modularCatalogsApi.createSizeItem({
            sizeId: drillSizeId,
            name: formName.trim(),
            code: formCode.trim(),
            qty: Number(formQty) || 1,
            uom: formUom.trim() || "NOS",
            amount: Number(formAmount) || 0,
            vendorId: formVendorId.trim() || null,
            category: formCategory.trim(),
            subCategory: formSubCategory.trim(),
            description: formDescription.trim(),
          });
        }
      } else if (tab === "catalogs" && drillCatalogId) {
        if (editingId) {
          await modularCatalogsApi.updateItem(editingId, {
            name: formName.trim(),
            code: formCode.trim(),
            areaSqFt: Number(formArea) || 0,
            price: Number(formPrice) || 0,
          });
        } else {
          await modularCatalogsApi.createItem({
            catalogId: drillCatalogId,
            name: formName.trim() || formCode.trim(),
            code: formCode.trim(),
            areaSqFt: Number(formArea) || 0,
            price: Number(formPrice) || 0,
          });
        }
      } else if (tab === "catalogs") {
        if (editingId) {
          await modularCatalogsApi.updateCatalog(editingId, {
            name: formName.trim(),
            description: formDescription.trim(),
            inclusions: formInclusions.trim(),
          });
        } else {
          if (!formSeriesId) {
            setError("Select a series");
            setSaving(false);
            return;
          }
          await modularCatalogsApi.createCatalog({
            seriesId: formSeriesId,
            name: formName.trim(),
            description: formDescription.trim(),
            inclusions: formInclusions.trim(),
          });
        }
      } else if (tab === "uoms") {
        if (editingId) {
          await modularCatalogsApi.updateUom(editingId, {
            name: formName.trim(),
            abbreviation: formAbbr.trim() || formName.trim(),
          });
        } else {
          await modularCatalogsApi.createUom({
            name: formName.trim(),
            abbreviation: formAbbr.trim() || formName.trim(),
          });
        }
      }
      setShowForm(false);
      await load();
      flash(editingId ? "Updated" : "Created");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (title: string, message: string, run: () => Promise<unknown>) => {
    setConfirm({
      title,
      message,
      onConfirm: async () => {
        setConfirmBusy(true);
        setError("");
        try {
          await run();
          await load();
          setConfirm(null);
          flash("Deleted");
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Delete failed"
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleImport = async () => {
    setSaving(true);
    setError("");
    try {
      await modularCatalogsApi.seedSignature();
      await load();
      flash("Signature Series loaded");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not import Signature Series"
      );
    } finally {
      setSaving(false);
    }
  };

  const formTitle =
    tab === "series"
      ? "Series"
      : tab === "uoms"
        ? "UOM"
        : drillSizeId
          ? "Item"
          : drillCatalogId
            ? "Size"
            : "Catalogue";

  const createLabel =
    tab === "uoms"
      ? "+ UOM"
        : drillSizeId
          ? "Create Item"
          : drillCatalogId
            ? "Create Size"
            : "Create";

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              onClick={(e) => {
                if (drillSizeId) {
                  e.preventDefault();
                  setDrillSizeId("");
                  setSearch("");
                } else if (drillCatalogId) {
                  e.preventDefault();
                  setDrillCatalogId("");
                  setSearch("");
                } else if (drillSeriesId) {
                  e.preventDefault();
                  setDrillSeriesId("");
                  setTab("series");
                  setSearch("");
                }
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/[0.06]"
              aria-label="Back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white/90 sm:text-2xl">
              {drillSize
                ? `${drillCatalog?.name} · ${drillSize.code || drillSize.name}`
                : drillCatalog
                  ? drillCatalog.name
                  : drillSeries
                    ? drillSeries.name
                    : "Modular Catalog"}
            </h1>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5 border-b border-gray-200 dark:border-gray-800">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setSearch("");
                  setDrillSeriesId("");
                  setDrillCatalogId("");
                  setDrillSizeId("");
                }}
                className={`relative -mb-px pb-3 text-sm font-medium transition ${
                  tab === t.id
                    ? `${accent.text}`
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span
                    className={`absolute inset-x-0 bottom-0 h-0.5 ${accent.underline}`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:pt-1">
          <div className="relative min-w-[180px] flex-1 sm:w-56 sm:flex-none">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className={`h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`}
            />
          </div>
          {tab === "series" && (
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={saving}
              className={`inline-flex h-10 items-center justify-center rounded-lg border ${accent.border} bg-white px-4 text-sm font-medium ${accent.text} hover:bg-[#E85D75]/5 dark:bg-transparent disabled:opacity-60`}
            >
              Import
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className={`inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
          >
            {createLabel}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800">
          Loading…
        </div>
      ) : tab === "series" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  {["S.No.", "Name", "Description", "Catalogues", "Actions"].map(
                    (h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className={`px-4 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${
                          h === "Catalogues" || h === "Actions"
                            ? "text-end"
                            : "text-start"
                        }`}
                      >
                        {h}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSeries.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer transition hover:bg-[#E85D75]/5 ${
                      index % 2 === 0
                        ? "bg-white dark:bg-transparent"
                        : "bg-gray-50/70 dark:bg-white/[0.02]"
                    }`}
                    onClick={() => {
                      setDrillSeriesId(row.id);
                      setTab("catalogs");
                      setDrillCatalogId("");
                      setDrillSizeId("");
                      setSearch("");
                    }}
                  >
                    <TableCell className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <span
                        className="max-w-[280px] truncate text-sm font-medium text-gray-800 dark:text-white/90"
                        title={row.name}
                      >
                        {row.name}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                      {row.description || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end text-sm text-gray-700 dark:text-gray-300">
                      {row.catalogs?.length ?? 0}
                    </TableCell>
                    <TableCell className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <MoreMenu
                        onEdit={() => openEditSeries(row)}
                        onDelete={() =>
                          askDelete(
                            "Delete series?",
                            `Delete “${row.name}” and all of its catalogues and items?`,
                            () => modularCatalogsApi.deleteSeries(row.id)
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSeries.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-gray-500">
                      No series found. Import Signature Series or create one to
                      get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : tab === "catalogs" && drillSizeId ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  {["S.No.", "Name", "Qty", "UOM", "Amount", "Vendor", "Actions"].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className={`px-4 py-3 text-theme-xs font-medium text-gray-500 ${
                        h === "Qty" || h === "Amount" || h === "Actions" ? "text-end" : "text-start"
                      }`}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={`transition hover:bg-[#E85D75]/5 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/70"
                    }`}
                  >
                    <TableCell className="px-4 py-3.5 text-sm text-gray-600">{index + 1}</TableCell>
                    <TableCell className="px-4 py-3.5 text-sm font-medium text-gray-800">
                      {row.name}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end text-sm text-gray-700">
                      {row.qty}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-gray-700">{row.uom}</TableCell>
                    <TableCell className="px-4 py-3.5 text-end text-sm text-gray-700">
                      {money(row.amount || 0)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-gray-700">
                      {row.vendorName || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <MoreMenu
                        onEdit={() => openEditPart(row)}
                        onDelete={() =>
                          askDelete("Delete item?", `Delete “${row.name}”?`, () =>
                            modularCatalogsApi.deleteSizeItem(row.id)
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredParts.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-gray-500">
                      No items in this size yet. Add items to order from vendors.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : tab === "catalogs" && drillCatalogId ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  {["S.No.", "Code", "Area", "Price", "Items", "Actions"].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className={`px-4 py-3 text-theme-xs font-medium text-gray-500 ${
                        h === "Area" || h === "Price" || h === "Items" || h === "Actions"
                          ? "text-end"
                          : "text-start"
                      }`}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSizes.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer transition hover:bg-[#E85D75]/5 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/70"
                    }`}
                    onClick={() => {
                      setDrillSizeId(row.id);
                      setSearch("");
                    }}
                  >
                    <TableCell className="px-4 py-3.5 text-sm text-gray-600">{index + 1}</TableCell>
                    <TableCell className="px-4 py-3.5 text-sm font-medium text-gray-800">
                      {row.code || row.name}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end text-sm text-gray-700">
                      {row.areaSqFt ? `${row.areaSqFt} sq.ft` : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end text-sm text-gray-700">
                      {money(row.price)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end text-sm text-gray-700">
                      {row.parts?.length ?? 0}
                    </TableCell>
                    <TableCell className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <MoreMenu
                        onEdit={() => openEditSize(row)}
                        onDelete={() =>
                          askDelete("Delete size?", `Delete “${row.code || row.name}”?`, () =>
                            modularCatalogsApi.deleteItem(row.id)
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSizes.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-gray-500">
                      No sizes yet. Create E1, E2… for this kitchen plan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : tab === "catalogs" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  {["S.No.", "Name", "Series", "Description", "Sizes", "Actions"].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className={`px-4 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${
                        h === "Sizes" || h === "Actions" ? "text-end" : "text-start"
                      }`}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCatalogs.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer transition hover:bg-[#E85D75]/5 ${
                      index % 2 === 0
                        ? "bg-white dark:bg-transparent"
                        : "bg-gray-50/70 dark:bg-white/[0.02]"
                    }`}
                    onClick={() => {
                      setDrillCatalogId(row.id);
                      setSearch("");
                    }}
                  >
                    <TableCell className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {row.name}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-gray-500">
                      {row.seriesName}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                      {row.description || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end text-sm text-gray-700">
                      {row.items?.length ?? 0}
                    </TableCell>
                    <TableCell className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <MoreMenu
                        onEdit={() => openEditCatalog(row)}
                        onDelete={() =>
                          askDelete(
                            "Delete catalogue?",
                            `Delete “${row.name}” and all of its sizes?`,
                            () => modularCatalogsApi.deleteCatalog(row.id)
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCatalogs.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-gray-500">
                      No catalogues found. Create a series first, then add catalogues.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500">
                    S.no.
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500">
                    Name
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500">
                    Abbreviation
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500">
                    Action
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUoms.map((row, index) => (
                  <TableRow key={row.id} className="border-b border-gray-100 dark:border-white/[0.04]">
                    <TableCell className="px-4 py-3.5 text-sm text-gray-600">{index + 1}</TableCell>
                    <TableCell className="px-4 py-3.5 text-sm font-medium text-gray-800">
                      {row.name}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-gray-500">
                      {row.abbreviation}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditUom(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label={`Edit ${row.name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M4 20h4l10.5-10.5a2.121 2.121 0 00-3-3L5 17v3z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            askDelete("Delete UOM?", `Delete “${row.name}”?`, () =>
                              modularCatalogsApi.deleteUom(row.id)
                            )
                          }
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent.text} hover:bg-[#E85D75]/10`}
                          aria-label={`Delete ${row.name}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUoms.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-gray-500">
                      No UOMs yet. Click + UOM to add one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showForm ? (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editingId ? "Edit" : "Create"} {formTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {tab === "catalogs" && !editingId && !drillCatalogId && !drillSeriesId ? (
                <div>
                  <Label>
                    Series<span className={accent.text}>*</span>
                  </Label>
                  <select
                    value={formSeriesId}
                    onChange={(e) => setFormSeriesId(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select series</option>
                    {series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {tab === "catalogs" && drillCatalogId ? (
                <div>
                  <Label>Code</Label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className={fieldClass}
                    placeholder={drillSizeId ? "Optional" : "e.g. E1"}
                  />
                </div>
              ) : null}

              <div>
                <Label>
                  Name<span className={accent.text}>*</span>
                </Label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={fieldClass}
                  placeholder={`${formTitle} name`}
                />
              </div>

              {tab === "series" || (tab === "catalogs" && !drillCatalogId) ? (
                <div>
                  <Label>Description</Label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className={fieldClass}
                    placeholder={`${formTitle} description`}
                  />
                </div>
              ) : null}

              {tab === "uoms" ? (
                <div>
                  <Label>Abbreviation</Label>
                  <input
                    type="text"
                    value={formAbbr}
                    onChange={(e) => setFormAbbr(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. sqft"
                  />
                </div>
              ) : null}

              {tab === "catalogs" && !drillCatalogId ? (
                <div>
                  <Label>Inclusions</Label>
                  <input
                    type="text"
                    value={formInclusions}
                    onChange={(e) => setFormInclusions(e.target.value)}
                    className={fieldClass}
                    placeholder="Optional inclusions"
                  />
                </div>
              ) : null}

              {tab === "catalogs" && drillSizeId ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Qty</Label>
                      <input
                        type="number"
                        min="0"
                        value={formQty}
                        onChange={(e) => setFormQty(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label>UOM</Label>
                      <select
                        value={formUom}
                        onChange={(e) => setFormUom(e.target.value)}
                        className={fieldClass}
                      >
                        {uoms.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <input
                      type="number"
                      min="0"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className={fieldClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Vendor</Label>
                    <select
                      value={formVendorId}
                      onChange={(e) => setFormVendorId(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              {tab === "catalogs" && drillCatalogId && !drillSizeId ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Area (sq.ft)</Label>
                    <input
                      type="number"
                      min="0"
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value)}
                      className={fieldClass}
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <Label>Price</Label>
                    <input
                      type="number"
                      min="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className={fieldClass}
                      placeholder="0"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`inline-flex h-10 items-center justify-center rounded-lg border ${accent.border} bg-white px-4 text-sm font-medium ${accent.text} hover:bg-[#E85D75]/5`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveForm()}
                disabled={saving || !formName.trim()}
                className={`inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white disabled:opacity-60 ${accent.bgHover}`}
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">{confirm.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{confirm.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirm(null)}
                className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => void confirm.onConfirm()}
                className="inline-flex h-10 items-center rounded-lg bg-[#E85D75] px-4 text-sm font-medium text-white hover:bg-[#d94c65] disabled:opacity-50"
              >
                {confirmBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
