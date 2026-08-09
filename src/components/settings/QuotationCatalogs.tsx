"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { quotationCatalogsApi } from "@/services/crmApi";
import {
  normalizeCatalogSettings,
  type QuotationCatalogSettings,
} from "@/lib/quotationCatalogDefaults";

type TabId = "catalogs" | "categories" | "uoms" | "pending";

type Catalog = QuotationCatalogSettings["catalogs"][number];
type Category = QuotationCatalogSettings["categories"][number];
type Uom = QuotationCatalogSettings["uoms"][number];
type CatalogSettings = QuotationCatalogSettings;

const accent = {
  text: "text-[#E85D75]",
  border: "border-[#E85D75]",
  bg: "bg-[#E85D75]",
  bgHover: "hover:bg-[#d94c65]",
  underline: "bg-[#E85D75]",
  ring: "focus:border-[#E85D75] focus:ring-[#E85D75]/15",
};

const TAX_OPTIONS = [
  "",
  "GST 0%",
  "GST 5%",
  "GST 12%",
  "GST 18%",
  "GST 28%",
];

const fieldClass = `h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`;
const unitSelectClass =
  "h-11 w-[72px] shrink-0 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-2 text-sm text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "catalogs", label: "Catalogs" },
  { id: "categories", label: "Categories" },
  { id: "uoms", label: "UOMs" },
  { id: "pending", label: "Pending Approvals" },
];

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
} | null;

