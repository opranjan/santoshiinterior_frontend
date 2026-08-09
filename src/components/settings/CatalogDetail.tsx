"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Label from "@/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { quotationCatalogsApi } from "@/services/crmApi";
import {
  findCatalog,
  normalizeCatalogSettings,
  type CatalogItem,
  type CatalogItemBom,
  type CatalogRecord,
  type QuotationCatalogSettings,
} from "@/lib/quotationCatalogDefaults";
import BomModal from "@/components/settings/BomModal";

const accent = {
  text: "text-[#E85D75]",
  border: "border-[#E85D75]",
  bg: "bg-[#E85D75]",
  bgHover: "hover:bg-[#d94c65]",
  underline: "bg-[#E85D75]",
  ring: "focus:border-[#E85D75] focus:ring-[#E85D75]/15",
};

const fieldClass = `h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`;
const requiredEmptyClass =
  "h-11 w-full rounded-lg border border-red-400 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:border-red-400 focus:ring-red-400/15 dark:bg-gray-900 dark:text-white/90";
const unitSelectClass =
  "h-11 w-[72px] shrink-0 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-2 text-sm text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

const TAX_OPTIONS = [
  "",
  "GST 0%",
  "GST 5%",
  "GST 12%",
  "GST 18%",
  "GST 28%",
];

type Props = {
  catalogId: string;
};

function PlusMiniButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-5 w-5 items-center justify-center rounded text-[#E85D75] hover:bg-[#E85D75]/10"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

export default function CatalogDetail({ catalogId }: Props) {
  const [catalog, setCatalog] = useState<CatalogRecord | null>(null);
  const [settings, setSettings] = useState<QuotationCatalogSettings | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"overview" | "audits">("overview");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [bomTarget, setBomTarget] = useState<CatalogItem | null>(null);
  const [bomDraft, setBomDraft] = useState<CatalogItemBom | undefined>(
    undefined
  );

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSpecification, setFormSpecification] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formUom, setFormUom] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formMargin, setFormMargin] = useState("0");
  const [formMarginUnit, setFormMarginUnit] = useState<"%" | "INR">("%");
  const [formDiscount, setFormDiscount] = useState("0");
  const [formDiscountUnit, setFormDiscountUnit] = useState<"%" | "INR">("%");
  const [formTax, setFormTax] = useState("");
  const [formHsn, setFormHsn] = useState("");
  const [formBom, setFormBom] = useState<CatalogItemBom | undefined>(
    undefined
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [quickAdd, setQuickAdd] = useState<
    null | "category" | "subCategory" | "uom"
  >(null);
  const [quickName, setQuickName] = useState("");
  const [quickAbbr, setQuickAbbr] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  const items = catalog?.catalogItems || [];
  const categories = settings?.categories || [];
  const uoms = settings?.uoms || [];
  const subCategoryOptions = useMemo(() => {
    const match = categories.find(
      (c) => c.name.toLowerCase() === formCategory.trim().toLowerCase()
    );
    return match?.subCategories || [];
  }, [categories, formCategory]);

  const missingCategory = !formCategory.trim();
  const missingName = !formName.trim();
  const missingUom = !formUom.trim();
  const missingPrice = formPrice.trim() === "";
  const canSubmit =
    !missingCategory && !missingName && !missingUom && !missingPrice;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        let raw: unknown = null;
        try {
          raw = await quotationCatalogsApi.getBundle();
        } catch (err) {
          throw err instanceof Error
            ? err
            : new Error("Failed to load catalog");
        }
        if (cancelled) return;

        const normalized = normalizeCatalogSettings(raw, { useDefaults: false });
        const found = findCatalog(normalized, catalogId);

        setSettings(normalized);
        setCatalog(found);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load catalog"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogId]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.uom.toLowerCase().includes(q)
    );
  }, [items, search]);

  const allSelected =
    filteredItems.length > 0 &&
    filteredItems.every((i) => selected.includes(i.id));

  const persistCatalog = async (nextCatalog: CatalogRecord) => {
    const base = settings || normalizeCatalogSettings(null);
    const exists = base.catalogs.some((c) => c.id === nextCatalog.id);
    const nextSettings: QuotationCatalogSettings = {
      ...base,
      catalogs: exists
        ? base.catalogs.map((c) =>
            c.id === nextCatalog.id ? nextCatalog : c
          )
        : [nextCatalog, ...base.catalogs],
    };
    setSettings(nextSettings);
    setCatalog(nextCatalog);
    try {
      setSaving(true);
      setError("");
      await quotationCatalogsApi.saveBundle(nextSettings);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormCategory("");
    setFormSubCategory("");
    setFormDescription("");
    setFormSpecification("");
    setFormPrice("");
    setFormUom("");
    setFormImageUrl("");
    setFormMargin("0");
    setFormMarginUnit("%");
    setFormDiscount("0");
    setFormDiscountUnit("%");
    setFormTax("");
    setFormHsn("");
    setFormBom(undefined);
    setShowAdvanced(false);
    setTriedSubmit(false);
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCode(item.code);
    setFormCategory(item.category);
    setFormSubCategory(item.subCategory || "");
    setFormDescription(item.description);
    setFormSpecification(item.specification || "");
    setFormPrice(String(item.price));
    setFormUom(item.uom);
    setFormImageUrl(item.imageUrl || "");
    setFormMargin(String(item.margin ?? 0));
    setFormMarginUnit(item.marginUnit || "%");
    setFormDiscount(String(item.discount ?? 0));
    setFormDiscountUnit(item.discountUnit || "%");
    setFormTax(item.tax || "");
    setFormHsn(item.hsnCode || "");
    setFormBom(item.bom);
    setShowAdvanced(
      Boolean(item.margin || item.discount || item.tax || item.hsnCode)
    );
    setTriedSubmit(false);
    setShowForm(true);
  };

  const openBomForItem = (item: CatalogItem) => {
    setBomTarget(item);
    setBomDraft(item.bom);
  };

  const openBomFromForm = () => {
    const draftItem: CatalogItem = {
      id: editingId || `draft-${Date.now()}`,
      name: formName.trim() || "Untitled item",
      code: formCode.trim(),
      category: formCategory.trim(),
      description: formDescription.trim() || formSpecification.trim(),
      price: Number(formPrice) || 0,
      uom: formUom.trim() || "NOS",
      bom: formBom,
    };
    setBomTarget(draftItem);
    setBomDraft(formBom);
  };

  const saveBom = async (bom: CatalogItemBom) => {
    if (!bomTarget) return;

    if (
      showForm &&
      (bomTarget.id === editingId || bomTarget.id.startsWith("draft-"))
    ) {
      setFormBom(bom);
      setBomTarget(null);
      setNotice("BOM saved to item form");
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }

    if (!catalog) return;
    const exists = items.some((i) => i.id === bomTarget.id);
    const nextItem: CatalogItem = { ...bomTarget, bom };
    const nextItems = exists
      ? items.map((i) => (i.id === bomTarget.id ? nextItem : i))
      : [nextItem, ...items];
    await persistCatalog({
      ...catalog,
      catalogItems: nextItems,
      items: nextItems.length,
    });
    setBomTarget(null);
    setNotice("BOM saved");
    window.setTimeout(() => setNotice(""), 1800);
  };

  const saveItem = async () => {
    setTriedSubmit(true);
    if (!catalog || !canSubmit) {
      setError("Please fill Category, Item Name, UOM and Price");
      return;
    }
    const payload: CatalogItem = {
      id: editingId || `item-${Date.now()}`,
      name: formName.trim(),
      code: formCode.trim(),
      category: formCategory.trim(),
      subCategory: formSubCategory.trim(),
      description: formDescription.trim(),
      specification: formSpecification.trim(),
      price: Number(formPrice) || 0,
      uom: formUom.trim(),
      imageUrl: formImageUrl.trim() || undefined,
      margin: Number(formMargin) || 0,
      marginUnit: formMarginUnit,
      discount: Number(formDiscount) || 0,
      discountUnit: formDiscountUnit,
      tax: formTax,
      hsnCode: formHsn.trim(),
      bom: formBom,
    };
    const nextItems = editingId
      ? items.map((i) => (i.id === editingId ? payload : i))
      : [payload, ...items];
    await persistCatalog({
      ...catalog,
      catalogItems: nextItems,
      items: nextItems.length,
    });
    setShowForm(false);
    setNotice(editingId ? "Item updated" : "Item created");
    window.setTimeout(() => setNotice(""), 1800);
  };

  const onPickImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setFormImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const reqClass = (missing: boolean) =>
    missing ? requiredEmptyClass : fieldClass;

  const refreshBundle = async () => {
    const raw = await quotationCatalogsApi.getBundle();
    const normalized = normalizeCatalogSettings(raw, { useDefaults: false });
    const found = findCatalog(normalized, catalogId);
    setSettings(normalized);
    if (found) setCatalog(found);
    return normalized;
  };

  const saveQuickAdd = async () => {
    const name = quickName.trim();
    if (!name) return;
    try {
      setQuickBusy(true);
      setError("");
      if (quickAdd === "category") {
        const created = await quotationCatalogsApi.createCategory({
          name,
          description: "",
          subCategories: [],
        });
        await refreshBundle();
        setFormCategory(String(created.name || name));
        setFormSubCategory("");
        setNotice("Category added");
      } else if (quickAdd === "subCategory") {
        if (!formCategory.trim()) {
          setError("Select a category first");
          return;
        }
        const match = categories.find(
          (c) => c.name.toLowerCase() === formCategory.trim().toLowerCase()
        );
        if (!match) {
          setError("Selected category not found");
          return;
        }
        const nextSubs = Array.from(
          new Set([...(match.subCategories || []), name])
        );
        await quotationCatalogsApi.updateCategory(match.id, {
          subCategories: nextSubs,
        });
        await refreshBundle();
        setFormSubCategory(name);
        setNotice("Sub category added");
      } else if (quickAdd === "uom") {
        const abbr = quickAbbr.trim() || name;
        const created = await quotationCatalogsApi.createUom({
          name,
          abbreviation: abbr,
        });
        await refreshBundle();
        setFormUom(String(created.abbreviation || created.name || abbr));
        setNotice("UOM added");
      }
      window.setTimeout(() => setNotice(""), 1800);
      setQuickAdd(null);
      setQuickName("");
      setQuickAbbr("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to add"
      );
    } finally {
      setQuickBusy(false);
    }
  };

  const deleteItem = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDeleteItem = async () => {
    if (!catalog || !confirmDeleteId) return;
    const item = items.find((i) => i.id === confirmDeleteId);
    try {
      setConfirmBusy(true);
      setError("");
      await quotationCatalogsApi.deleteItem(catalog.id, confirmDeleteId);
      const nextItems = items.filter((i) => i.id !== confirmDeleteId);
      setCatalog({
        ...catalog,
        catalogItems: nextItems,
        items: nextItems.length,
      });
      setSelected((prev) => prev.filter((x) => x !== confirmDeleteId));
      setNotice(`Deleted “${item?.name || "item"}”`);
      window.setTimeout(() => setNotice(""), 1800);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to delete item"
      );
    } finally {
      setConfirmBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
        Loading catalog…
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="space-y-4">
        <Link
          href="/settings/quotations/catalogs"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back to catalogs
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Catalog not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {quickAdd ? (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {quickAdd === "category"
                ? "Add Category"
                : quickAdd === "subCategory"
                  ? "Add Sub Category"
                  : "Add UOM"}
            </h3>
            {quickAdd === "subCategory" ? (
              <p className="mt-1 text-xs text-gray-500">
                Under:{" "}
                <span className="font-medium text-gray-700">{formCategory}</span>
              </p>
            ) : null}
            <div className="mt-3">
              <Label>
                Name<span className="text-red-500">*</span>
              </Label>
              <input
                autoFocus
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className={fieldClass}
                placeholder={
                  quickAdd === "uom" ? "e.g. Square Feet" : "Enter name"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickName.trim()) {
                    void saveQuickAdd();
                  }
                }}
              />
            </div>
            {quickAdd === "uom" ? (
              <div className="mt-3">
                <Label>Abbreviation</Label>
                <input
                  type="text"
                  value={quickAbbr}
                  onChange={(e) => setQuickAbbr(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. sqft"
                />
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={quickBusy}
                onClick={() => {
                  setQuickAdd(null);
                  setQuickName("");
                  setQuickAbbr("");
                }}
                className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={quickBusy || !quickName.trim()}
                onClick={() => void saveQuickAdd()}
                className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white ${
                  quickName.trim()
                    ? `${accent.bg} ${accent.bgHover}`
                    : "cursor-not-allowed bg-slate-400"
                } disabled:opacity-50`}
              >
                {quickBusy ? "Saving…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {confirmDeleteId ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete item?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Delete “
              {items.find((i) => i.id === confirmDeleteId)?.name || "this item"}
              ” from this catalog? Related BOM data on the item will also be
              removed. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirmDeleteId(null)}
                className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => void confirmDeleteItem()}
                className="inline-flex h-10 items-center rounded-lg bg-[#E85D75] px-4 text-sm font-medium text-white hover:bg-[#d94c65] disabled:opacity-50"
              >
                {confirmBusy ? "Deleting…" : "Delete item"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
          {saving ? " Saving…" : ""}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/settings/quotations/catalogs"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
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
            {catalog.name}
          </h1>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className={`inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
          >
            Create Item
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="More"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-20 min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false);
                  setNotice("Export coming soon");
                  window.setTimeout(() => setNotice(""), 1800);
                }}
              >
                Export items
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-200 pb-0 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "audits", label: "Audits" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative -mb-px pb-3 text-sm font-medium transition ${
                tab === t.id
                  ? accent.text
                  : "text-gray-500 hover:text-gray-800"
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

        {tab === "overview" && (
          <div className="flex items-center gap-2 pb-3">
            <button
              type="button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${accent.bg} text-white ${accent.bgHover}`}
              aria-label="Filter"
              title="Filter"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
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
          </div>
        )}
      </div>

      {tab === "audits" ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            No audits yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Changes to catalog items will appear here for review.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1100px]">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="w-8 px-2 py-3" />
                    <TableCell isHeader className="w-10 px-2 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => {
                          if (allSelected) {
                            setSelected((prev) =>
                              prev.filter(
                                (id) => !filteredItems.some((i) => i.id === id)
                              )
                            );
                          } else {
                            setSelected((prev) => [
                              ...new Set([
                                ...prev,
                                ...filteredItems.map((i) => i.id),
                              ]),
                            ]);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label="Select all"
                      />
                    </TableCell>
                    {[
                      "S.No.",
                      "Name",
                      "Code",
                      "Category",
                      "Description",
                      "Price",
                      "UOM",
                      "BOM",
                      "",
                    ].map((h) => (
                      <TableCell
                        key={h || "actions"}
                        isHeader
                        className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => {
                    const isChecked = selected.includes(item.id);
                    return (
                      <TableRow
                        key={item.id}
                        className="border-b border-gray-100 hover:bg-gray-50/60 dark:border-white/[0.04]"
                      >
                        <TableCell className="px-2 py-3 text-gray-300">
                          <span className="inline-flex cursor-grab text-[10px] leading-none tracking-tighter">
                            ⠿
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelected((prev) =>
                                isChecked
                                  ? prev.filter((id) => id !== item.id)
                                  : [...prev, item.id]
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm text-gray-600">
                          {index + 1}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                          {item.name}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm text-gray-500">
                          {item.code || ""}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate px-3 py-3 text-sm text-gray-600">
                          {item.category || "—"}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate px-3 py-3 text-sm text-gray-500">
                          {item.description || ""}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm text-gray-800 dark:text-white/90">
                          {item.price}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm text-gray-600">
                          {item.uom}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <button
                            type="button"
                            className={`text-sm font-medium ${accent.text} hover:underline`}
                            onClick={() => openBomForItem(item)}
                          >
                            {item.bom &&
                            (item.bom.materials.length ||
                              item.bom.labour.length ||
                              item.bom.machines.length)
                              ? "View"
                              : "+ Add"}
                          </button>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              aria-label="Edit"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
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
                              onClick={() => deleteItem(item.id)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent.text} hover:bg-[#E85D75]/10`}
                              aria-label="Delete"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
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
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="px-4 py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <svg
                              width="32"
                              height="32"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <rect
                                x="4"
                                y="3"
                                width="16"
                                height="18"
                                rx="2"
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M8 8h8"
                                stroke="#60a5fa"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M8 12h8"
                                stroke="#E85D75"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M8 16h5"
                                stroke="#a78bfa"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          <p className="text-base font-semibold text-gray-800 dark:text-white/90">
                            {search.trim()
                              ? "No matching items"
                              : "No items yet"}
                          </p>
                          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                            {search.trim()
                              ? "Try a different search, or clear the filter to see all items."
                              : "Create your first catalog item to get started."}
                          </p>
                          {!search.trim() && (
                            <button
                              type="button"
                              onClick={openCreate}
                              className={`mt-5 inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
                            >
                              Create Item
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editingId ? "Edit Item" : "Add Item"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-5 lg:flex-row">
                {/* Left: image + BOM */}
                <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[160px]">
                  <label className="relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    {formImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formImageUrl}
                        alt="Item"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-300">
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <rect
                            x="3"
                            y="5"
                            width="18"
                            height="14"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx="8.5"
                            cy="10"
                            r="1.5"
                            fill="currentColor"
                          />
                          <path
                            d="M21 16l-5-5-7 7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16 8h4M18 6v4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) =>
                        onPickImage(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={openBomFromForm}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border ${accent.border} bg-white px-3 text-sm font-medium ${accent.text} hover:bg-[#E85D75]/5 dark:bg-transparent`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="3"
                        y="3"
                        width="7"
                        height="7"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <rect
                        x="14"
                        y="3"
                        width="7"
                        height="7"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <rect
                        x="3"
                        y="14"
                        width="7"
                        height="7"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M15.5 17.5h4M17.5 15.5v4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                    BOM
                    {formBom &&
                    (formBom.materials.length ||
                      formBom.labour.length ||
                      formBom.machines.length)
                      ? " •"
                      : ""}
                  </button>
                </div>

                {/* Right: fields */}
                <div className="min-w-0 flex-1 space-y-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1">
                        <Label className="mb-0">
                          Category<span className="text-red-500">*</span>
                        </Label>
                        <PlusMiniButton
                          label="Add category"
                          onClick={() => {
                            setQuickName("");
                            setQuickAbbr("");
                            setQuickAdd("category");
                          }}
                        />
                      </div>
                      <select
                        value={formCategory}
                        onChange={(e) => {
                          setFormCategory(e.target.value);
                          setFormSubCategory("");
                        }}
                        className={reqClass(missingCategory)}
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                        {formCategory &&
                        !categories.some((c) => c.name === formCategory) ? (
                          <option value={formCategory}>{formCategory}</option>
                        ) : null}
                      </select>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center gap-1">
                        <Label className="mb-0">Sub Category</Label>
                        <PlusMiniButton
                          label="Add sub category"
                          onClick={() => {
                            if (!formCategory.trim()) {
                              setNotice("Select a category first");
                              window.setTimeout(() => setNotice(""), 1800);
                              return;
                            }
                            setQuickName("");
                            setQuickAbbr("");
                            setQuickAdd("subCategory");
                          }}
                        />
                      </div>
                      <select
                        value={formSubCategory}
                        onChange={(e) => setFormSubCategory(e.target.value)}
                        className={fieldClass}
                        disabled={!formCategory}
                      >
                        <option value="">
                          {formCategory
                            ? "Select sub category"
                            : "Select category first"}
                        </option>
                        {subCategoryOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        {formSubCategory &&
                        !subCategoryOptions.includes(formSubCategory) ? (
                          <option value={formSubCategory}>
                            {formSubCategory}
                          </option>
                        ) : null}
                      </select>
                    </div>
                    <div>
                      <Label>Code</Label>
                      <input
                        type="text"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        className={fieldClass}
                        placeholder="Code"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>
                      Item Name<span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className={reqClass(missingName)}
                      placeholder="Item Name"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={3}
                      className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`}
                      placeholder="Item Description"
                    />
                  </div>

                  <div>
                    <Label>Specification</Label>
                    <input
                      type="text"
                      value={formSpecification}
                      onChange={(e) => setFormSpecification(e.target.value)}
                      className={fieldClass}
                      placeholder="Specification"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1">
                        <Label className="mb-0">
                          UOM<span className="text-red-500">*</span>
                        </Label>
                        <PlusMiniButton
                          label="Add UOM"
                          onClick={() => {
                            setQuickName("");
                            setQuickAbbr("");
                            setQuickAdd("uom");
                          }}
                        />
                      </div>
                      <select
                        value={formUom}
                        onChange={(e) => setFormUom(e.target.value)}
                        className={reqClass(missingUom)}
                      >
                        <option value="">Select UOM</option>
                        {uoms.map((u) => {
                          const val = u.abbreviation || u.name;
                          return (
                            <option key={u.id} value={val}>
                              {u.abbreviation
                                ? `${u.name} (${u.abbreviation})`
                                : u.name}
                            </option>
                          );
                        })}
                        {formUom &&
                        !uoms.some(
                          (u) => (u.abbreviation || u.name) === formUom
                        ) ? (
                          <option value={formUom}>{formUom}</option>
                        ) : null}
                      </select>
                    </div>
                    <div>
                      <Label>
                        Price<span className="text-red-500">*</span>
                      </Label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className={reqClass(missingPrice)}
                        placeholder="Price"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Advance Settings
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className={`transition ${showAdvanced ? "rotate-180" : ""}`}
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {showAdvanced && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Margin</Label>
                        <div className="flex">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formMargin}
                            onChange={(e) => setFormMargin(e.target.value)}
                            className={`h-11 min-w-0 flex-1 rounded-l-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`}
                          />
                          <select
                            value={formMarginUnit}
                            onChange={(e) =>
                              setFormMarginUnit(
                                e.target.value as "%" | "INR"
                              )
                            }
                            className={unitSelectClass}
                          >
                            <option value="%">%</option>
                            <option value="INR">₹</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label>Discount</Label>
                        <div className="flex">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formDiscount}
                            onChange={(e) => setFormDiscount(e.target.value)}
                            className={`h-11 min-w-0 flex-1 rounded-l-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`}
                          />
                          <select
                            value={formDiscountUnit}
                            onChange={(e) =>
                              setFormDiscountUnit(
                                e.target.value as "%" | "INR"
                              )
                            }
                            className={unitSelectClass}
                          >
                            <option value="%">%</option>
                            <option value="INR">₹</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center gap-1">
                          <Label className="mb-0">Tax</Label>
                          <span className="text-[#E85D75]" title="Tax settings">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M14 4h6v6M20 4l-9 9"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                        </div>
                        <select
                          value={formTax}
                          onChange={(e) => setFormTax(e.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Tax</option>
                          {TAX_OPTIONS.filter(Boolean).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>HSN/SAC</Label>
                        <input
                          type="text"
                          value={formHsn}
                          onChange={(e) => setFormHsn(e.target.value)}
                          className={fieldClass}
                          placeholder="HSN/SAC Code"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 px-5 py-4 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => void saveItem()}
                disabled={saving || (triedSubmit && !canSubmit)}
                className={`inline-flex h-10 min-w-[110px] items-center justify-center rounded-lg px-5 text-sm font-medium text-white transition ${
                  canSubmit
                    ? `${accent.bg} ${accent.bgHover}`
                    : "cursor-not-allowed bg-slate-400"
                } disabled:opacity-70`}
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Update Item"
                    : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
      {bomTarget && (
        <BomModal
          item={{ ...bomTarget, bom: bomDraft || bomTarget.bom }}
          saving={saving}
          onClose={() => setBomTarget(null)}
          onSave={(bom) => void saveBom(bom)}
        />
      )}
    </div>
  );
}
