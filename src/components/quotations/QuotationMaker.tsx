"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { mapQuotation } from "@/lib/crmMappers";
import { quotationSettingsApi, quotationsApi } from "@/services/crmApi";
import type { Quotation } from "./QuotationsTable";
import MakerSettingsModal, {
  defaultMakerSettings,
  type MakerSettings,
} from "./MakerSettingsModal";
import MakerLayoutCanvas, {
  createDefaultLayout,
  createFlowBlock,
  createFreeImage,
  type FlowBlock,
  type FreeImageBlock,
} from "./MakerLayoutCanvas";
import MakerAddItemModal, {
  type MakerAddItemResult,
} from "./MakerAddItemModal";
import { printQuotationSheet } from "@/lib/quotationPrint";
import {
  buildMakerLayoutPayload,
  parseMakerLayout,
} from "@/lib/quotationMakerLayout";
import {
  applyClientToLayoutBlocks,
  buildLayoutFromTemplate,
  buildPreparedForContext,
  mergeTemplateSettingsIntoLayout,
  type PreparedForContext,
} from "@/lib/quotationPreparedFor";

type MakerItem = {
  id: string;
  area: string;
  category: string;
  code: string;
  name: string;
  description: string;
  specification: string;
  unitPrice: number;
  uom: string;
  qty: number;
  imageUrl?: string;
  parentId?: string;
};

type ColumnKey =
  | "area"
  | "category"
  | "code"
  | "name"
  | "description"
  | "specification"
  | "unitPrice"
  | "uom"
  | "qty"
  | "basePrice"
  | "finalPrice";

type TemplateOption = { id: string; name: string };

const accent = "#E85D75";
const QUOTATION_SETTINGS_PATH = "/settings/quotations/settings";

const COLUMN_DEFS: Array<{ key: ColumnKey; label: string; defaultOn: boolean }> =
  [
    { key: "area", label: "Area", defaultOn: true },
    { key: "category", label: "Category", defaultOn: true },
    { key: "name", label: "Item", defaultOn: true },
    { key: "description", label: "Description", defaultOn: true },
    { key: "code", label: "Code", defaultOn: false },
    { key: "specification", label: "Specification", defaultOn: false },
    { key: "unitPrice", label: "Unit Price", defaultOn: true },
    { key: "uom", label: "UOM", defaultOn: true },
    { key: "qty", label: "Qty", defaultOn: true },
    { key: "basePrice", label: "Base Price", defaultOn: true },
    { key: "finalPrice", label: "Final Price", defaultOn: true },
  ];