function ConfirmDialog({
  state,
  busy,
  onCancel,
}: {
  state: ConfirmState;
  busy?: boolean;
  onCancel: () => void;
}) {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          {state.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {state.message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void state.onConfirm()}
            className="inline-flex h-10 items-center rounded-lg bg-[#E85D75] px-4 text-sm font-medium text-white hover:bg-[#d94c65] disabled:opacity-50"
          >
            {busy ? "Deleting…" : state.confirmLabel || "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoreMenu({
  onEdit,
  onDelete,
  onSetDefault,
  showDefault,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault?: () => void;
  showDefault?: boolean;
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
          {showDefault && onSetDefault && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              onClick={() => {
                setOpen(false);
                onSetDefault();
              }}
            >
              Set as default
            </button>
          )}
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

export default function QuotationCatalogs() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("catalogs");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CatalogSettings>({
    catalogs: [],
    categories: [],
    uoms: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAbbr, setFormAbbr] = useState("");
  const [formMargin, setFormMargin] = useState("0");
  const [formMarginUnit, setFormMarginUnit] = useState<"%" | "INR">("%");
  const [formDiscount, setFormDiscount] = useState("0");
  const [formDiscountUnit, setFormDiscountUnit] = useState<"%" | "INR">("%");
  const [formTax, setFormTax] = useState("");
  const [formHsn, setFormHsn] = useState("");
  const [formSubCategories, setFormSubCategories] = useState<string[]>([""]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [subDrafts, setSubDrafts] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        let raw: unknown = null;
        try {
          raw = await quotationCatalogsApi.getBundle();
        } catch (err) {
          throw err instanceof Error
            ? err
            : new Error("Failed to load catalogs from server");
        }
        if (cancelled) return;
        const normalized = normalizeCatalogSettings(raw, { useDefaults: false });
        setData(normalized);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load catalogs"
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

  const persist = async (next: CatalogSettings) => {
    setData(next);
    try {
      setSaving(true);
      setError("");
      await quotationCatalogsApi.saveBundle(next);
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

  const filteredCatalogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.catalogs;
    return data.catalogs.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
    );
  }, [data.catalogs, search]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.categories;
    return data.categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.subCategories || []).some((s) => s.toLowerCase().includes(q))
    );
  }, [data.categories, search]);

  const filteredUoms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.uoms;
    return data.uoms.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.abbreviation.toLowerCase().includes(q)
    );
  }, [data.uoms, search]);

  const resetCatalogForm = () => {
    setFormName("");
    setFormDescription("");
    setFormAbbr("");
    setFormMargin("0");
    setFormMarginUnit("%");
    setFormDiscount("0");
    setFormDiscountUnit("%");
    setFormTax("");
    setFormHsn("");
    setFormSubCategories([""]);
  };

  const openCreate = () => {
    setEditingId(null);
    resetCatalogForm();
    setShowForm(true);
  };

  const openEditCatalog = (row: Catalog) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormDescription(row.description);
    setFormAbbr("");
    setFormMargin(String(row.margin ?? 0));
    setFormMarginUnit(row.marginUnit || "%");
    setFormDiscount(String(row.discount ?? 0));
    setFormDiscountUnit(row.discountUnit || "%");
    setFormTax(row.tax || "");
    setFormHsn(row.hsnCode || "");
    setFormSubCategories([""]);
    setShowForm(true);
  };

  const openEditCategory = (row: Category) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormDescription(row.description || "");
    setFormAbbr("");
    setFormSubCategories(
      row.subCategories?.length ? [...row.subCategories] : [""]
    );
    setShowForm(true);
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addSubCategory = async (categoryId: string) => {
    const value = (subDrafts[categoryId] || "").trim();
    if (!value) return;
    const nextCategories = data.categories.map((c) =>
      c.id === categoryId && !(c.subCategories || []).includes(value)
        ? { ...c, subCategories: [...(c.subCategories || []), value] }
        : c
    );
    setSubDrafts((prev) => ({ ...prev, [categoryId]: "" }));
    await persist({ ...data, categories: nextCategories });
  };

  const removeSubCategory = (categoryId: string, sub: string) => {
    const cat = data.categories.find((c) => c.id === categoryId);
    setConfirm({
      title: "Delete sub category?",
      message: `Remove “${sub}” from “${cat?.name || "category"}”?`,
      confirmLabel: "Remove",
      onConfirm: async () => {
        try {
          setConfirmBusy(true);
          const nextCategories = data.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  subCategories: (c.subCategories || []).filter((s) => s !== sub),
                }
              : c
          );
          await quotationCatalogsApi.updateCategory(categoryId, {
            subCategories:
              nextCategories.find((c) => c.id === categoryId)?.subCategories ||
              [],
          });
          setData((prev) => ({ ...prev, categories: nextCategories }));
          setNotice("Sub category removed");
          window.setTimeout(() => setNotice(""), 1800);
          setConfirm(null);
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to remove sub category"
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const openEditUom = (row: Uom) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormDescription("");
    setFormAbbr(row.abbreviation);
    setShowForm(true);
  };

  const saveForm = async () => {
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }

    if (tab === "catalogs") {
      const catalogFields = {
        name: formName.trim(),
        description: formDescription.trim(),
        margin: Number(formMargin) || 0,
        marginUnit: formMarginUnit,
        discount: Number(formDiscount) || 0,
        discountUnit: formDiscountUnit,
        tax: formTax,
        hsnCode: formHsn.trim(),
      };
      const nextCatalogs = editingId
        ? data.catalogs.map((c) =>
            c.id === editingId ? { ...c, ...catalogFields } : c
          )
        : [
            {
              id: `cat-${Date.now()}`,
              items: 0,
              ...catalogFields,
            },
            ...data.catalogs,
          ];
      await persist({ ...data, catalogs: nextCatalogs });
    } else if (tab === "categories") {
      const subs = formSubCategories
        .map((s) => s.trim())
        .filter(Boolean);
      const nextCategories = editingId
        ? data.categories.map((c) =>
            c.id === editingId
              ? {
                  ...c,
                  name: formName.trim(),
                  subCategories: subs,
                }
              : c
          )
        : [
            {
              id: `c-${Date.now()}`,
              name: formName.trim(),
              subCategories: subs,
            },
            ...data.categories,
          ];
      await persist({ ...data, categories: nextCategories });
    } else if (tab === "uoms") {
      const name = formName.trim();
      const nextUoms = editingId
        ? data.uoms.map((u) =>
            u.id === editingId
              ? {
                  ...u,
                  name,
                  abbreviation: name,
                }
              : u
          )
        : [
            {
              id: `u-${Date.now()}`,
              name,
              abbreviation: name,
            },
            ...data.uoms,
          ];
      await persist({ ...data, uoms: nextUoms });
    }

    setShowForm(false);
    setNotice(editingId ? "Updated successfully" : "Created successfully");
    window.setTimeout(() => setNotice(""), 1800);
  };

  const deleteCatalog = (id: string) => {
    const row = data.catalogs.find((c) => c.id === id);
    const itemCount = row?.catalogItems?.length || row?.items || 0;
    setConfirm({
      title: "Delete catalog?",
      message: `Delete “${row?.name || "this catalog"}”? This will permanently remove the catalog and ${itemCount} related item${itemCount === 1 ? "" : "s"}. This cannot be undone.`,
      confirmLabel: "Delete catalog",
      onConfirm: async () => {
        try {
          setConfirmBusy(true);
          setError("");
          const result = await quotationCatalogsApi.remove(id);
          setData((prev) => ({
            ...prev,
            catalogs: prev.catalogs.filter((c) => c.id !== id),
          }));
          const deletedItems =
            typeof result?.deletedItems === "number"
              ? result.deletedItems
              : itemCount;
          setNotice(
            `Catalog deleted${deletedItems ? ` (${deletedItems} item${deletedItems === 1 ? "" : "s"} removed)` : ""}`
          );
          window.setTimeout(() => setNotice(""), 2200);
          setConfirm(null);
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to delete catalog"
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const deleteCategory = (id: string) => {
    const row = data.categories.find((c) => c.id === id);
    const subCount = row?.subCategories?.length || 0;
    setConfirm({
      title: "Delete category?",
      message: `Delete “${row?.name || "this category"}”?${
        subCount
          ? ` Its ${subCount} sub-categor${subCount === 1 ? "y" : "ies"} will also be removed.`
          : ""
      }`,
      confirmLabel: "Delete category",
      onConfirm: async () => {
        try {
          setConfirmBusy(true);
          await quotationCatalogsApi.removeCategory(id);
          setData((prev) => ({
            ...prev,
            categories: prev.categories.filter((c) => c.id !== id),
          }));
          setNotice("Category deleted");
          window.setTimeout(() => setNotice(""), 1800);
          setConfirm(null);
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to delete category"
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const deleteUom = (id: string) => {
    const row = data.uoms.find((u) => u.id === id);
    setConfirm({
      title: "Delete UOM?",
      message: `Delete unit “${row?.name || "this UOM"}” (${row?.abbreviation || ""})? Items using this UOM will keep the old text value.`,
      confirmLabel: "Delete UOM",
      onConfirm: async () => {
        try {
          setConfirmBusy(true);
          await quotationCatalogsApi.removeUom(id);
          setData((prev) => ({
            ...prev,
            uoms: prev.uoms.filter((u) => u.id !== id),
          }));
          setNotice("UOM deleted");
          window.setTimeout(() => setNotice(""), 1800);
          setConfirm(null);
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to delete UOM"
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const setDefaultCatalog = async (id: string) => {
    await persist({
      ...data,
      catalogs: data.catalogs.map((c) => ({
        ...c,
        isDefault: c.id === id,
      })),
    });
  };

  const handleImport = () => {
    setNotice("Import is ready â€” connect a CSV/Excel file next.");
    window.setTimeout(() => setNotice(""), 2500);
  };

  return (
    <div className="space-y-5">
      <ConfirmDialog
        state={confirm}
        busy={confirmBusy}
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
      />
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
          {saving ? " Saving..." : ""}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/[0.06]"
              aria-label="Back to settings"
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
              Quotation Catalogs
            </h1>
          </div>

          <div className="mt-4 flex items-center gap-5 border-b border-gray-200 dark:border-gray-800">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setSearch("");
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

        {tab === "catalogs" && (
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
            <button
              type="button"
              onClick={handleImport}
              className={`inline-flex h-10 items-center justify-center rounded-lg border ${accent.border} bg-white px-4 text-sm font-medium ${accent.text} hover:bg-[#E85D75]/5 dark:bg-transparent`}
            >
              Import
            </button>
            <button
              type="button"
              onClick={openCreate}
              className={`inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
            >
              Create
            </button>
          </div>
        )}

        {tab === "categories" && (
          <div className="flex items-center gap-2 sm:pt-1">
            <button
              type="button"
              onClick={openCreate}
              className={`inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
            >
              + Category
            </button>
          </div>
        )}

        {tab === "uoms" && (
          <div className="flex flex-wrap items-center gap-2 sm:pt-1">
            <button
              type="button"
              onClick={() => {
                setNotice(
                  "Approximations â€” map alternate UOM spellings (coming next)."
                );
                window.setTimeout(() => setNotice(""), 2500);
              }}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border ${accent.border} bg-white px-4 text-sm font-medium ${accent.text} hover:bg-[#E85D75]/5 dark:bg-transparent`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7h16M4 12h10M4 17h7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M18 10l2 2-6 6H10v-4l6-6z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Approximations
            </button>
            <button
              type="button"
              onClick={openCreate}
              className={`inline-flex h-10 items-center justify-center gap-1 rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
            >
              + UOM
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800">
          Loading catalogsâ€¦
        </div>
      ) : tab === "catalogs" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  {["S.No.", "Name", "Description", "Items", "Actions"].map(
                    (h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className={`px-4 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${
                          h === "Items" || h === "Actions"
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
                {filteredCatalogs.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer transition hover:bg-[#E85D75]/5 ${
                      index % 2 === 0
                        ? "bg-white dark:bg-transparent"
                        : "bg-gray-50/70 dark:bg-white/[0.02]"
                    }`}
                    onClick={() =>
                      router.push(`/settings/quotations/catalogs/${row.id}`)
                    }
                  >
                    <TableCell className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <div className="flex items-center gap-2">
                        <span
                          className="max-w-[280px] truncate text-sm font-medium text-gray-800 dark:text-white/90"
                          title={row.name}
                        >
                          {row.name}
                        </span>
                        {row.isDefault && (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success-500 text-white"
                            title="Default catalog"
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M5 13l4 4L19 7"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                      {row.description || "â€”"}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end text-sm text-gray-700 dark:text-gray-300">
                      {row.catalogItems?.length ?? row.items}
                    </TableCell>
                    <TableCell
                      className="px-4 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreMenu
                        showDefault={!row.isDefault}
                        onEdit={() => openEditCatalog(row)}
                        onDelete={() => deleteCatalog(row.id)}
                        onSetDefault={() => void setDefaultCatalog(row.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCatalogs.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-gray-500">
                      No catalogs found. Create your first catalog to get
                      started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : tab === "categories" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-white dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="w-10 px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    {" "}
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    Sub Categories
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 text-end text-theme-xs font-medium text-gray-500"
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((row) => {
                  const expanded = expandedCategories.includes(row.id);
                  const subs = row.subCategories || [];
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className="border-b border-gray-100 dark:border-white/[0.04]">
                        <TableCell className="px-3 py-3.5">
                          <button
                            type="button"
                            onClick={() => toggleCategory(row.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            aria-label={expanded ? "Collapse" : "Expand"}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              className={`transition ${expanded ? "rotate-90" : ""}`}
                            >
                              <path
                                d="M9 6l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-start">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {row.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditCategory(row)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              aria-label={`Edit ${row.name}`}
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
                                <path
                                  d="M13.5 6.5l3 3"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                          {subs.length} Sub Categor
                          {subs.length === 1 ? "y" : "ies"}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-end">
                          <button
                            type="button"
                            onClick={() => deleteCategory(row.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-error-500 hover:bg-error-50"
                            aria-label={`Delete ${row.name}`}
                          >
                            <svg
                              width="16"
                              height="16"
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
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-gray-50/80 dark:bg-white/[0.02]">
                          <TableCell className="px-3 py-3" />
                          <TableCell
                            className="px-3 py-4"
                            colSpan={3}
                          >
                            <div className="space-y-3">
                              {subs.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                  No sub categories yet.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {subs.map((sub) => (
                                    <span
                                      key={sub}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700"
                                    >
                                      {sub}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeSubCategory(row.id, sub)
                                        }
                                        className="text-gray-400 hover:text-error-500"
                                        aria-label={`Remove ${sub}`}
                                      >
                                        Ã—
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex max-w-md gap-2">
                                <input
                                  type="text"
                                  value={subDrafts[row.id] || ""}
                                  onChange={(e) =>
                                    setSubDrafts((prev) => ({
                                      ...prev,
                                      [row.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void addSubCategory(row.id);
                                    }
                                  }}
                                  placeholder="Add sub category"
                                  className={`h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => void addSubCategory(row.id)}
                                  className={`inline-flex h-9 items-center rounded-lg ${accent.bg} px-3 text-sm font-medium text-white ${accent.bgHover}`}
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredCategories.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-gray-500">
                      No categories yet. Click + Category to add one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : tab === "uoms" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    S.no.
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500"
                  >
                    Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500"
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUoms.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-gray-100 dark:border-white/[0.04]"
                  >
                    <TableCell className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm font-medium text-gray-800 dark:text-white/90">
                      {row.name}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end">
                      <button
                        type="button"
                        onClick={() => deleteUom(row.id)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent.text} hover:bg-[#E85D75]/10`}
                        aria-label={`Delete ${row.name}`}
                      >
                        <svg
                          width="16"
                          height="16"
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
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E85D75]/10 text-[#E85D75]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 11l3 3L22 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            No pending approvals
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Catalog or item changes that need manager approval will appear here.
          </p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div
            className={`w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900 ${
              tab === "catalogs"
                ? "max-w-xl"
                : tab === "categories"
                  ? "max-w-2xl"
                  : "max-w-md"
            }`}
          >
            {tab === "categories" ? (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                    {editingId ? "Edit Category" : "Create Category"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300"
                    aria-label="Close"
                  >
                    âœ•
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <label className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-36">
                      Category Name:
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className={fieldClass}
                      placeholder="Enter category name"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Add Sub Category
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormSubCategories((prev) => [...prev, ""])
                      }
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${accent.bg} text-lg font-semibold text-white ${accent.bgHover}`}
                      aria-label="Add sub category"
                    >
                      +
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-white/[0.04]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            S.No.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Sub Categories
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formSubCategories.map((sub, index) => (
                          <tr
                            key={`sub-row-${index}`}
                            className="border-t border-gray-100 dark:border-white/[0.05]"
                          >
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {index + 1}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={sub}
                                onChange={(e) =>
                                  setFormSubCategories((prev) =>
                                    prev.map((v, i) =>
                                      i === index ? e.target.value : v
                                    )
                                  )
                                }
                                placeholder="Enter sub category"
                                className="h-10 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-200 focus:outline-hidden dark:text-white/90"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormSubCategories((prev) =>
                                    prev.length <= 1
                                      ? [""]
                                      : prev.filter((_, i) => i !== index)
                                  )
                                }
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent.text} hover:bg-[#E85D75]/10`}
                                aria-label="Remove sub category"
                              >
                                <svg
                                  width="16"
                                  height="16"
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void saveForm()}
                    disabled={saving || !formName.trim()}
                    className={`inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg ${accent.bg} px-8 text-sm font-medium text-white disabled:opacity-60 ${accent.bgHover}`}
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Create"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {editingId ? "Edit" : "Create"}{" "}
                    {tab === "uoms" ? "UOM" : "Catalog"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    âœ•
                  </button>
                </div>

                {tab === "catalogs" ? (
                  <div className="space-y-4">
                    <div>
                      <Label>
                        Name<span className={accent.text}>*</span>
                      </Label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className={fieldClass}
                        placeholder="Catalog Name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <input
                        type="text"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className={fieldClass}
                        placeholder="Catalog description"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                              setFormMarginUnit(e.target.value as "%" | "INR")
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
                              setFormDiscountUnit(e.target.value as "%" | "INR")
                            }
                            className={unitSelectClass}
                          >
                            <option value="%">%</option>
                            <option value="INR">₹</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label>Tax</Label>
                        <select
                          value={formTax}
                          onChange={(e) => setFormTax(e.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Select Default Tax</option>
                          {TAX_OPTIONS.filter(Boolean).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>HSN/SAC Code</Label>
                        <input
                          type="text"
                          value={formHsn}
                          onChange={(e) => setFormHsn(e.target.value)}
                          className={fieldClass}
                          placeholder="Default HSN Code"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>
                        Name<span className={accent.text}>*</span>
                      </Label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className={fieldClass}
                        placeholder="Enter UOM name"
                      />
                    </div>
                  </div>
                )}

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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
