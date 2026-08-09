"use client";

import React, { useEffect, useMemo, useState } from "react";
import Label from "@/components/form/Label";
import { quotationCatalogsApi } from "@/services/crmApi";
import {
  normalizeCatalogSettings,
  type CatalogItem,
  type CatalogRecord,
  type CategoryRecord,
  type QuotationCatalogSettings,
  type UomRecord,
} from "@/lib/quotationCatalogDefaults";

const accent = {
  bg: "bg-[#E85D75]",
  bgHover: "hover:bg-[#d94c65]",
  ring: "focus:border-[#E85D75] focus:ring-[#E85D75]/15",
};

const fieldClass = `h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 ${accent.ring}`;
const requiredEmptyClass =
  "h-11 w-full rounded-lg border border-[#E85D75] bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:border-[#E85D75] focus:ring-[#E85D75]/15";
const unitSelectClass =
  "h-11 w-[72px] shrink-0 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-2 text-sm text-gray-700 focus:outline-hidden";

const TAX_OPTIONS = ["", "GST 0%", "GST 5%", "GST 12%", "GST 18%", "GST 28%"];

const DEFAULT_AREAS = [
  "All Area",
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Dining",
  "Balcony",
  "Pooja",
  "Office",
];

export type MakerAddItemResult = {
  area: string;
  category: string;
  subCategory: string;
  code: string;
  catalogId: string;
  catalogName: string;
  name: string;
  description: string;
  specification: string;
  unitPrice: number;
  uom: string;
  qty: number;
  imageUrl?: string;
  margin: number;
  marginUnit: "%" | "INR";
  discount: number;
  discountUnit: "%" | "INR";
  tax: string;
  hsn: string;
  subItems: MakerAddItemResult[];
};

type Draft = {
  area: string;
  category: string;
  subCategory: string;
  code: string;
  catalogId: string;
  name: string;
  description: string;
  specification: string;
  price: string;
  uom: string;
  qty: string;
  imageUrl: string;
  margin: string;
  marginUnit: "%" | "INR";
  discount: string;
  discountUnit: "%" | "INR";
  tax: string;
  hsn: string;
};

type SubDraft = Draft & { id: string };

type QuickAddKind = "category" | "subCategory" | "uom";

type QuickAddTarget = "main" | "sub";

function blankDraft(catalogId = ""): Draft {
  return {
    area: "All Area",
    category: "",
    subCategory: "",
    code: "",
    catalogId,
    name: "",
    description: "",
    specification: "",
    price: "",
    uom: "",
    qty: "1",
    imageUrl: "",
    margin: "",
    marginUnit: "%",
    discount: "",
    discountUnit: "%",
    tax: "",
    hsn: "",
  };
}