const HEADER_LABEL: Record<ColumnKey, string> = {
  area: "Area",
  category: "Category",
  code: "Code",
  name: "Name",
  description: "Description",
  specification: "Specification",
  unitPrice: "Unit Price",
  uom: "UOM",
  qty: "Qty",
  basePrice: "Base Price",
  finalPrice: "Final Price",
};

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString("en-IN")}`;
}

function itemBase(item: MakerItem) {
  return item.qty * item.unitPrice;
}

function itemFinal(item: MakerItem, marginPct: number) {
  const base = itemBase(item);
  return base + (base * (marginPct || 0)) / 100;
}

function EmptyItemsArt() {
  return (
    <div className="mx-auto mb-4 flex h-36 w-48 items-end justify-center">
      <svg width="180" height="130" viewBox="0 0 180 130" fill="none">
        <ellipse cx="90" cy="118" rx="55" ry="8" fill="#E5E7EB" />
        <rect x="78" y="48" width="52" height="58" rx="4" fill="#FDE68A" />
        <rect x="84" y="54" width="40" height="8" rx="2" fill="#F59E0B" opacity="0.35" />
        <path
          d="M78 70c8-14 28-18 40-6"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
        <rect x="118" y="62" width="36" height="44" rx="3" fill="#E5E7EB" />
        <rect x="124" y="70" width="24" height="3" rx="1.5" fill="#9CA3AF" />
        <rect x="124" y="78" width="20" height="3" rx="1.5" fill="#D1D5DB" />
        <rect x="124" y="86" width="22" height="3" rx="1.5" fill="#D1D5DB" />
        <circle cx="58" cy="58" r="18" fill="#FEE2E2" />
        <path
          d="M58 48v12M52 58h12"
          stroke="#E85D75"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <text
          x="58"
          y="78"
          textAnchor="middle"
          fontSize="14"
          fill="#E85D75"
          fontWeight="700"
        >
          %
        </text>
      </svg>
    </div>
  );
}

export default function QuotationMaker({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const columnsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [view, setView] = useState<"items" | "preview">("items");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [settings, setSettings] = useState<MakerSettings>(defaultMakerSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [layoutBlocks, setLayoutBlocks] = useState<FlowBlock[]>(() =>
    createDefaultLayout()
  );
  const [freeImages, setFreeImages] = useState<FreeImageBlock[]>([]);
  const skipTemplateLayout = useRef(false);
  const preparedContextRef = useRef<PreparedForContext>({});
  const [items, setItems] = useState<MakerItem[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [areaFilter, setAreaFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(
    () =>
      Object.fromEntries(
        COLUMN_DEFS.map((c) => [c.key, c.defaultOn])
      ) as Record<ColumnKey, boolean>
  );

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [raw, settingsBundle] = await Promise.all([
        quotationsApi.get(quotationId),
        quotationSettingsApi.getBundle().catch(() => null),
      ]);
      const mapped = mapQuotation(raw as Record<string, unknown>) as Quotation;
      const rawRecord = raw as Record<string, unknown>;
      const preparedContext = buildPreparedForContext(rawRecord, {
        clientName: mapped.clientName,
        projectTitle: mapped.title,
        phone: mapped.phone,
        reference: mapped.id.slice(0, 8),
      });
      preparedContextRef.current = preparedContext;

      const savedLayout = parseMakerLayout(rawRecord.makerLayout);
      setQuotation(mapped);
      setTitle(mapped.title || "Untitled Quotation");

      const value = settingsBundle || null;
      const tpl = Array.isArray(value?.templates)
        ? value!.templates.map((t) => ({
            id: String(t.id),
            name: String(t.name || "Template"),
          }))
        : [];
      setTemplates(tpl);
      const defaultTpl =
        settingsBundle?.templates?.find((t) => t.isDefault) ||
        settingsBundle?.templates?.[0];
      const cfg = (value?.config || {}) as Record<string, unknown>;
      setSettings({
        margin: Number(cfg.defaultMargin || 0),
        tax: String(cfg.defaultTax || ""),
        useItemTax: Boolean(cfg.useItemTax),
        hideTax: Boolean(cfg.hideTax),
        summaryType: cfg.summaryType === "custom" ? "custom" : "default",
        charges: Array.isArray(cfg.defaultCharges)
          ? (cfg.defaultCharges as MakerSettings["charges"])
          : [],
        discounts: Array.isArray(cfg.defaultDiscounts)
          ? (cfg.defaultDiscounts as MakerSettings["discounts"])
          : [],
      });

      const applyClient = (blocks: FlowBlock[]) =>
        applyClientToLayoutBlocks(blocks, preparedContext);

      const activeTemplateId =
        savedLayout?.templateId || (defaultTpl ? String(defaultTpl.id) : "");

      let resolvedBlocks: FlowBlock[] = [];
      if (activeTemplateId) {
        try {
          const tpl = await quotationSettingsApi.getTemplate(activeTemplateId);
          const templateBlocks = Array.isArray(tpl.layout)
            ? (tpl.layout as FlowBlock[])
            : [];

          if (savedLayout?.blocks?.length && templateBlocks.length) {
            resolvedBlocks = mergeTemplateSettingsIntoLayout(
              savedLayout.blocks,
              templateBlocks,
              preparedContext
            );
          } else if (templateBlocks.length) {
            resolvedBlocks = buildLayoutFromTemplate(
              templateBlocks,
              preparedContext
            );
          } else if (savedLayout?.blocks?.length) {
            resolvedBlocks = applyClient(savedLayout.blocks);
          } else {
            resolvedBlocks = applyClient(
              createDefaultLayout({
                clientName: preparedContext.clientName,
                projectTitle: preparedContext.projectTitle,
                phone: preparedContext.phone,
                reference: preparedContext.reference,
              })
            );
          }
        } catch {
          resolvedBlocks = savedLayout?.blocks?.length
            ? applyClient(savedLayout.blocks)
            : applyClient(
                createDefaultLayout({
                  clientName: preparedContext.clientName,
                  projectTitle: preparedContext.projectTitle,
                  phone: preparedContext.phone,
                  reference: preparedContext.reference,
                })
              );
        }
      } else if (savedLayout?.blocks?.length) {
        resolvedBlocks = applyClient(savedLayout.blocks);
      } else {
        resolvedBlocks = applyClient(
          createDefaultLayout({
            clientName: preparedContext.clientName,
            projectTitle: preparedContext.projectTitle,
            phone: preparedContext.phone,
            reference: preparedContext.reference,
          })
        );
      }

      setLayoutBlocks(resolvedBlocks);
      setFreeImages(savedLayout?.freeImages ?? []);
      if (savedLayout?.settings) {
        setSettings(savedLayout.settings);
      }
      if (activeTemplateId) {
        skipTemplateLayout.current = true;
        setTemplateId(activeTemplateId);
      }

      const apiItems = Array.isArray((raw as { items?: unknown[] }).items)
        ? ((raw as { items: Array<Record<string, unknown>> }).items || []).map(
            (it, i) => {
              const desc = String(it.description || "");
              return {
                id: String(it.id || `item-${i}`),
                area: String(it.area || ""),
                category: String(it.category || ""),
                code: String(it.code || ""),
                name: desc || `Item ${i + 1}`,
                description: desc,
                specification: String(it.specification || ""),
                unitPrice: Number(it.rate || 0),
                uom: String(it.unit || "Nos"),
                qty: Number(it.qty || 1),
              } satisfies MakerItem;
            }
          )
        : [];
      setItems(apiItems);
      setSelected({});
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load quotation"
      );
    } finally {
      setLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!templateId) return;
    if (skipTemplateLayout.current) {
      skipTemplateLayout.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const tpl = await quotationSettingsApi.getTemplate(templateId);
        if (cancelled) return;
        if (Array.isArray(tpl.layout) && tpl.layout.length) {
          setLayoutBlocks(
            buildLayoutFromTemplate(
              tpl.layout as FlowBlock[],
              preparedContextRef.current
            )
          );
          setFreeImages([]);
        }
      } catch {
        /* keep current layout */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  useEffect(() => {
    return () => {
      freeImages.forEach((b) => {
        if (b.imageUrl.startsWith("blob:")) URL.revokeObjectURL(b.imageUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  useEffect(() => {
    if (!columnsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (
        columnsRef.current &&
        !columnsRef.current.contains(e.target as Node)
      ) {
        setColumnsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [columnsOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const statusLabel =
    quotation?.status === "Draft" ? "Created" : quotation?.status || "Created";

  const activeColumns = useMemo(
    () => COLUMN_DEFS.filter((c) => visibleCols[c.key]),
    [visibleCols]
  );

  const areaOptions = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.area).filter(Boolean))).sort(),
    [items]
  );
  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (areaFilter && item.area !== areaFilter) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    });
  }, [items, search, areaFilter, categoryFilter]);

  const hasActiveFilters = Boolean(
    search.trim() || areaFilter || categoryFilter
  );

  const analysis = useMemo(() => {
    const basePrice = items.reduce((s, i) => s + itemBase(i), 0);
    const marginAmt = (basePrice * (settings.margin || 0)) / 100;
    const itemWiseDiscount = 0;
    let running = basePrice + marginAmt - itemWiseDiscount;

    let additionalCharges = 0;
    for (const c of settings.charges) {
      const v = Number(c.value) || 0;
      additionalCharges +=
        c.type === "Percent" ? (running * v) / 100 : v;
    }
    running += additionalCharges;

    let discountsAmt = 0;
    for (const d of settings.discounts) {
      const v = Number(d.value) || 0;
      discountsAmt += d.type === "Percent" ? (running * v) / 100 : v;
    }

    const subTotal = running - discountsAmt;
    const taxMatch = settings.tax.match(/(\d+)/);
    const taxPct = taxMatch ? Number(taxMatch[1]) : 0;
    const taxAmt = settings.hideTax ? 0 : (subTotal * taxPct) / 100;
    const finalPrice = Math.max(0, subTotal + taxAmt);

    return {
      basePrice,
      marginAmt,
      itemWiseDiscount,
      additionalCharges,
      discountsAmt,
      subTotal,
      taxAmt,
      finalPrice,
    };
  }, [items, settings]);

  const displayTitle = useMemo(() => {
    const ver = quotation?.version || 1;
    const client = quotation?.clientName || "";
    const base = title.trim() || "Untitled";
    return `${base} - v${ver}${client ? ` (${client} ${base})` : ""}`;
  }, [title, quotation]);

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((i) => selected[i.id]);

  const openAddItem = () => {
    setFabOpen(false);
    setView("items");
    setAddItemOpen(true);
  };

  const handleAddItem = (result: MakerAddItemResult) => {
    const stamp = Date.now();
    const parentId = `local-${stamp}`;
    const parent: MakerItem = {
      id: parentId,
      area: result.area,
      category: result.category,
      code: result.code,
      name: result.name,
      description: result.description || result.name,
      specification: result.specification,
      unitPrice: result.unitPrice,
      uom: result.uom,
      qty: result.qty,
      imageUrl: result.imageUrl,
    };
    const kids: MakerItem[] = result.subItems.map((sub, i) => ({
      id: `local-${stamp}-sub-${i}`,
      area: sub.area || result.area,
      category: sub.category || result.category,
      code: sub.code,
      name: sub.name,
      description: sub.description || sub.name,
      specification: sub.specification,
      unitPrice: sub.unitPrice,
      uom: sub.uom,
      qty: sub.qty,
      imageUrl: sub.imageUrl,
      parentId,
    }));
    setItems((prev) => [...prev, parent, ...kids]);
    setSearch("");
    setAreaFilter("");
    setCategoryFilter("");
    flash(
      kids.length
        ? `Added item with ${kids.length} subitem${kids.length > 1 ? "s" : ""}`
        : "Item added"
    );
  };

  const addSection = (
    kind: Parameters<typeof createFlowBlock>[0]
  ) => {
    setLayoutBlocks((prev) => [
      ...prev,
      createFlowBlock(kind, preparedContextRef.current),
    ]);
    setFabOpen(false);
    setView("preview");
    flash("Section added — select it to move or edit");
  };

  const addFreeImage = () => {
    setFreeImages((prev) => [...prev, createFreeImage(prev.length * 28)]);
    setFabOpen(false);
    setView("preview");
    flash("Free image added — drag anywhere on the layout");
  };

  const updateItem = (id: string, patch: Partial<MakerItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  };

  const saveTitle = async () => {
    if (!quotation) return;
    const next = title.trim() || "Untitled Quotation";
    setEditingTitle(false);
    try {
      await quotationsApi.update(quotation.id, { title: next });
      setQuotation({ ...quotation, title: next });
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Failed to save title");
    }
  };

  const createVersion = async () => {
    if (!quotation) return;
    try {
      setSavingVersion(true);
      const next = (quotation.version || 1) + 1;
      await quotationsApi.update(quotation.id, { version: next });
      setQuotation({ ...quotation, version: next });
      flash(`Created version ${next}`);
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Failed to create version");
    } finally {
      setSavingVersion(false);
    }
  };

  const persistItems = async () => {
    if (!quotation || saving) return;
    try {
      setSaving(true);
      await quotationsApi.update(quotation.id, {
        items: items.map((i, index) => ({
          description: i.description || i.name || `Item ${index + 1}`,
          unit: i.uom,
          qty: i.qty,
          rate: i.unitPrice,
          amount: itemBase(i),
          sortOrder: index,
        })),
        amount: analysis.finalPrice,
        makerLayout: buildMakerLayoutPayload({
          templateId,
          blocks: layoutBlocks,
          freeImages,
          settings,
        }),
      });
      flash("Quotation saved");
      await load();
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const runPrint = async () => {
      const title = quotation
        ? `Quotation — ${quotation.clientName || quotation.title || "Santoshi Interior"}`
        : "Quotation — Santoshi Interior";
      await printQuotationSheet(title);
    };

    if (view !== "preview") {
      setView("preview");
      window.setTimeout(() => {
        void runPrint();
      }, 600);
      return;
    }
    void runPrint();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash("Link copied to clipboard");
    } catch {
      flash("Could not copy link");
    }
  };

  const handleShareClient = () => {
    flash("Share with client — email/WhatsApp coming soon");
  };

  const clearFilters = () => {
    setSearch("");
    setAreaFilter("");
    setCategoryFilter("");
    setFilterOpen(false);
  };

  const renderCell = (item: MakerItem, key: ColumnKey) => {
    const cellInput =
      "h-8 w-full min-w-[72px] rounded border border-transparent bg-transparent px-1.5 text-sm text-gray-800 hover:border-gray-200 focus:border-[#E85D75] focus:outline-hidden";
    switch (key) {
      case "area":
        return (
          <input
            value={item.area}
            onChange={(e) => updateItem(item.id, { area: e.target.value })}
            className={cellInput}
            placeholder="—"
          />
        );
      case "category":
        return (
          <input
            value={item.category}
            onChange={(e) => updateItem(item.id, { category: e.target.value })}
            className={cellInput}
            placeholder="—"
          />
        );
      case "code":
        return (
          <input
            value={item.code}
            onChange={(e) => updateItem(item.id, { code: e.target.value })}
            className={cellInput}
            placeholder="—"
          />
        );
      case "name":
        return (
          <input
            value={item.name}
            onChange={(e) =>
              updateItem(item.id, {
                name: e.target.value,
                description: item.description || e.target.value,
              })
            }
            className={`${cellInput} min-w-[120px] font-medium`}
            placeholder="Item name"
          />
        );
      case "description":
        return (
          <input
            value={item.description}
            onChange={(e) =>
              updateItem(item.id, { description: e.target.value })
            }
            className={`${cellInput} min-w-[140px]`}
            placeholder="—"
          />
        );
      case "specification":
        return (
          <input
            value={item.specification}
            onChange={(e) =>
              updateItem(item.id, { specification: e.target.value })
            }
            className={`${cellInput} min-w-[120px]`}
            placeholder="—"
          />
        );
      case "unitPrice":
        return (
          <input
            type="number"
            min={0}
            value={item.unitPrice}
            onChange={(e) =>
              updateItem(item.id, {
                unitPrice: Number(e.target.value) || 0,
              })
            }
            className={`${cellInput} w-24`}
          />
        );
      case "uom":
        return (
          <input
            value={item.uom}
            onChange={(e) => updateItem(item.id, { uom: e.target.value })}
            className={`${cellInput} w-16`}
          />
        );
      case "qty":
        return (
          <input
            type="number"
            min={0}
            value={item.qty}
            onChange={(e) =>
              updateItem(item.id, { qty: Number(e.target.value) || 0 })
            }
            className={`${cellInput} w-16`}
          />
        );
      case "basePrice":
        return (
          <span className="whitespace-nowrap px-1.5 text-sm text-gray-700">
            ₹ {itemBase(item).toLocaleString("en-IN")}
          </span>
        );
      case "finalPrice":
        return (
          <span className="whitespace-nowrap px-1.5 text-sm font-medium text-gray-900">
            ₹{" "}
            {Math.round(
              itemFinal(item, settings.margin)
            ).toLocaleString("en-IN")}
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">
        Loading quotation maker…
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        {error || "Quotation not found"}
        <div className="mt-3">
          <Link href="/quotations" className="font-medium text-[#E85D75]">
            ← Back to quotations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="quotation-maker-shell -mx-4 -mb-4 flex min-h-[calc(100vh-7rem)] flex-col bg-[#f3f4f6] md:-mx-6 md:-mb-6">
      {/* Top bar */}
      <div className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5 sm:gap-3 sm:px-4">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void saveTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveTitle();
                if (e.key === "Escape") {
                  setTitle(quotation.title);
                  setEditingTitle(false);
                }
              }}
              className="w-full max-w-xl rounded-md border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="flex max-w-full items-center gap-1.5 text-left"
              title={displayTitle}
            >
              <span className="truncate text-sm font-semibold text-gray-900 sm:text-[15px]">
                {displayTitle}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="shrink-0 text-gray-400"
              >
                <path
                  d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
          {statusLabel}
        </span>

        <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
          {(
            [
              { id: "items", label: "Items", icon: "list" },
              { id: "preview", label: "Preview", icon: "eye" },
            ] as const
          ).map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium sm:text-sm ${
                  active
                    ? "text-[#E85D75]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {tab.icon === "list" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void persistItems()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 sm:text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M17 21v-8H7v8M7 3v5h8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            {saving ? "Saving…" : "Save"}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            title="Download / Print"
            aria-label="Download"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            title="Copy link"
            aria-label="Copy link"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 13a5 5 0 007.07 0l1.4-1.4a5 5 0 00-7.07-7.07L10 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M14 11a5 5 0 00-7.07 0l-1.4 1.4a5 5 0 007.07 7.07L14 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            disabled={savingVersion}
            onClick={() => void createVersion()}
            className="inline-flex h-8 items-center rounded-lg border border-blue-500 bg-white px-3 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-60 sm:text-sm"
          >
            + Version
          </button>

          <button
            type="button"
            onClick={handleShareClient}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-teal-500 px-3 text-xs font-medium text-white hover:bg-teal-600 sm:text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16v12H4V6zm0 0l8 7 8-7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Share with Client
          </button>

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              title="More options"
              aria-label="More options"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
              </svg>
            </button>
            {moreOpen ? (
              <div className="absolute right-0 top-10 z-50 min-w-[180px] rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    void handleCopyLink();
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Copy link
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {notice ? (
        <div className="no-print border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left settings panel */}
        <aside className="no-print w-full shrink-0 border-b border-gray-200 bg-white lg:w-[260px] lg:border-b-0 lg:border-r">
          <button
            type="button"
            onClick={() => router.push(QUOTATION_SETTINGS_PATH)}
            className="flex w-full items-center justify-between border-b border-[#E85D75]/20 bg-[#E85D75]/10 px-4 py-3 text-left transition hover:bg-[#E85D75]/15"
          >
            <p className="text-sm font-semibold" style={{ color: accent }}>
              Settings
            </p>
            <span className="text-[#E85D75]" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 5h5v5M19 5l-9 9M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>

          <div className="p-4">
            <div className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-[#E85D75]/[0.04] p-3">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Settings &amp; Summary
                </p>
                <span className="mt-1.5 inline-flex rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
                  {settings.summaryType === "custom" ? "Custom" : "Default"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: accent }}
                aria-label="Edit settings"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <p className="mb-1.5 text-sm text-gray-600">Quotation Template:</p>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#E85D75]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2v6h6M8 13h8M8 17h8M8 9h2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-[#E85D75]/40 bg-white py-2 pl-10 pr-8 text-sm text-gray-700 focus:border-[#E85D75] focus:outline-hidden"
                >
                  <option value="">Select a template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </div>
              {templateId ? (
                <p className="mt-1 text-[11px] text-gray-400">Selected template</p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => setAnalysisOpen((v) => !v)}
              className="flex w-full items-center justify-between bg-gray-600 px-4 py-3 text-sm font-medium text-white"
            >
              Analysis
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className={`transition ${analysisOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {analysisOpen ? (
              <div className="space-y-2.5 px-4 py-3">
                {(
                  [
                    ["Base Price", analysis.basePrice],
                    ["Margin", analysis.marginAmt],
                    ["ItemWise Discount", analysis.itemWiseDiscount],
                    ["Additional Charges", analysis.additionalCharges],
                    ["Discounts", analysis.discountsAmt],
                    ["Sub Total", analysis.subTotal],
                    ["Tax", analysis.taxAmt],
                    ["Final Price", analysis.finalPrice],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-gray-600">{label}</span>
                    <span className="min-w-[72px] rounded-md bg-gray-100 px-2 py-1 text-right text-xs font-medium text-gray-800">
                      {formatInr(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </aside>

        <main className="quotation-print-main relative min-w-0 flex-1 overflow-auto">
          {view === "items" ? (
            <div className="flex h-full min-h-[520px] flex-col bg-white">
              {/* Items toolbar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2.5 sm:px-4">
                <button
                  type="button"
                  onClick={() => router.push("/quotations")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50"
                  aria-label="Back"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M15 6l-6 6 6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <div className="relative" ref={columnsRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setColumnsOpen((v) => !v);
                        setFilterOpen(false);
                      }}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm ${
                        columnsOpen
                          ? "border-[#E85D75] text-[#E85D75]"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4 5h6v14H4V5zm10 0h6v14h-6V5z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <circle cx="19" cy="6" r="2.5" fill="currentColor" />
                      </svg>
                      Columns
                    </button>
                    {columnsOpen ? (
                      <div className="absolute right-0 z-40 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
                        {COLUMN_DEFS.map((col) => (
                          <label
                            key={col.key}
                            className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={visibleCols[col.key]}
                              onChange={(e) =>
                                setVisibleCols((prev) => ({
                                  ...prev,
                                  [col.key]: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-gray-300 accent-[#E85D75]"
                            />
                            {col.label}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFilterOpen((v) => !v);
                      setColumnsOpen(false);
                    }}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${
                      filterOpen || areaFilter || categoryFilter
                        ? "border-[#E85D75] text-[#E85D75]"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                    title="Filters"
                    aria-label="Filters"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 5h16l-6 7v5l-4 2v-7L4 5z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {searchOpen ? (
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onBlur={() => {
                        if (!search) setSearchOpen(false);
                      }}
                      placeholder="Search items…"
                      className="h-9 w-40 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#E85D75] focus:outline-hidden sm:w-52"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                      title="Search"
                      aria-label="Search"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <circle
                          cx="11"
                          cy="11"
                          r="7"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M20 20l-3-3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {filterOpen ? (
                <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Area</label>
                    <select
                      value={areaFilter}
                      onChange={(e) => setAreaFilter(e.target.value)}
                      className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                    >
                      <option value="">All</option>
                      {areaOptions.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Category
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                    >
                      <option value="">All</option>
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="h-9 text-sm text-[#E85D75] hover:underline"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-auto">
                <div className="min-w-[980px]">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wide text-gray-500">
                        <th className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setSelected((prev) => {
                                const next = { ...prev };
                                filteredItems.forEach((i) => {
                                  next[i.id] = on;
                                });
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300 accent-[#E85D75]"
                          />
                        </th>
                        <th className="whitespace-nowrap px-2 py-3">S.No.</th>
                        {activeColumns.map((col) => (
                          <th
                            key={col.key}
                            className="whitespace-nowrap px-2 py-3"
                          >
                            {HEADER_LABEL[col.key]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    {filteredItems.length > 0 ? (
                      <tbody>
                        {filteredItems.map((item, index) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 hover:bg-gray-50/80"
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={Boolean(selected[item.id])}
                                onChange={(e) =>
                                  setSelected((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-gray-300 accent-[#E85D75]"
                              />
                            </td>
                            <td className="px-2 py-2 text-sm text-gray-500">
                              {index + 1}
                            </td>
                            {activeColumns.map((col) => (
                              <td key={col.key} className="px-1 py-1.5">
                                {renderCell(item, col.key)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    ) : null}
                  </table>

                  {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <EmptyItemsArt />
                      <p className="max-w-md text-sm font-medium text-gray-700">
                        No items match the selected filters.
                      </p>
                      <p className="mt-1 max-w-md text-sm text-gray-500">
                        Adjust or clear your filters to see more items.
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-4 text-sm font-medium text-[#E85D75] hover:underline"
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="quotation-print-wrap p-3 sm:p-5 print:p-0">
              <MakerLayoutCanvas
                clientName={quotation.clientName}
                items={items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  description: i.description,
                  qty: i.qty,
                  uom: i.uom,
                  unitPrice: i.unitPrice,
                  imageUrl: i.imageUrl,
                }))}
                itemsTotal={analysis.finalPrice}
                blocks={layoutBlocks}
                freeImages={freeImages}
                onBlocksChange={setLayoutBlocks}
                onFreeImagesChange={setFreeImages}
              />
            </div>
          )}

          {/* FAB */}
          <div className="no-print pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
            {fabOpen ? (
              <div className="pointer-events-auto mb-1 max-h-[70vh] w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                <button
                  type="button"
                  onClick={openAddItem}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
                >
                  <span className="text-[#E85D75]">+</span> Add Item
                </button>
                <p className="border-t border-gray-100 px-4 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Layout sections
                </p>
                <button type="button" onClick={() => addSection("richtext")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Text section</button>
                <button type="button" onClick={() => addSection("imageFull")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Add image (full width)</button>
                <button type="button" onClick={() => addSection("imageHalf")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Add image (half)</button>
                <button type="button" onClick={() => addSection("pageBreak")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Page break</button>
                <button type="button" onClick={() => addSection("detailsRow")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Company + Prepared for</button>
                <button type="button" onClick={() => addSection("company")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Company only</button>
                <button type="button" onClick={() => addSection("preparedFor")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Prepared for only</button>
                <button type="button" onClick={() => addSection("heading")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Estimate heading</button>
                <button type="button" onClick={() => addSection("items")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Items table</button>
                <button type="button" onClick={() => addSection("summary")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Summary table</button>
                <button type="button" onClick={() => addSection("payment")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Payment Plan</button>
                <button type="button" onClick={() => addSection("bank")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Bank Details</button>
                <button type="button" onClick={() => addSection("terms")} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Terms & Conditions</button>
                <button
                  type="button"
                  onClick={addFreeImage}
                  className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
                >
                  Free-position image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFabOpen(false);
                    flash("Import coming soon");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
                >
                  Import From...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFabOpen(false);
                    flash("AI Quotation coming soon");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[#E85D75] hover:bg-[#E85D75]/5"
                >
                  AI Quotation
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setFabOpen((v) => !v)}
              className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
              style={{ backgroundColor: accent }}
              aria-label="Add"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => flash("Comments coming soon")}
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
              style={{ backgroundColor: accent }}
              aria-label="Comments"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 11.5a8.5 8.5 0 01-8.5 8.5H6l-3 3V11.5A8.5 8.5 0 0111.5 3h1a8.5 8.5 0 018.5 8.5z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </main>
      </div>

      <MakerSettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={(next) => {
          setSettings(next);
          setSettingsOpen(false);
          flash("Settings saved");
        }}
      />

      <MakerAddItemModal
        open={addItemOpen}
        existingAreas={areaOptions}
        onClose={() => setAddItemOpen(false)}
        onAdd={handleAddItem}
      />
    </div>
  );
}