function PlusMini({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-5 w-5 items-center justify-center rounded-[3px] bg-[#E85D75] text-white hover:bg-[#d94c65]"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function QuickAddDialog({
  kind,
  categoryName,
  onClose,
  onSave,
}: {
  kind: QuickAddKind;
  categoryName?: string;
  onClose: () => void;
  onSave: (value: { name: string; abbreviation?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const titles: Record<QuickAddKind, string> = {
    category: "Add Category",
    subCategory: "Add Sub Category",
    uom: "Add UOM",
  };
  const placeholders: Record<QuickAddKind, string> = {
    category: "Category name",
    subCategory: "Sub category name",
    uom: "UOM name (e.g. Square Feet)",
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold text-gray-800">{titles[kind]}</h4>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {kind === "subCategory" && categoryName ? (
          <p className="mb-2 text-xs text-gray-500">
            Under:{" "}
            <span className="font-medium text-gray-700">{categoryName}</span>
          </p>
        ) : null}
        <Label>
          Name<span className="text-red-500">*</span>
        </Label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          placeholder={placeholders[kind]}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onSave({
                name: name.trim(),
                abbreviation: abbr.trim() || undefined,
              });
            }
          }}
        />
        {kind === "uom" ? (
          <div className="mt-3">
            <Label>Abbreviation</Label>
            <input
              type="text"
              value={abbr}
              onChange={(e) => setAbbr(e.target.value)}
              className={fieldClass}
              placeholder="e.g. sqft"
            />
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() =>
              onSave({
                name: name.trim(),
                abbreviation: abbr.trim() || undefined,
              })
            }
            className={`inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-white ${
              name.trim()
                ? `${accent.bg} ${accent.bgHover}`
                : "cursor-not-allowed bg-slate-400"
            }`}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function CatalogItemPicker({
  items,
  onClose,
  onPick,
}: {
  items: CatalogItem[];
  onClose: () => void;
  onPick: (item: CatalogItem) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(s) ||
        (it.code || "").toLowerCase().includes(s) ||
        (it.category || "").toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h4 className="text-base font-semibold text-gray-800">Select Item</h4>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>
        <div className="border-b border-gray-100 px-4 py-2">
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={fieldClass}
            placeholder="Search catalog items…"
          />
        </div>
        <div className="overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              No catalog items found. Type the name in the form instead.
            </p>
          ) : (
            filtered.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onPick(it)}
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-[#E85D75]/5"
              >
                <span className="text-sm font-medium text-gray-800">{it.name}</span>
                <span className="text-xs text-gray-500">
                  {[it.category, it.uom, it.price ? `₹ ${it.price}` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function lineAmount(d: Draft) {
  const qty = Number(d.qty) || 0;
  const price = Number(d.price) || 0;
  let base = qty * price;
  const margin = Number(d.margin) || 0;
  const discount = Number(d.discount) || 0;
  if (d.marginUnit === "%") base += (base * margin) / 100;
  else base += margin;
  if (d.discountUnit === "%") base -= (base * discount) / 100;
  else base -= discount;
  return Math.max(0, base);
}

function toResult(
  d: Draft,
  catalogs: CatalogRecord[],
  subItems: MakerAddItemResult[] = []
): MakerAddItemResult {
  const cat = catalogs.find((c) => c.id === d.catalogId);
  return {
    area: d.area === "All Area" ? "" : d.area,
    category: d.category.trim(),
    subCategory: d.subCategory.trim(),
    code: d.code.trim(),
    catalogId: d.catalogId,
    catalogName: cat?.name || "",
    name: d.name.trim(),
    description: d.description.trim(),
    specification: d.specification.trim(),
    unitPrice: Number(d.price) || 0,
    uom: d.uom.trim() || "Nos",
    qty: Number(d.qty) || 1,
    imageUrl: d.imageUrl || undefined,
    margin: Number(d.margin) || 0,
    marginUnit: d.marginUnit,
    discount: Number(d.discount) || 0,
    discountUnit: d.discountUnit,
    tax: d.tax,
    hsn: d.hsn.trim(),
    subItems,
  };
}

function applyCatalogItem(item: CatalogItem, prev: Draft): Draft {
  return {
    ...prev,
    name: item.name || prev.name,
    code: item.code || prev.code,
    category: item.category || prev.category,
    subCategory: item.subCategory || prev.subCategory,
    description: item.description || prev.description,
    specification: item.specification || prev.specification,
    price: String(item.price ?? prev.price),
    uom: item.uom || prev.uom,
    imageUrl: item.imageUrl || prev.imageUrl,
    margin: item.margin != null ? String(item.margin) : prev.margin,
    marginUnit: item.marginUnit || prev.marginUnit,
    discount: item.discount != null ? String(item.discount) : prev.discount,
    discountUnit: item.discountUnit || prev.discountUnit,
    tax: item.tax || prev.tax,
    hsn: item.hsnCode || prev.hsn,
  };
}

type FormProps = {
  title: string;
  submitLabel: string;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  catalogs: CatalogRecord[];
  categories: CategoryRecord[];
  uoms: UomRecord[];
  areas: string[];
  showCatalogRow?: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  subItems?: SubDraft[];
  onAddSubitem?: () => void;
  onRemoveSubitem?: (id: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  notice: string;
  setNotice: (v: string) => void;
  nested?: boolean;
  onQuickAddCategory: () => void;
  onQuickAddSubCategory: () => void;
  onQuickAddUom: () => void;
  onPickCatalogItem: () => void;
};

function ItemFormBody({
  title,
  submitLabel,
  draft,
  setDraft,
  catalogs,
  categories,
  uoms,
  areas,
  showCatalogRow = true,
  showSettings,
  onToggleSettings,
  subItems,
  onAddSubitem,
  onRemoveSubitem,
  onClose,
  onSubmit,
  notice,
  setNotice,
  nested = false,
  onQuickAddCategory,
  onQuickAddSubCategory,
  onQuickAddUom,
  onPickCatalogItem,
}: FormProps) {
  const missingName = !draft.name.trim();
  const missingCategory = !draft.category.trim();
  const missingUom = !draft.uom.trim();
  const missingPrice = draft.price === "" || Number.isNaN(Number(draft.price));
  const missingQty = draft.qty === "" || Number(draft.qty) <= 0;
  const canSubmit =
    !missingName &&
    !missingCategory &&
    !missingUom &&
    !missingPrice &&
    !missingQty;

  const subTotal = (subItems || []).reduce((s, it) => s + lineAmount(it), 0);
  const total = lineAmount(draft) + subTotal;
  const req = (missing: boolean) => (missing ? requiredEmptyClass : fieldClass);

  const onPickImage = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({ ...d, imageUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const tip = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const subCats =
    categories.find((c) => c.name === draft.category)?.subCategories || [];

  return (
    <div
      className={`flex max-h-[94vh] w-[96vw] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ${
        nested ? "max-w-[1100px]" : "max-w-[1280px]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
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

      {notice ? (
        <div className="border-b border-[#E85D75]/20 bg-[#E85D75]/5 px-5 py-2 text-xs text-[#E85D75]">
          {notice}
        </div>
      ) : null}

      <div className="overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[168px]">
            <label className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 px-2 text-center">
              {draft.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.imageUrl}
                  alt="Item"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <span className="text-[#E85D75]">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
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
                  <span className="text-[11px] text-gray-500">Upload image or</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      tip("Inspiration library coming soon");
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[#E85D75]/40 bg-white px-2 py-1 text-[11px] font-medium text-[#E85D75]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z"
                        fill="currentColor"
                      />
                    </svg>
                    Select From Inspiration
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => onPickImage(e.target.files?.[0] || null)}
              />
            </label>
            <div className="space-y-0.5 text-xs text-gray-500">
              <p>Perimeter: 0 ft</p>
              <p>Area: 0 sqft</p>
              <p>Wall Area: 0 sqft</p>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3.5">
            {showCatalogRow ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>
                    Area<span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={draft.area}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, area: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Item Code</Label>
                  <input
                    type="text"
                    value={draft.code}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, code: e.target.value }))
                    }
                    className={fieldClass}
                    placeholder="Item Code"
                  />
                </div>
                <div>
                  <Label>Catalog</Label>
                  <select
                    value={draft.catalogId}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, catalogId: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    <option value="">Select catalog</option>
                    {catalogs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Label className="mb-0">
                    Category<span className="text-red-500">*</span>
                  </Label>
                  <PlusMini label="Add category" onClick={onQuickAddCategory} />
                </div>
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      category: e.target.value,
                      subCategory: "",
                    }))
                  }
                  className={req(missingCategory)}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {draft.category &&
                  !categories.some((c) => c.name === draft.category) ? (
                    <option value={draft.category}>{draft.category}</option>
                  ) : null}
                </select>
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Label className="mb-0">Sub Category</Label>
                  <PlusMini
                    label="Add sub category"
                    onClick={onQuickAddSubCategory}
                  />
                </div>
                <select
                  value={draft.subCategory}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, subCategory: e.target.value }))
                  }
                  className={fieldClass}
                  disabled={!draft.category}
                >
                  <option value="">
                    {draft.category
                      ? "Select sub category"
                      : "Select category first"}
                  </option>
                  {subCats.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {draft.subCategory && !subCats.includes(draft.subCategory) ? (
                    <option value={draft.subCategory}>
                      {draft.subCategory}
                    </option>
                  ) : null}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Label className="mb-0">
                  Item Name<span className="text-red-500">*</span>
                </Label>
                <PlusMini
                  label="Pick from catalog"
                  onClick={onPickCatalogItem}
                />
              </div>
              <input
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                className={req(missingName)}
                placeholder="Item Name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <input
                type="text"
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                className={fieldClass}
                placeholder="Description"
              />
            </div>

            <div>
              <Label>Specification</Label>
              <input
                type="text"
                value={draft.specification}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, specification: e.target.value }))
                }
                className={fieldClass}
                placeholder="Specification"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Label className="mb-0">
                    UOM<span className="text-red-500">*</span>
                  </Label>
                  <PlusMini label="Add UOM" onClick={onQuickAddUom} />
                </div>
                <select
                  value={draft.uom}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, uom: e.target.value }))
                  }
                  className={req(missingUom)}
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
                  {draft.uom &&
                  !uoms.some(
                    (u) => (u.abbreviation || u.name) === draft.uom
                  ) ? (
                    <option value={draft.uom}>{draft.uom}</option>
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
                  value={draft.price}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, price: e.target.value }))
                  }
                  className={req(missingPrice)}
                  placeholder="Price"
                />
              </div>
              <div>
                <Label>
                  Quantity<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.qty}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, qty: e.target.value }))
                    }
                    className={`${req(missingQty)} pr-9`}
                    placeholder="1"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#E85D75]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="4"
                        y="3"
                        width="16"
                        height="18"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M8 8h8M8 12h8M8 16h5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleSettings}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {nested ? "Settings" : "Settings & Sub Items"}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className={`transition ${showSettings ? "rotate-180" : ""}`}
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

            {showSettings ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Margin</Label>
                    <div className="flex">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.margin}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, margin: e.target.value }))
                        }
                        className={`h-11 min-w-0 flex-1 rounded-l-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:outline-hidden focus:ring-3 ${accent.ring}`}
                      />
                      <select
                        value={draft.marginUnit}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            marginUnit: e.target.value as "%" | "INR",
                          }))
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
                        value={draft.discount}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, discount: e.target.value }))
                        }
                        className={`h-11 min-w-0 flex-1 rounded-l-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:outline-hidden focus:ring-3 ${accent.ring}`}
                      />
                      <select
                        value={draft.discountUnit}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            discountUnit: e.target.value as "%" | "INR",
                          }))
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
                      <span className="text-[#E85D75]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
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
                      value={draft.tax}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, tax: e.target.value }))
                      }
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
                      value={draft.hsn}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, hsn: e.target.value }))
                      }
                      className={fieldClass}
                      placeholder="HSN/SAC Code"
                    />
                  </div>
                </div>

                {!nested && onAddSubitem ? (
                  <>
                    {(subItems || []).length > 0 ? (
                      <div className="space-y-2">
                        {subItems!.map((sub, idx) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-800">
                                {idx + 1}. {sub.name || "Untitled subitem"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {sub.qty || 1} {sub.uom || "Nos"} · ₹{" "}
                                {lineAmount(sub).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <button
                              type="button"
                              title="Remove subitem"
                              onClick={() => onRemoveSubitem?.(sub.id)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#E85D75] hover:bg-[#E85D75]/10"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={onAddSubitem}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#E85D75]/10 text-sm font-medium text-[#E85D75] hover:bg-[#E85D75]/15"
                    >
                      <span className="text-base leading-none">+</span>
                      Add Subitem
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 border-t border-gray-100 px-5 py-4">
        <div className="mr-auto flex items-center gap-1.5 text-sm text-gray-700">
          <span>Price: ₹ {Math.round(total).toLocaleString("en-IN")}</span>
          <span className="text-[#E85D75]" title="Includes margin, discount & subitems">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M12 10v6M12 7.5v.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className={`inline-flex h-10 min-w-[120px] items-center justify-center rounded-lg px-5 text-sm font-medium text-white transition ${
            canSubmit
              ? `${accent.bg} ${accent.bgHover}`
              : "cursor-not-allowed bg-slate-400"
          }`}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  existingAreas?: string[];
  onClose: () => void;
  onAdd: (item: MakerAddItemResult) => void;
};

export default function MakerAddItemModal({
  open,
  existingAreas = [],
  onClose,
  onAdd,
}: Props) {
  const [settings, setSettings] = useState<QuotationCatalogSettings | null>(
    null
  );
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [uoms, setUoms] = useState<UomRecord[]>([]);
  const [draft, setDraft] = useState<Draft>(blankDraft());
  const [subItems, setSubItems] = useState<SubDraft[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [subDraft, setSubDraft] = useState<Draft>(blankDraft());
  const [subShowSettings, setSubShowSettings] = useState(false);
  const [subNotice, setSubNotice] = useState("");
  const [quickAdd, setQuickAdd] = useState<{
    kind: QuickAddKind;
    target: QuickAddTarget;
  } | null>(null);
  const [pickerTarget, setPickerTarget] = useState<QuickAddTarget | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const bundle = await quotationCatalogsApi.getBundle();
        if (cancelled) return;
        const normalized = normalizeCatalogSettings(bundle, {
          useDefaults: false,
        });
        setSettings(normalized);
        setCatalogs(normalized.catalogs);
        setCategories(normalized.categories);
        setUoms(normalized.uoms);
        setDraft(blankDraft(normalized.catalogs[0]?.id || ""));
        setSubItems([]);
        setShowSettings(false);
        setNotice("");
        setSubOpen(false);
        setQuickAdd(null);
        setPickerTarget(null);
      } catch {
        if (!cancelled) {
          const normalized = normalizeCatalogSettings(null);
          setSettings(normalized);
          setCatalogs(normalized.catalogs);
          setCategories(normalized.categories);
          setUoms(normalized.uoms);
          setDraft(blankDraft(normalized.catalogs[0]?.id || ""));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const areas = useMemo(() => {
    const extra = existingAreas.filter(Boolean);
    return Array.from(new Set([...DEFAULT_AREAS, ...extra]));
  }, [existingAreas]);

  const activeDraft = quickAdd?.target === "sub" ? subDraft : draft;
  const setActiveDraft =
    quickAdd?.target === "sub" ? setSubDraft : setDraft;
  const setActiveNotice =
    quickAdd?.target === "sub" ? setSubNotice : setNotice;

  const persistSettings = async (next: QuotationCatalogSettings) => {
    setSettings(next);
    setCatalogs(next.catalogs);
    setCategories(next.categories);
    setUoms(next.uoms);
    try {
      await quotationCatalogsApi.saveBundle(next);
    } catch {
      // keep local options even if remote save fails
    }
  };

  const handleQuickSave = async (value: {
    name: string;
    abbreviation?: string;
  }) => {
    if (!quickAdd || !settings) return;
    const base = settings;
    const target = quickAdd.target;

    if (quickAdd.kind === "category") {
      const exists = base.categories.some(
        (c) => c.name.toLowerCase() === value.name.toLowerCase()
      );
      if (exists) {
        setActiveDraft((d) => ({ ...d, category: value.name, subCategory: "" }));
        setActiveNotice("Category already exists — selected");
      } else {
        const next: QuotationCatalogSettings = {
          ...base,
          categories: [
            {
              id: `cat-${Date.now()}`,
              name: value.name,
              description: "",
              subCategories: [],
            },
            ...base.categories,
          ],
        };
        await persistSettings(next);
        setActiveDraft((d) => ({
          ...d,
          category: value.name,
          subCategory: "",
        }));
        setActiveNotice("Category added");
      }
    } else if (quickAdd.kind === "subCategory") {
      const categoryName = activeDraft.category.trim();
      if (!categoryName) {
        setActiveNotice("Select or add a category first");
        setQuickAdd(null);
        return;
      }
      let nextCategories = [...base.categories];
      let cat = nextCategories.find((c) => c.name === categoryName);
      if (!cat) {
        cat = {
          id: `cat-${Date.now()}`,
          name: categoryName,
          description: "",
          subCategories: [value.name],
        };
        nextCategories = [cat, ...nextCategories];
      } else if (
        !(cat.subCategories || []).some(
          (s) => s.toLowerCase() === value.name.toLowerCase()
        )
      ) {
        nextCategories = nextCategories.map((c) =>
          c.id === cat!.id
            ? { ...c, subCategories: [...(c.subCategories || []), value.name] }
            : c
        );
      }
      await persistSettings({ ...base, categories: nextCategories });
      setActiveDraft((d) => ({ ...d, subCategory: value.name }));
      setActiveNotice("Sub category added");
    } else if (quickAdd.kind === "uom") {
      const abbr = value.abbreviation || value.name;
      const exists = base.uoms.some(
        (u) =>
          u.name.toLowerCase() === value.name.toLowerCase() ||
          (u.abbreviation || "").toLowerCase() === abbr.toLowerCase()
      );
      if (!exists) {
        await persistSettings({
          ...base,
          uoms: [
            {
              id: `uom-${Date.now()}`,
              name: value.name,
              abbreviation: abbr,
            },
            ...base.uoms,
          ],
        });
      }
      setActiveDraft((d) => ({ ...d, uom: abbr }));
      setActiveNotice(exists ? "UOM already exists — selected" : "UOM added");
    }

    setQuickAdd(null);
    window.setTimeout(() => setActiveNotice(""), 1800);
  };

  const openQuick = (kind: QuickAddKind, target: QuickAddTarget) => {
    const current = target === "sub" ? subDraft : draft;
    if (kind === "subCategory" && !current.category.trim()) {
      const setN = target === "sub" ? setSubNotice : setNotice;
      setN("Select or add a category first");
      window.setTimeout(() => setN(""), 1800);
      return;
    }
    setQuickAdd({ kind, target });
  };

  const pickerItems = useMemo(() => {
    const id =
      pickerTarget === "sub" ? subDraft.catalogId : draft.catalogId;
    return catalogs.find((c) => c.id === id)?.catalogItems || [];
  }, [pickerTarget, subDraft.catalogId, draft.catalogId, catalogs]);

  if (!open) return null;

  const formShared = {
    catalogs,
    categories,
    uoms,
    areas,
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <ItemFormBody
        title="Add Item"
        submitLabel="Add Item"
        draft={draft}
        setDraft={setDraft}
        {...formShared}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        subItems={subItems}
        onAddSubitem={() => {
          setShowSettings(true);
          setSubDraft(blankDraft(draft.catalogId));
          setSubShowSettings(false);
          setSubNotice("");
          setSubOpen(true);
        }}
        onRemoveSubitem={(id) =>
          setSubItems((prev) => prev.filter((s) => s.id !== id))
        }
        onClose={onClose}
        onSubmit={() => {
          onAdd(
            toResult(
              draft,
              catalogs,
              subItems.map((s) => toResult(s, catalogs))
            )
          );
          onClose();
        }}
        notice={notice}
        setNotice={setNotice}
        onQuickAddCategory={() => openQuick("category", "main")}
        onQuickAddSubCategory={() => openQuick("subCategory", "main")}
        onQuickAddUom={() => openQuick("uom", "main")}
        onPickCatalogItem={() => setPickerTarget("main")}
      />

      {subOpen ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-3">
          <ItemFormBody
            nested
            title="Add Sub Item"
            submitLabel="Add Sub Item"
            draft={subDraft}
            setDraft={setSubDraft}
            {...formShared}
            showCatalogRow
            showSettings={subShowSettings}
            onToggleSettings={() => setSubShowSettings((v) => !v)}
            onClose={() => setSubOpen(false)}
            onSubmit={() => {
              setSubItems((prev) => [
                ...prev,
                { ...subDraft, id: `sub-${Date.now()}-${prev.length}` },
              ]);
              setSubOpen(false);
              setShowSettings(true);
            }}
            notice={subNotice}
            setNotice={setSubNotice}
            onQuickAddCategory={() => openQuick("category", "sub")}
            onQuickAddSubCategory={() => openQuick("subCategory", "sub")}
            onQuickAddUom={() => openQuick("uom", "sub")}
            onPickCatalogItem={() => setPickerTarget("sub")}
          />
        </div>
      ) : null}

      {quickAdd ? (
        <QuickAddDialog
          kind={quickAdd.kind}
          categoryName={
            quickAdd.kind === "subCategory" ? activeDraft.category : undefined
          }
          onClose={() => setQuickAdd(null)}
          onSave={(v) => void handleQuickSave(v)}
        />
      ) : null}

      {pickerTarget ? (
        <CatalogItemPicker
          items={pickerItems}
          onClose={() => setPickerTarget(null)}
          onPick={(item) => {
            if (pickerTarget === "sub") {
              setSubDraft((d) => applyCatalogItem(item, d));
            } else {
              setDraft((d) => applyCatalogItem(item, d));
            }
            setPickerTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}
