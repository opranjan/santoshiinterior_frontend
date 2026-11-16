"use client";

import React, { useEffect, useMemo, useState } from "react";
import { printCatalogPdf } from "@/lib/catalogPrint";
import {
  catalogId,
  createEmptyCatalogRow,
  createKitchenCatalogDefaults,
  createSignatureSeriesDefaults,
  renumberCatalogRows,
  sanitizeElevations,
  sanitizeKitchenBannerUrl,
  type CatalogLayoutMode,
  type CatalogPageVariant,
  type CatalogPicture,
  type CatalogRow,
  type CatalogTablePage,
  type KitchenCatalogDoc,
  type SignatureSeriesBlock,
} from "@/lib/kitchenCatalogDefaults";
import { updateCatalogDataFromDoc } from "@/lib/catalogDataSync";
import {
  applyModularBrandingToDoc,
  applyModularItemToDoc,
  applyModularToSignatureDoc,
  applyQuotationCatalogToDoc,
  applySignatureSeriesToDoc,
  findSignatureSeries,
  type QuotationCatalogLike,
} from "@/lib/mapCatalogSourcesToKitchenDoc";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import SignatureSeriesLayout from "@/components/design/SignatureSeriesLayout";
import {
  modularCatalogsApi,
  quotationCatalogsApi,
  type ModularCatalog,
  type ModularCatalogItem,
  type ModularSeries,
} from "@/services/crmApi";

const field =
  "w-full border-0 bg-transparent px-0 py-0 outline-none placeholder:text-black/30";
const area = `${field} resize-none leading-snug`;

const toolBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e7ddd0] bg-white px-3 text-[12px] font-medium text-[#4a4036] transition hover:border-[#c9b79a] hover:bg-[#faf6f0] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#d9d0c4]";
const toolBtnDark =
  "inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f1710] px-3.5 text-[12px] font-semibold text-white transition hover:bg-[#2d2218] disabled:opacity-40";
const toolBtnDanger =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-40";
const toolSelect =
  "h-10 w-full rounded-xl border border-[#e7ddd0] bg-[#fcfaf7] px-3 text-[13px] font-medium text-[#1c1610] outline-none transition focus:border-[#b89a6a] focus:bg-white dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#d9d0c4]";
const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a8f80]";

function newPic(file: File): CatalogPicture {
  return {
    id: catalogId(),
    url: URL.createObjectURL(file),
  };
}

/** Permanent brand mark until the user uploads a replacement. */
const DEFAULT_LOGO = "/images/logo/santoshi-interiors.jpg";

function revokeBlobUrl(url?: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function revokeRowPics(row: CatalogRow) {
  row.pictures.forEach((pic) => revokeBlobUrl(pic.url));
}

function normalizeDoc(doc: KitchenCatalogDoc): KitchenCatalogDoc {
  const defaults = createSignatureSeriesDefaults();
  const prev = doc.signature || {};
  // Never drop brand logo — empty / cleared always restores Santoshi Interiors
  const rawLogo = String(doc.logoUrl || "").trim();
  const logoUrl =
    !rawLogo || rawLogo === "/images/logo/santoshi-mark.svg" ? DEFAULT_LOGO : rawLogo;
  const kitchens = (prev.kitchens?.length ? prev.kitchens : defaults.kitchens).map((kitchen) => {
    const matched =
      defaults.kitchens.find((row) => {
        const a = kitchen.heading.toLowerCase();
        const b = row.heading.toLowerCase();
        if (/smart storage/i.test(a)) return /smart storage/i.test(b);
        if (/sage/i.test(a)) return /sage/i.test(b);
        if (/taupe/i.test(a)) return /taupe/i.test(b);
        if (/urban|grey|gray/i.test(a)) return /urban|grey|gray/i.test(b);
        return false;
      }) || null;
    // Strip brochure kitchen banners — empty until user uploads
    const imageUrl = sanitizeKitchenBannerUrl(kitchen.imageUrl);
    // Strip brochure template elevation PNGs → always 4 empty upload slots unless user uploaded
    const elevations = sanitizeElevations(
      Array.isArray(kitchen.elevations) ? kitchen.elevations : undefined
    );
    const hardware = Array.isArray(kitchen.hardware)
      ? kitchen.hardware
      : matched
        ? matched.hardware.map((row) => ({ ...row, id: catalogId() }))
        : [];
    const priceRows = Array.isArray(kitchen.priceRows)
      ? kitchen.priceRows
      : matched
        ? matched.priceRows
        : [];
    return { ...kitchen, imageUrl, elevations, hardware, priceRows };
  });
  const first = kitchens[0] || defaults.kitchens[0];

  return {
    ...doc,
    layoutMode: doc.layoutMode === "signature" ? "signature" : "material",
    dataSource: doc.dataSource || { kind: null },
    logoUrl,
    coverHeroUrl: doc.coverHeroUrl ?? "",
    showCover: doc.showCover !== false,
    showClosing: doc.showClosing !== false,
    pages: doc.pages ?? [],
    rows: doc.rows ?? [],
    signature: {
      ...defaults,
      ...prev,
      kitchens,
      kitchenName: first.heading,
      description: first.description,
      heroImageUrl: first.imageUrl,
      priceRows: first.priceRows,
      elevations: sanitizeElevations(
        first.elevations?.length ? first.elevations : defaults.elevations
      ),
      hardware: first.hardware?.length ? first.hardware : defaults.hardware,
      showPriceTable: prev.showPriceTable !== false,
      showElevations: prev.showElevations !== false,
      showSpecsPage: prev.showSpecsPage !== false,
    },
  };
}

function ToolSep() {
  return <span className="mx-0.5 hidden h-5 w-px bg-[#eadfcf] sm:inline-block dark:bg-[#3a342c]" />;
}

function TablePage({
  page,
  pageIndex,
  pageCount,
  rows,
  selectedIds,
  doc,
  onDoc,
  onRow,
  onToggleSelect,
  onSelectAll,
  onAddPic,
  onRemovePic,
  onUpdatePicLabel,
  onClearPics,
  onInsertRow,
  onDuplicateRow,
  onRemoveRow,
  onMoveRow,
  onPatchPage,
  onRemovePage,
  onMovePage,
}: {
  page: CatalogTablePage;
  pageIndex: number;
  pageCount: number;
  rows: CatalogRow[];
  selectedIds: Set<string>;
  doc: KitchenCatalogDoc;
  onDoc: (patch: Partial<KitchenCatalogDoc>) => void;
  onRow: (id: string, patch: Partial<CatalogRow>) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[], checked: boolean) => void;
  onAddPic: (rowId: string, files: FileList | null) => void;
  onRemovePic: (rowId: string, picId: string) => void;
  onUpdatePicLabel: (rowId: string, picId: string, label: string) => void;
  onClearPics: (rowId: string) => void;
  onInsertRow: (pageId: string, afterRowId?: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onRemoveRow: (id: string) => void;
  onMoveRow: (rowId: string, dir: -1 | 1) => void;
  onPatchPage: (pageId: string, patch: Partial<CatalogTablePage>) => void;
  onRemovePage: (pageId: string) => void;
  onMovePage: (pageId: string, dir: -1 | 1) => void;
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  return (
    <section className={`catalog-page catalog-table-page variant-${page.variant}`}>
      <div className="no-print mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-white/20 bg-black/10 px-2 py-1.5 backdrop-blur-sm">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
          Table page {pageIndex + 1}
        </span>
        <select
          value={page.variant}
          onChange={(e) =>
            onPatchPage(page.id, { variant: e.target.value as CatalogPageVariant })
          }
          className="h-7 rounded border-0 bg-white/95 px-2 text-[11px] font-semibold text-[#1c1610]"
          title="Header theme"
        >
          <option value="green">Theme: Green</option>
          <option value="yellow">Theme: Yellow</option>
          <option value="blue">Theme: Blue</option>
        </select>
        <label className="flex h-7 items-center gap-1 rounded bg-white/90 px-2 text-[11px] font-semibold text-[#1c1610]">
          <input
            type="checkbox"
            checked={page.showIntro}
            onChange={(e) => onPatchPage(page.id, { showIntro: e.target.checked })}
          />
          Banner
        </label>
        <button type="button" className={toolBtn} onClick={() => onInsertRow(page.id)}>
          + Row
        </button>
        <button
          type="button"
          className={toolBtn}
          disabled={pageIndex === 0}
          onClick={() => onMovePage(page.id, -1)}
        >
          Page ↑
        </button>
        <button
          type="button"
          className={toolBtn}
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onMovePage(page.id, 1)}
        >
          Page ↓
        </button>
        <button type="button" className={toolBtnDanger} onClick={() => onRemovePage(page.id)}>
          Delete page
        </button>
      </div>

      {page.showIntro ? (
        <>
          <div className="catalog-table-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.logoUrl || DEFAULT_LOGO}
              alt="Santoshi Interiors"
              className="catalog-logo-mark"
            />
            <div className="catalog-head-brand">
              <input
                value={doc.brandTop}
                onChange={(e) => onDoc({ brandTop: e.target.value })}
                data-print-class="catalog-head-brand"
                className={`${field} text-white`}
                style={{ color: "inherit" }}
              />
              <input
                value={doc.brandBottom}
                onChange={(e) => onDoc({ brandBottom: e.target.value })}
                data-print-class="catalog-head-brand"
                className={`${field} text-[10px] tracking-[0.2em]`}
                style={{ color: "#c4a574" }}
              />
            </div>
          </div>
          <input
            value={doc.sectionBanner}
            onChange={(e) => onDoc({ sectionBanner: e.target.value })}
            data-print-class="catalog-banner"
            className="catalog-banner mx-auto block w-[70%] bg-gradient-to-r from-[#b8924e] via-[#e8d5b5] to-[#b8924e] px-4 py-2 text-center text-lg font-extrabold tracking-[0.18em] text-black outline-none"
          />
          <input
            value={doc.sectionTag}
            onChange={(e) => onDoc({ sectionTag: e.target.value })}
            data-print-class="catalog-tag"
            className="catalog-tag mx-auto mt-2 mb-3 block w-fit border-2 border-[#00332b] bg-white px-6 py-1 text-center text-sm font-extrabold tracking-[0.12em] text-black outline-none"
          />
        </>
      ) : null}

      <table className="catalog-table w-full table-fixed border-collapse text-left">
        <thead>
          <tr>
            <th className="no-print w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) =>
                  onSelectAll(
                    rows.map((r) => r.id),
                    e.target.checked
                  )
                }
                title="Select all on page"
              />
            </th>
            <th className="col-sr">SR NO</th>
            <th>Description</th>
            <th className="col-rate">PER SQ FT/QTY</th>
            <th className="col-model">MODEL</th>
            <th className="col-pics">Pictures</th>
            <th className="no-print w-[7.5rem]">Tools</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#8a7b68]">
                No items on this page.{" "}
                <button
                  type="button"
                  className="no-print font-semibold text-[#9a7748] underline"
                  onClick={() => onInsertRow(page.id)}
                >
                  Add row
                </button>
              </td>
            </tr>
          ) : null}
          {rows.map((row, rowIndex) => (
            <tr
              key={row.id}
              className={selectedIds.has(row.id) ? "ring-2 ring-inset ring-[#c4a574]" : undefined}
            >
              <td className="no-print text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  onChange={() => onToggleSelect(row.id)}
                />
              </td>
              <td className="col-sr text-center font-extrabold">
                <input
                  value={row.sr}
                  onChange={(e) => onRow(row.id, { sr: Number(e.target.value) || 0 })}
                  className={`${field} text-center font-extrabold`}
                />
              </td>
              <td>
                <textarea
                  value={row.description}
                  onChange={(e) => onRow(row.id, { description: e.target.value })}
                  rows={4}
                  className={area}
                  placeholder="Item description…"
                />
              </td>
              <td className="col-rate text-center font-bold">
                <textarea
                  value={row.rate}
                  onChange={(e) => onRow(row.id, { rate: e.target.value })}
                  rows={2}
                  className={`${area} text-center font-bold`}
                  placeholder="Rate / qty"
                />
              </td>
              <td className="col-model text-center font-extrabold">
                <input
                  value={row.model}
                  onChange={(e) => onRow(row.id, { model: e.target.value })}
                  className={`${field} text-center font-extrabold`}
                  placeholder="Model"
                />
              </td>
              <td className="col-pics">
                <div className="pic-grid flex flex-wrap gap-1.5">
                  {row.pictures.map((pic) => (
                    <div key={pic.id} className="relative w-[96px]">
                      <img src={pic.url} alt={pic.label || ""} />
                      <input
                        value={pic.label || ""}
                        onChange={(e) => onUpdatePicLabel(row.id, pic.id, e.target.value)}
                        placeholder="Label"
                        className="no-print mt-0.5 w-full border-0 bg-white/90 px-0.5 text-[9px] outline-none"
                      />
                      <button
                        type="button"
                        className="no-print absolute -right-1 -top-1 rounded bg-white px-1 text-[10px] font-bold text-red-600 shadow"
                        onClick={() => onRemovePic(row.id, pic.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="no-print empty-slot flex h-14 min-w-[4.5rem] cursor-pointer items-center justify-center border border-dashed border-[#e2b84c] text-[10px] font-semibold text-[#8a7b68]">
                    + Image
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        onAddPic(row.id, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {row.pictures.length ? (
                  <button
                    type="button"
                    className="no-print mt-1 text-[10px] font-semibold text-[#8a7b68]"
                    onClick={() => onClearPics(row.id)}
                  >
                    Clear images
                  </button>
                ) : null}
              </td>
              <td className="no-print">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="text-left text-[10px] font-semibold text-[#9a7748]"
                    onClick={() => onInsertRow(page.id, row.id)}
                  >
                    + Insert below
                  </button>
                  <button
                    type="button"
                    className="text-left text-[10px] font-semibold text-[#9a7748]"
                    onClick={() => onDuplicateRow(row.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="text-left text-[10px] font-semibold text-[#8a7b68] disabled:opacity-30"
                    disabled={rowIndex === 0}
                    onClick={() => onMoveRow(row.id, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="text-left text-[10px] font-semibold text-[#8a7b68] disabled:opacity-30"
                    disabled={rowIndex >= rows.length - 1}
                    onClick={() => onMoveRow(row.id, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="text-left text-[10px] font-semibold text-red-600"
                    onClick={() => onRemoveRow(row.id)}
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function CatalogPdfEditor() {
  const [doc, setDoc] = useState<KitchenCatalogDoc>(() =>
    normalizeDoc(createKitchenCatalogDefaults())
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<KitchenCatalogDoc[]>([]);
  const [future, setFuture] = useState<KitchenCatalogDoc[]>([]);

  const [quotationCatalogs, setQuotationCatalogs] = useState<QuotationCatalogLike[]>([]);
  const [quotationId, setQuotationId] = useState("");
  const [modularSeries, setModularSeries] = useState<ModularSeries[]>([]);
  const [modularCatalogId, setModularCatalogId] = useState("");
  const [modularItemId, setModularItemId] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogNote, setCatalogNote] = useState("");
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [dataPanel, setDataPanel] = useState<"quotation" | "modular">("modular");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogBusy(true);
      setCatalogError("");
      try {
        const [bundle, tree] = await Promise.all([
          quotationCatalogsApi.getBundle().catch(() => null),
          modularCatalogsApi.tree().catch(() => null),
        ]);
        if (cancelled) return;
        const catalogs = (bundle?.catalogs || []) as QuotationCatalogLike[];
        setQuotationCatalogs(catalogs);
        if (catalogs[0]?.id) setQuotationId(String(catalogs[0].id));
        const series = tree?.series || [];
        setModularSeries(series);
        const firstCatalog = series[0]?.catalogs?.[0];
        if (firstCatalog?.id) {
          setModularCatalogId(firstCatalog.id);
          if (firstCatalog.items?.[0]?.id) setModularItemId(firstCatalog.items[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setCatalogError(
            err instanceof Error ? err.message : "Could not load modular / quotation catalogs"
          );
        }
      } finally {
        if (!cancelled) setCatalogBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!updateConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !catalogBusy) setUpdateConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [updateConfirmOpen, catalogBusy]);

  const modularCatalogOptions = useMemo(() => {
    const rows: Array<{ id: string; label: string; catalog: ModularCatalog; seriesName: string }> =
      [];
    modularSeries.forEach((series) => {
      (series.catalogs || []).forEach((catalog) => {
        rows.push({
          id: catalog.id,
          label: `${series.name} · ${catalog.name}`,
          catalog,
          seriesName: series.name,
        });
      });
    });
    return rows;
  }, [modularSeries]);

  const selectedModular = useMemo(
    () => modularCatalogOptions.find((row) => row.id === modularCatalogId) || null,
    [modularCatalogOptions, modularCatalogId]
  );

  const modularItems: ModularCatalogItem[] = selectedModular?.catalog.items || [];

  useEffect(() => {
    if (!modularItems.length) {
      setModularItemId("");
      return;
    }
    if (!modularItems.some((item) => item.id === modularItemId)) {
      setModularItemId(modularItems[0].id);
    }
  }, [modularItems, modularItemId]);

  const importQuotationCatalog = async (mode: "replace" | "merge-branding") => {
    if (!quotationId) {
      setCatalogError("Select a quotation catalog first");
      return;
    }
    try {
      setCatalogBusy(true);
      setCatalogError("");
      setCatalogNote("");
      let catalog = quotationCatalogs.find((c) => String(c.id) === quotationId);
      try {
        const fresh = (await quotationCatalogsApi.get(quotationId)) as QuotationCatalogLike;
        catalog = fresh;
        setQuotationCatalogs((prev) => {
          const others = prev.filter((c) => String(c.id) !== quotationId);
          return [fresh, ...others];
        });
      } catch {
        /* use bundle snapshot */
      }
      if (!catalog) throw new Error("Quotation catalog not found");
      commit((prev) => {
        if (mode === "merge-branding") {
          const name = String(catalog?.name || "").trim();
          return {
            ...prev,
            coverSubtitle: name ? name.toUpperCase() : prev.coverSubtitle,
            sectionBanner: name ? name.toUpperCase() : prev.sectionBanner,
            sectionTag: "QUOTATION CATALOG",
            closingBody: String(catalog?.description || "").trim() || prev.closingBody,
          };
        }
        return applyQuotationCatalogToDoc(prev, catalog as QuotationCatalogLike);
      });
      setSelectedIds(new Set());
      setCatalogNote(
        mode === "replace"
          ? `Loaded quotation catalog “${catalog.name || quotationId}” into PDF rows`
          : `Applied quotation catalog branding from “${catalog.name || quotationId}”`
      );
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setCatalogBusy(false);
    }
  };

  const importModular = (mode: "replace" | "append" | "branding") => {
    if (!selectedModular) {
      setCatalogError("Select a modular catalog first");
      return;
    }
    try {
      setCatalogError("");
      setCatalogNote("");
      if (mode === "branding") {
        commit((prev) =>
          applyModularBrandingToDoc(prev, selectedModular.catalog, selectedModular.seriesName)
        );
        setCatalogNote(`Applied modular branding from “${selectedModular.label}”`);
        return;
      }
      const item = modularItems.find((row) => row.id === modularItemId);
      if (!item) {
        setCatalogError("Select a modular size / package to import");
        return;
      }
      commit((prev) => {
        if (prev.layoutMode === "signature") {
          return applyModularToSignatureDoc(
            prev,
            selectedModular.catalog,
            item,
            selectedModular.seriesName
          );
        }
        return applyModularItemToDoc(
          prev,
          selectedModular.catalog,
          item,
          mode,
          selectedModular.seriesName
        );
      });
      setSelectedIds(new Set());
      setCatalogNote(
        `${mode === "append" && doc.layoutMode !== "signature" ? "Appended" : "Loaded"} modular package “${item.name}” (${item.code || item.id})`
      );
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Modular import failed");
    }
  };

  const persistCatalogData = async () => {
    try {
      setCatalogBusy(true);
      setCatalogError("");
      setCatalogNote("");
      const result = await updateCatalogDataFromDoc(doc);
      if (result.errors.length && !result.updated) {
        const msg = result.errors[0] || "Update failed";
        setCatalogError(msg);
        toastError(msg, "Update failed");
        return;
      }
      // Swap blob preview URLs for persisted /uploads URLs after image save
      if (result.kitchens?.length) {
        commit((prev) => {
          const first = result.kitchens![0];
          return {
            ...prev,
            signature: {
              ...(prev.signature || createSignatureSeriesDefaults()),
              kitchens: result.kitchens!,
              heroImageUrl: first?.imageUrl || prev.signature?.heroImageUrl || "",
              elevations: first?.elevations || prev.signature?.elevations || [],
              hardware: first?.hardware || prev.signature?.hardware || [],
            },
          };
        });
      }
      // Refresh modular tree so dropdowns show new prices / saved banners
      try {
        const tree = await modularCatalogsApi.tree();
        setModularSeries(tree?.series || []);
      } catch {
        /* ignore refresh errors */
      }
      try {
        const bundle = await quotationCatalogsApi.getBundle();
        setQuotationCatalogs((bundle?.catalogs || []) as QuotationCatalogLike[]);
      } catch {
        /* ignore */
      }
      const note = `Updated ${result.updated} record(s) in ${result.label || "catalog"}${
        result.skipped ? ` · ${result.skipped} skipped (no source id)` : ""
      }${result.errors.length ? ` · ${result.errors.length} error(s)` : ""}`;
      setCatalogNote(note);
      if (result.errors.length) {
        const errMsg = result.errors.slice(0, 3).join(" · ");
        setCatalogError(errMsg);
        toastWarning(`${note}. ${errMsg}`, "Partial update");
      } else {
        toastSuccess(note, "Catalog updated");
      }
      setUpdateConfirmOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update data failed";
      setCatalogError(msg);
      toastError(msg, "Update failed");
    } finally {
      setCatalogBusy(false);
    }
  };

  const loadSignatureSeriesData = async (seriesList?: ModularSeries[]) => {
    try {
      setCatalogBusy(true);
      setCatalogError("");
      setCatalogNote("");
      let list = seriesList || modularSeries;
      let series = findSignatureSeries(list);
      if (!series || !(series.catalogs || []).length) {
        const seeded = await modularCatalogsApi.seedSignature();
        list = seeded?.series || [];
        setModularSeries(list);
        series = findSignatureSeries(list);
      }
      if (!series || !(series.catalogs || []).length) {
        throw new Error("Signature Series catalogs not found. Seed modular catalog first.");
      }
      commit((prev) => applySignatureSeriesToDoc(prev, series!));
      const preferred =
        series.catalogs.find((catalog) => (catalog.items || []).length > 0) || series.catalogs[0];
      if (preferred?.id) {
        setModularCatalogId(preferred.id);
        if (preferred.items?.[0]?.id) setModularItemId(preferred.items[0].id);
        else setModularItemId("");
      }
      setSelectedIds(new Set());
      const packageCount = series.catalogs.reduce(
        (sum, catalog) => sum + (catalog.items?.length || 0),
        0
      );
      setCatalogNote(
        `Loaded Signature Series · ${series.catalogs.length} kitchens · ${packageCount} size package(s) from modular data`
      );
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Could not load Signature Series data");
    } finally {
      setCatalogBusy(false);
    }
  };

  const patchSignature = (updater: (prev: SignatureSeriesBlock) => SignatureSeriesBlock) => {
    commit((prev) => ({
      ...prev,
      signature: updater(prev.signature || createSignatureSeriesDefaults()),
    }));
  };

  const setLayoutMode = (mode: CatalogLayoutMode) => {
    if (mode === "signature") {
      commit((prev) => ({
        ...prev,
        layoutMode: "signature",
        // Keep cover/closing unless the user explicitly removed them
        showCover: prev.showCover !== false,
        showClosing: prev.showClosing !== false,
        signature: createSignatureSeriesDefaults(),
      }));
      void loadSignatureSeriesData();
      return;
    }
    commit((prev) => ({
      ...prev,
      layoutMode: "material",
      showCover: prev.showCover !== false,
      showClosing: prev.showClosing !== false,
      signature: prev.signature || createSignatureSeriesDefaults(),
    }));
  };

  const pushHistory = (prev: KitchenCatalogDoc) => {
    setHistory((h) => [...h.slice(-29), structuredClone(normalizeDoc(prev))]);
    setFuture([]);
  };

  const commit = (updater: (prev: KitchenCatalogDoc) => KitchenCatalogDoc) => {
    setDoc((prev) => {
      const safe = normalizeDoc(prev);
      pushHistory(safe);
      return normalizeDoc(updater(safe));
    });
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [structuredClone(normalizeDoc(doc)), ...f]);
      setDoc(normalizeDoc(prev));
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, structuredClone(normalizeDoc(doc))]);
      setDoc(normalizeDoc(next));
      return f.slice(1);
    });
  };

  const patchDoc = (patch: Partial<KitchenCatalogDoc>) =>
    commit((prev) => ({ ...prev, ...patch }));

  const updateRow = (id: string, patch: Partial<CatalogRow>) => {
    commit((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const addPic = (rowId: string, files: FileList | null) => {
    if (!files?.length) return;
    const pics = Array.from(files).map(newPic);
    commit((prev) => ({
      ...prev,
      rows: prev.rows.map((row) =>
        row.id === rowId ? { ...row, pictures: [...row.pictures, ...pics] } : row
      ),
    }));
  };

  const removePic = (rowId: string, picId: string) => {
    commit((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => {
        if (row.id !== rowId) return row;
        const target = row.pictures.find((p) => p.id === picId);
        revokeBlobUrl(target?.url);
        return { ...row, pictures: row.pictures.filter((p) => p.id !== picId) };
      }),
    }));
  };

  const updatePicLabel = (rowId: string, picId: string, label: string) => {
    commit((prev) => ({
      ...prev,
      rows: prev.rows.map((row) =>
        row.id !== rowId
          ? row
          : {
              ...row,
              pictures: row.pictures.map((pic) =>
                pic.id === picId ? { ...pic, label } : pic
              ),
            }
      ),
    }));
  };

  const clearPics = (rowId: string) => {
    commit((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => {
        if (row.id !== rowId) return row;
        revokeRowPics(row);
        return { ...row, pictures: [] };
      }),
    }));
  };

  const removeRow = (id: string) => {
    commit((prev) => {
      const target = prev.rows.find((r) => r.id === id);
      if (target) revokeRowPics(target);
      return { ...prev, rows: prev.rows.filter((row) => row.id !== id) };
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const insertRow = (pageId: string, afterRowId?: string) => {
    commit((prev) => {
      const nextSr =
        prev.rows.reduce((max, row) => Math.max(max, row.sr), 0) + 1;
      const row = createEmptyCatalogRow(pageId, nextSr);
      const rows = [...prev.rows];
      if (afterRowId) {
        const idx = rows.findIndex((r) => r.id === afterRowId);
        if (idx >= 0) {
          rows.splice(idx + 1, 0, row);
          return { ...prev, rows };
        }
      }
      let lastIdx = -1;
      rows.forEach((r, i) => {
        if (r.pageId === pageId) lastIdx = i;
      });
      if (lastIdx >= 0) rows.splice(lastIdx + 1, 0, row);
      else rows.push(row);
      return { ...prev, rows };
    });
  };

  const duplicateRow = (rowId: string) => {
    commit((prev) => {
      const idx = prev.rows.findIndex((r) => r.id === rowId);
      if (idx < 0) return prev;
      const source = prev.rows[idx];
      const nextSr =
        prev.rows.reduce((max, row) => Math.max(max, row.sr), 0) + 1;
      const copy: CatalogRow = {
        ...structuredClone(source),
        id: catalogId(),
        sr: nextSr,
        model: `${source.model}-COPY`,
        pictures: source.pictures.map((pic) => ({
          ...pic,
          id: catalogId(),
        })),
      };
      const rows = [...prev.rows];
      rows.splice(idx + 1, 0, copy);
      return { ...prev, rows };
    });
  };

  const moveRow = (rowId: string, dir: -1 | 1) => {
    commit((prev) => {
      const row = prev.rows.find((r) => r.id === rowId);
      if (!row) return prev;
      const pageRows = prev.rows.filter((r) => r.pageId === row.pageId);
      const localIdx = pageRows.findIndex((r) => r.id === rowId);
      const swapWith = pageRows[localIdx + dir];
      if (!swapWith) return prev;
      const a = prev.rows.findIndex((r) => r.id === rowId);
      const b = prev.rows.findIndex((r) => r.id === swapWith.id);
      const rows = [...prev.rows];
      [rows[a], rows[b]] = [rows[b], rows[a]];
      return { ...prev, rows };
    });
  };

  const deleteSelected = () => {
    if (!selectedIds.size) return;
    commit((prev) => {
      prev.rows.forEach((row) => {
        if (selectedIds.has(row.id)) revokeRowPics(row);
      });
      return {
        ...prev,
        rows: prev.rows.filter((row) => !selectedIds.has(row.id)),
      };
    });
    setSelectedIds(new Set());
  };

  const duplicateSelected = () => {
    if (!selectedIds.size) return;
    commit((prev) => {
      let nextSr = prev.rows.reduce((max, row) => Math.max(max, row.sr), 0);
      const rows = [...prev.rows];
      [...selectedIds].forEach((id) => {
        const idx = rows.findIndex((r) => r.id === id);
        if (idx < 0) return;
        const source = rows[idx];
        nextSr += 1;
        rows.splice(idx + 1, 0, {
          ...structuredClone(source),
          id: catalogId(),
          sr: nextSr,
          model: `${source.model}-COPY`,
          pictures: source.pictures.map((pic) => ({ ...pic, id: catalogId() })),
        });
      });
      return { ...prev, rows };
    });
  };

  const renumberAll = () => {
    commit((prev) => ({
      ...prev,
      rows: renumberCatalogRows(
        prev.pages.flatMap((page) => prev.rows.filter((r) => r.pageId === page.id))
      ),
    }));
  };

  const addPage = (variant: CatalogPageVariant = "yellow") => {
    commit((prev) => {
      const pageId = catalogId();
      const nextSr =
        prev.rows.reduce((max, row) => Math.max(max, row.sr), 0) + 1;
      return {
        ...prev,
        pages: [
          ...prev.pages,
          { id: pageId, variant, showIntro: prev.pages.length === 0 },
        ],
        rows: [...prev.rows, createEmptyCatalogRow(pageId, nextSr)],
      };
    });
  };

  const removePage = (pageId: string) => {
    commit((prev) => {
      prev.rows
        .filter((r) => r.pageId === pageId)
        .forEach(revokeRowPics);
      return {
        ...prev,
        pages: prev.pages.filter((p) => p.id !== pageId),
        rows: prev.rows.filter((r) => r.pageId !== pageId),
      };
    });
  };

  const patchPage = (pageId: string, patch: Partial<CatalogTablePage>) => {
    commit((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)),
    }));
  };

  const movePage = (pageId: string, dir: -1 | 1) => {
    commit((prev) => {
      const idx = prev.pages.findIndex((p) => p.id === pageId);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= prev.pages.length) return prev;
      const pages = [...prev.pages];
      [pages[idx], pages[swap]] = [pages[swap], pages[idx]];
      return { ...prev, pages };
    });
  };

  const clearAllRows = () => {
    if (!window.confirm("Remove all catalog rows?")) return;
    commit((prev) => {
      prev.rows.forEach(revokeRowPics);
      return { ...prev, rows: [] };
    });
    setSelectedIds(new Set());
  };

  const resetTemplate = () => {
    if (!window.confirm("Reset to Kitchen Collection template? Unsaved edits will be lost."))
      return;
    commit(() => createKitchenCatalogDefaults());
    setSelectedIds(new Set());
  };

  const setCoverHero = (file?: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    commit((prev) => {
      revokeBlobUrl(prev.coverHeroUrl);
      return { ...prev, coverHeroUrl: url };
    });
  };

  const clearCoverHero = () => {
    commit((prev) => {
      revokeBlobUrl(prev.coverHeroUrl);
      return { ...prev, coverHeroUrl: "" };
    });
  };

  const setLogo = (file?: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    commit((prev) => {
      revokeBlobUrl(prev.logoUrl);
      return { ...prev, logoUrl: url };
    });
  };

  const clearLogo = () => {
    // Keep Santoshi logo permanent — “remove” restores brand default
    commit((prev) => {
      revokeBlobUrl(prev.logoUrl);
      return { ...prev, logoUrl: DEFAULT_LOGO };
    });
  };

  const resetDefaultLogo = () => {
    commit((prev) => {
      revokeBlobUrl(prev.logoUrl);
      return { ...prev, logoUrl: DEFAULT_LOGO };
    });
  };

  const pagesWithRows = useMemo(
    () =>
      doc.pages.map((page) => ({
        page,
        rows: doc.rows.filter((r) => r.pageId === page.id),
      })),
    [doc.pages, doc.rows]
  );

  useEffect(() => {
    setDataPanel(doc.layoutMode === "signature" ? "modular" : "quotation");
  }, [doc.layoutMode]);

  const preferredModularCatalogId = useMemo(() => {
    const withItems = modularCatalogOptions.find((row) => (row.catalog.items || []).length > 0);
    return withItems?.id || modularCatalogOptions[0]?.id || "";
  }, [modularCatalogOptions]);

  useEffect(() => {
    if (!modularCatalogId && preferredModularCatalogId) {
      setModularCatalogId(preferredModularCatalogId);
    }
  }, [modularCatalogId, preferredModularCatalogId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Compact header */}
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1410] dark:text-white">
              Catalog PDF Editor
            </h1>
            {doc.dataSource?.kind ? (
              <span className="inline-flex max-w-[320px] truncate rounded-md bg-[#1f1710] px-2 py-0.5 text-[11px] font-medium text-[#f4ebe0]">
                {doc.dataSource.label || "Linked"}
              </span>
            ) : (
              <span className="rounded-md bg-[#efe8dc] px-2 py-0.5 text-[11px] font-medium text-[#8a7b68]">
                Not linked
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-[#8a7b68]">
            Edit in layout · save with Update data · export PDF
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={
              doc.layoutMode === "signature"
                ? "/templates/signature-series.pdf"
                : "/templates/kitchen-collection-material-sheet.pdf"
            }
            target="_blank"
            rel="noreferrer"
            className={toolBtn}
          >
            Original PDF
          </a>
          <button
            type="button"
            className={toolBtnDark}
            disabled={catalogBusy || !doc.dataSource?.kind}
            title={
              doc.dataSource?.kind
                ? `Save edited prices/descriptions to ${doc.dataSource.label || "catalog"}`
                : "Load a quotation or Signature Series catalog first"
            }
            onClick={() => setUpdateConfirmOpen(true)}
          >
            Update data
          </button>
          <button
            type="button"
            className={toolBtnDark}
            onClick={() =>
              void printCatalogPdf(
                doc.layoutMode === "signature"
                  ? doc.signature?.seriesTitle || "SIGNATURE SERIES"
                  : `${doc.coverTitle || "CATALOG"} ${doc.coverSubtitle || "COLLECTION"}`.trim()
              )
            }
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Sticky workspace controls */}
      <div className="no-print mb-4 sticky top-0 z-20 overflow-hidden rounded-2xl border border-[#e8dfd2] bg-white/95 shadow-[0_8px_28px_rgba(26,20,16,0.08)] backdrop-blur dark:border-[#3a342c] dark:bg-[#161411]/95">
        {/* Layout + document pages */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efe8dc] px-4 py-2.5 dark:border-[#2e2820]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1">
              {(
                [
                  ["material", "Material sheet"],
                  ["signature", "Signature Series"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayoutMode(mode)}
                  className={`relative h-9 px-3 text-[13px] font-semibold transition ${
                    doc.layoutMode === mode
                      ? "text-[#1a1410] dark:text-[#f4ebe0]"
                      : "text-[#9a8f80] hover:text-[#5c5348]"
                  }`}
                >
                  {label}
                  {doc.layoutMode === mode ? (
                    <span className="absolute inset-x-2 -bottom-[11px] h-0.5 rounded-full bg-[#c4a574]" />
                  ) : null}
                </button>
              ))}
            </div>
            <div className="hidden h-5 w-px bg-[#eadfcf] sm:block dark:bg-[#3a342c]" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#9a8f80]">Pages</span>
              {(
                [
                  ["showCover", "Cover", doc.showCover],
                  ["showClosing", "Closing", doc.showClosing],
                ] as const
              ).map(([key, label, on]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    patchDoc(key === "showCover" ? { showCover: !on } : { showClosing: !on })
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition ${
                    on
                      ? "border-[#d9c7a8] bg-[#f7f1e7] text-[#3d342a]"
                      : "border-transparent bg-transparent text-[#9a8f80] hover:bg-[#f7f1e7]"
                  }`}
                  title={on ? `Hide ${label.toLowerCase()} page` : `Show ${label.toLowerCase()} page`}
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border text-[9px] ${
                      on
                        ? "border-[#1f1710] bg-[#1f1710] text-white"
                        : "border-[#cfc3b2] bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className={toolBtn} disabled={!history.length} onClick={undo}>
              Undo
            </button>
            <button type="button" className={toolBtn} disabled={!future.length} onClick={redo}>
              Redo
            </button>
            <label className={`${toolBtn} cursor-pointer`}>
              {doc.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.logoUrl} alt="" className="h-4 w-4 object-contain" />
              ) : null}
              Logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  setLogo(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button type="button" className={toolBtn} onClick={resetDefaultLogo}>
              Default
            </button>
          </div>
        </div>

        {/* Data source panel — matches active layout */}
        <div className="px-4 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold text-[#1a1410] dark:text-[#f4ebe0]">
                {doc.layoutMode === "signature" ? "Modular catalog" : "Catalog data"}
              </p>
              <p className="text-[12px] text-[#8a7b68]">
                {doc.layoutMode === "signature"
                  ? "Load kitchens and E1–E5 packages into the Signature layout"
                  : "Pull quotation items or modular packages into the material sheet"}
              </p>
            </div>
            {doc.layoutMode === "material" ? (
              <div className="inline-flex rounded-lg bg-[#f3ebe0] p-0.5 dark:bg-[#221c17]">
                <button
                  type="button"
                  className={`h-8 rounded-md px-3 text-[12px] font-semibold ${
                    dataPanel === "quotation"
                      ? "bg-white text-[#1a1410] shadow-sm dark:bg-[#2c241c] dark:text-white"
                      : "text-[#8a7b68]"
                  }`}
                  onClick={() => setDataPanel("quotation")}
                >
                  Quotation
                </button>
                <button
                  type="button"
                  className={`h-8 rounded-md px-3 text-[12px] font-semibold ${
                    dataPanel === "modular"
                      ? "bg-white text-[#1a1410] shadow-sm dark:bg-[#2c241c] dark:text-white"
                      : "text-[#8a7b68]"
                  }`}
                  onClick={() => setDataPanel("modular")}
                >
                  Modular
                </button>
              </div>
            ) : null}
          </div>

          {(catalogBusy || catalogNote || catalogError) && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
              {catalogBusy ? (
                <span className="rounded-md bg-[#f3ebe0] px-2.5 py-1 text-[#7a6d5d]">Loading…</span>
              ) : null}
              {catalogError ? (
                <span className="rounded-md bg-red-50 px-2.5 py-1 font-medium text-red-700">
                  {catalogError}
                </span>
              ) : null}
              {catalogNote ? (
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  {catalogNote}
                </span>
              ) : null}
            </div>
          )}

          {doc.layoutMode === "material" && dataPanel === "quotation" ? (
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <select
                value={quotationId}
                onChange={(e) => setQuotationId(e.target.value)}
                className={toolSelect}
                disabled={catalogBusy || !quotationCatalogs.length}
              >
                {!quotationCatalogs.length ? (
                  <option value="">No quotation catalogs</option>
                ) : (
                  quotationCatalogs.map((catalog) => (
                    <option key={String(catalog.id)} value={String(catalog.id)}>
                      {String(catalog.name || catalog.id)}
                    </option>
                  ))
                )}
              </select>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={toolBtnDark}
                  disabled={catalogBusy || !quotationId}
                  onClick={() => void importQuotationCatalog("replace")}
                >
                  Load items
                </button>
                <button
                  type="button"
                  className={toolBtn}
                  disabled={catalogBusy || !quotationId}
                  onClick={() => void importQuotationCatalog("merge-branding")}
                >
                  Branding only
                </button>
                <a href="/settings/quotations/catalogs" className={toolBtn}>
                  Manage
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={sectionLabel}>Kitchen catalog</span>
                  <select
                    value={modularCatalogId}
                    onChange={(e) => setModularCatalogId(e.target.value)}
                    className={toolSelect}
                    disabled={catalogBusy || !modularCatalogOptions.length}
                  >
                    {!modularCatalogOptions.length ? (
                      <option value="">No modular catalogs</option>
                    ) : (
                      modularCatalogOptions.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.label}
                          {(row.catalog.items || []).length
                            ? ` · ${row.catalog.items.length} packages`
                            : " · no packages"}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className={sectionLabel}>Size package (E1–E5)</span>
                  <select
                    value={modularItemId}
                    onChange={(e) => setModularItemId(e.target.value)}
                    className={toolSelect}
                    disabled={catalogBusy || !modularItems.length}
                  >
                    {!modularItems.length ? (
                      <option value="">No packages in this catalog</option>
                    ) : (
                      modularItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code ? `${item.code} · ` : ""}
                          {item.name}
                          {item.areaSqFt ? ` (${item.areaSqFt} sq.ft)` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={toolBtnDark}
                  disabled={catalogBusy}
                  onClick={() => void loadSignatureSeriesData()}
                >
                  Load Signature Series
                </button>
                <button
                  type="button"
                  className={toolBtn}
                  disabled={catalogBusy || !modularItemId}
                  onClick={() => importModular("replace")}
                >
                  {doc.layoutMode === "signature" ? "Update this kitchen" : "Load package"}
                </button>
                {doc.layoutMode === "material" ? (
                  <button
                    type="button"
                    className={toolBtn}
                    disabled={catalogBusy || !modularItemId}
                    onClick={() => importModular("append")}
                  >
                    Append package
                  </button>
                ) : null}
                <button
                  type="button"
                  className={toolBtn}
                  disabled={catalogBusy || !modularCatalogId}
                  onClick={() => importModular("branding")}
                >
                  Branding
                </button>
                <a href="/settings/modular-catalog" className={toolBtn}>
                  Manage modular
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Material-only page tools */}
        {doc.layoutMode === "material" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#efe8dc] bg-[#faf7f2]/80 px-4 py-2.5 dark:border-[#2e2820] dark:bg-[#12100e]/50">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-[#8a7b68]">
                {selectedIds.size} selected · {doc.rows.length} rows · {doc.pages.length} pages
              </span>
              <button type="button" className={toolBtn} onClick={() => addPage("yellow")}>
                + Table page
              </button>
              <button
                type="button"
                className={toolBtn}
                onClick={() => {
                  const last = doc.pages[doc.pages.length - 1];
                  if (last) insertRow(last.id);
                  else addPage("yellow");
                }}
              >
                + Item
              </button>
              <button type="button" className={toolBtn} onClick={renumberAll}>
                Renumber
              </button>
              <button type="button" className={toolBtn} onClick={resetTemplate}>
                Reset
              </button>
              <button type="button" className={toolBtnDanger} onClick={clearAllRows}>
                Clear rows
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={toolBtn}
                disabled={!selectedIds.size}
                onClick={duplicateSelected}
              >
                Duplicate
              </button>
              <button
                type="button"
                className={toolBtnDanger}
                disabled={!selectedIds.size}
                onClick={deleteSelected}
              >
                Delete
              </button>
              <button
                type="button"
                className={toolBtn}
                disabled={!selectedIds.size}
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#efe8dc] bg-[#faf7f2]/80 px-4 py-2.5 dark:border-[#2e2820] dark:bg-[#12100e]/50">
            <span className="text-[12px] text-[#8a7b68]">
              {(doc.signature?.kitchens || []).length} kitchen sections · cover & closing stay on
              until you remove them
            </span>
            <button type="button" className={toolBtn} onClick={resetTemplate}>
              Reset template
            </button>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');
        .catalog-print-sheet {
          font-family: Montserrat, "Segoe UI", Arial, sans-serif;
        }
        .catalog-print-sheet.is-signature {
          background: #e9eff1;
          gap: 0;
        }
        .catalog-print-sheet.is-signature.space-y-4 {
          row-gap: 0;
        }
        .catalog-print-sheet.is-signature > :not([hidden]) ~ :not([hidden]) {
          margin-top: 0;
        }
        .catalog-page {
          width: 100%;
          max-width: 297mm;
          min-height: 210mm;
          margin: 0 auto 16px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(28,22,16,0.08);
        }
        .is-signature .catalog-page {
          margin-bottom: 0;
          box-shadow: none;
          border: 0;
        }
        .catalog-cover {
          display: grid;
          grid-template-columns: 42% 58%;
          background: #000;
          color: #fff;
          min-height: 210mm;
        }
        .catalog-table-page {
          padding: 12px 14px 16px;
          background: #fff;
        }
        .catalog-table-page.variant-green { background: #00332b; }
        .catalog-table th,
        .catalog-table td {
          border: 1.2px solid #e2b84c;
          padding: 6px 8px;
          vertical-align: middle;
          font-size: 11px;
        }
        .variant-green .catalog-table th { background: #00332b; color: #f5e6c8; }
        .variant-yellow .catalog-table th { background: #f0c419; color: #111; }
        .variant-blue .catalog-table th { background: #9ec9e8; color: #111; }
        .catalog-table th {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-align: center;
        }
        .catalog-table td { background: #fffaf0; }
        .variant-blue .catalog-table td { background: #fff; }
        .col-sr { width: 48px; }
        .col-rate { width: 100px; }
        .col-model { width: 72px; }
        .col-pics { width: 38%; }
        .pic-grid img {
          height: 56px;
          width: auto;
          max-width: 96px;
          object-fit: cover;
          border: 1px solid #e2b84c;
          display: block;
        }
        .catalog-closing {
          background: #f0f2f5;
          min-height: 210mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 56px;
        }
        .catalog-logo-mark {
          width: 42px;
          height: 32px;
          flex-shrink: 0;
          object-fit: contain;
          display: block;
        }
        .catalog-logo-placeholder {
          border: 1.5px dashed #c4a574;
          border-radius: 4px;
          background: rgba(196, 165, 116, 0.12);
        }
        .catalog-table-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        /* Match signature-series.pdf: landscape 297×210mm, light grey page */
        .catalog-signature-hero,
        .catalog-signature-specs {
          width: 100%;
          max-width: 297mm;
          min-height: 210mm;
          margin: 0 auto;
          background: #e9eff1;
          color: #213141;
          padding: 12px 16px 14px;
          box-sizing: border-box;
          box-shadow: none;
          border: 0;
        }
        .signature-hero-inner,
        .signature-specs-inner {
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .signature-kitchen-block {
          display: flex;
          flex-direction: column;
          gap: 0;
          background: #e9eff1;
        }
        .signature-kitchen-block > .catalog-page {
          margin: 0 auto;
        }
        /* no-print toolbars between pages leave a white strip — match page bg */
        .is-signature .no-print {
          background: #e9eff1;
        }
        .signature-hero-top,
        .signature-specs-header {
          display: grid;
          grid-template-columns: 130px 1fr 130px;
          align-items: center;
          margin-bottom: 8px;
        }
        .signature-logo-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: flex-start;
        }
        .signature-logo-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .signature-logo {
          height: 36px;
          width: auto;
          object-fit: contain;
        }
        .signature-logo-fallback {
          display: flex;
          flex-direction: column;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          line-height: 1.15;
          color: #213141;
          text-align: left;
        }
        .signature-logo-fallback span {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #c4a574;
        }
        .signature-title-wrap {
          text-align: center;
        }
        .signature-series-title {
          width: 100%;
          border: 0;
          background: transparent;
          text-align: center;
          font-family: "Times New Roman", Georgia, "Palatino Linotype", serif;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #213141;
          outline: none;
        }
        .signature-ornament {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 4px;
        }
        .signature-ornament-line {
          position: relative;
          width: 72px;
          height: 1.5px;
          background: #213141;
        }
        .signature-ornament-line::before,
        .signature-ornament-line::after {
          content: "";
          position: absolute;
          top: 50%;
          width: 5px;
          height: 5px;
          border: 1.2px solid #213141;
          border-radius: 50%;
          background: #e9eff1;
          transform: translateY(-50%);
        }
        .signature-ornament-line:first-child::before {
          left: -1px;
        }
        .signature-ornament-line:first-child::after {
          right: -1px;
          display: none;
        }
        .signature-ornament-line:last-child::before {
          display: none;
        }
        .signature-ornament-line:last-child::after {
          right: -1px;
        }
        .signature-ornament-diamond {
          width: 8px;
          height: 8px;
          border: 1.5px solid #213141;
          border-radius: 50%;
          background: #e9eff1;
          box-shadow: 0 0 0 3px #e9eff1, 0 0 0 4px #213141;
        }
        .signature-kitchen-name {
          width: 100%;
          border: 0;
          background: transparent;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          outline: none;
          margin: 2px 0 4px;
          color: #213141;
        }
        .signature-description {
          width: 100%;
          max-width: 92%;
          border: 0;
          background: transparent;
          font-size: 10.5px;
          line-height: 1.45;
          color: #222;
          outline: none;
          margin: 0 0 8px;
          min-height: 2.8em;
        }
        .signature-description strong {
          font-weight: 700;
          color: #111;
        }
        .signature-description:empty::before {
          content: attr(data-placeholder);
          color: #9aa7b5;
        }
        .signature-hero-media {
          width: 100%;
          flex: 1 1 auto;
          min-height: 118mm;
          overflow: hidden;
          background: transparent;
          line-height: 0;
        }
        .signature-hero-media img {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 118mm;
          object-fit: cover;
          object-position: center;
        }
        .signature-empty-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 100%;
          min-height: 118mm;
          padding: 24px 16px;
          border: 2px dashed #b7c0ca;
          border-radius: 4px;
          background:
            linear-gradient(180deg, #f4f7f9 0%, #e8eef2 100%);
          color: #5c6b7a;
          line-height: 1.35;
          text-align: center;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .signature-empty-hero:hover {
          border-color: #8a9aab;
          background: linear-gradient(180deg, #eef3f6 0%, #e2e9ef 100%);
        }
        .signature-empty-hero-icon {
          display: flex;
          width: 64px;
          height: 48px;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #9aa7b5;
          border-radius: 8px;
          color: #7a8794;
          background: rgba(255, 255, 255, 0.75);
        }
        .signature-empty-hero-title {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #2c3844;
        }
        .signature-empty-hero-sub {
          max-width: 320px;
          font-size: 12px;
          color: #7a8794;
        }
        .signature-empty-hero-cta {
          margin-top: 6px;
          display: inline-flex;
          height: 34px;
          align-items: center;
          padding: 0 14px;
          border-radius: 8px;
          background: #1f1710;
          color: #f3ebe0;
          font-size: 12px;
          font-weight: 600;
        }
        .signature-empty-slot {
          display: flex;
          height: 100%;
          min-height: 52px;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed #9aa7b5;
          color: #7a8794;
          font-size: 12px;
          background: #f7f7f7;
          line-height: normal;
        }
        .signature-specs-mid {
          display: grid;
          grid-template-columns: 1fr 168px;
          gap: 8px;
          flex: 0 1 auto;
          min-height: 0;
          align-items: stretch;
          margin-bottom: 0;
        }
        .signature-elevations {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 6px;
          min-height: 0;
        }
        .signature-elevation-card {
          border: 1px solid #c8c8c8;
          padding: 0;
          background: #fff;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .signature-elevation-title {
          width: 100%;
          border: 0;
          background: transparent;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          outline: none;
          margin-bottom: 2px;
          text-align: center;
          color: #213141;
        }
        .signature-elevation-media {
          flex: 1;
          min-height: 42mm;
          background: #fff;
          overflow: hidden;
        }
        .signature-elevation-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          background: #fff;
        }
        .signature-elevation-note {
          width: 100%;
          border: 0;
          background: transparent;
          font-size: 7.5px;
          color: #6b645b;
          outline: none;
          margin-top: 2px;
        }
        .signature-hardware {
          border: 1px solid #c5ccd3;
          background: #fff;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .signature-hardware-title {
          width: 100%;
          border: 0;
          background: #213141;
          color: #c5a059;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 7px 6px;
          outline: none;
          text-align: center;
        }
        .signature-hardware-list {
          list-style: none;
          margin: 0;
          padding: 6px 6px 4px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
          overflow: hidden;
        }
        .signature-hardware-item {
          display: flex;
          gap: 0;
          align-items: center;
        }
        .signature-hardware-thumb {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border: 1px solid #c8c8c8;
          overflow: hidden;
          background: #f4f4f4;
        }
        .signature-hardware-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .signature-hardware-rule {
          width: 1.5px;
          height: 28px;
          margin: 0 6px;
          background: #c5a059;
          flex-shrink: 0;
        }
        .signature-empty-mini {
          display: flex;
          height: 100%;
          align-items: center;
          justify-content: center;
          color: #b0a89d;
          font-size: 14px;
        }
        .signature-hardware-label {
          width: 100%;
          border: 0;
          background: transparent;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: #213141;
          outline: none;
        }
        .signature-price-wrap {
          margin-top: 28px;
          flex: 0 0 auto;
        }
        .signature-price-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        .signature-price-table th {
          background: #24190f;
          color: #fff;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 6px 6px;
          text-align: center;
          border-top: 1.5px solid #a68966;
          border-bottom: 1.5px solid #a68966;
          border-left: 1px solid #3a3228;
          border-right: 1px solid #3a3228;
        }
        .signature-price-table td {
          border: 1px solid #c8c8c8;
          padding: 3px 5px;
          text-align: center;
          background: #fff;
        }
        .signature-price-table tr.is-alt td {
          background: #f3f3f3;
        }
        .signature-price-input {
          width: 100%;
          border: 0;
          background: transparent;
          outline: none;
          font: inherit;
          text-align: center;
          color: #213141;
        }
        .signature-footer-logo {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: 4px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #213141;
        }
        .signature-footer-logo img {
          height: 26px;
          width: auto;
          object-fit: contain;
        }
        .signature-inline-btn {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #7a8794;
        }
      `}</style>

      <div
        className={`catalog-print-sheet min-h-0 flex-1 overflow-y-auto pb-8 ${
          doc.layoutMode === "signature" ? "is-signature" : "space-y-4"
        }`}
      >
        {doc.showCover ? (
          <section className="catalog-page catalog-cover relative">
            <div className="no-print absolute left-2 top-2 z-10 flex flex-wrap gap-1">
              <label className={`${toolBtn} cursor-pointer`}>
                Change cover image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    setCoverHero(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <button type="button" className={toolBtn} onClick={clearCoverHero}>
                Clear image
              </button>
              <button
                type="button"
                className={toolBtnDanger}
                onClick={() => patchDoc({ showCover: false })}
              >
                Remove cover
              </button>
            </div>
            <div className="catalog-cover-left flex flex-col justify-center px-10 py-12">
              <input
                value={doc.coverTitle}
                onChange={(e) => patchDoc({ coverTitle: e.target.value })}
                data-print-class="catalog-cover-title"
                className="catalog-cover-title w-full bg-transparent text-[56px] font-extrabold tracking-[0.08em] text-white outline-none"
              />
              <input
                value={doc.coverSubtitle}
                onChange={(e) => patchDoc({ coverSubtitle: e.target.value })}
                data-print-class="catalog-cover-subtitle"
                className="catalog-cover-subtitle mt-2 w-full bg-transparent text-[22px] font-semibold tracking-[0.28em] text-[#c4a574] outline-none"
              />
              <div className="catalog-cover-rule mt-8 h-0.5 w-12 bg-gradient-to-r from-[#c4a574] to-transparent" />
            </div>
            <div className="catalog-cover-right relative min-h-[210mm] overflow-hidden">
              {doc.coverHeroUrl ? (
                <img
                  src={doc.coverHeroUrl}
                  alt=""
                  className="cover-hero absolute inset-0 h-full w-full object-cover object-right"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#111] text-sm text-white/40">
                  No cover image
                </div>
              )}
              <div className="catalog-brand-badge absolute right-6 top-6 z-[2] flex flex-col items-end gap-1 text-right">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.logoUrl || DEFAULT_LOGO}
                  alt="Santoshi Interiors"
                  className="catalog-logo-mark h-10 w-auto"
                />
                <label className={`${toolBtn} no-print cursor-pointer`}>
                  Change logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setLogo(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <input
                  value={doc.brandTop}
                  onChange={(e) => patchDoc({ brandTop: e.target.value })}
                  data-print-class="catalog-brand-top"
                  className="catalog-brand-top w-40 bg-transparent text-right text-lg font-extrabold tracking-[0.12em] text-white outline-none"
                />
                <input
                  value={doc.brandBottom}
                  onChange={(e) => patchDoc({ brandBottom: e.target.value })}
                  data-print-class="catalog-brand-bottom"
                  className="catalog-brand-bottom w-40 bg-transparent text-right text-[11px] font-semibold tracking-[0.28em] text-[#c4a574] outline-none"
                />
              </div>
            </div>
          </section>
        ) : (
          <div className="no-print mx-auto max-w-[297mm]">
            <button type="button" className={toolBtn} onClick={() => patchDoc({ showCover: true })}>
              + Add cover page
            </button>
          </div>
        )}

        {doc.layoutMode === "signature" ? (
          <SignatureSeriesLayout
            doc={doc}
            onDoc={patchDoc}
            onSignature={patchSignature}
          />
        ) : (
          pagesWithRows.map(({ page, rows }, index) => (
            <TablePage
              key={page.id}
              page={page}
              pageIndex={index}
              pageCount={doc.pages.length}
              rows={rows}
              selectedIds={selectedIds}
              doc={doc}
              onDoc={patchDoc}
              onRow={updateRow}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onAddPic={addPic}
              onRemovePic={removePic}
              onUpdatePicLabel={updatePicLabel}
              onClearPics={clearPics}
              onInsertRow={insertRow}
              onDuplicateRow={duplicateRow}
              onRemoveRow={removeRow}
              onMoveRow={moveRow}
              onPatchPage={patchPage}
              onRemovePage={removePage}
              onMovePage={movePage}
            />
          ))
        )}

        <div className="no-print mx-auto flex max-w-[297mm] flex-wrap gap-2">
          <button type="button" className={toolBtn} onClick={() => addPage("green")}>
            + Green page
          </button>
          <button type="button" className={toolBtn} onClick={() => addPage("yellow")}>
            + Yellow page
          </button>
          <button type="button" className={toolBtn} onClick={() => addPage("blue")}>
            + Blue page
          </button>
        </div>

        {doc.showClosing ? (
          <section className="catalog-page catalog-closing relative">
            <div className="no-print absolute right-2 top-2">
              <button
                type="button"
                className={toolBtnDanger}
                onClick={() => patchDoc({ showClosing: false })}
              >
                Remove closing
              </button>
            </div>
            <input
              value={doc.closingHeadline}
              onChange={(e) => patchDoc({ closingHeadline: e.target.value })}
              data-print-class="closing-headline"
              className="closing-headline mb-4 w-full max-w-2xl bg-transparent text-center font-serif text-3xl text-[#2f343a] outline-none"
            />
            <textarea
              value={doc.closingBody}
              onChange={(e) => patchDoc({ closingBody: e.target.value })}
              data-print-class="closing-body"
              rows={4}
              className="closing-body mb-8 w-full max-w-xl resize-none bg-transparent text-center text-sm leading-relaxed text-[#6b7280] outline-none"
            />
            <div className="closing-visit mb-6 w-full max-w-3xl bg-[#e5e7eb] px-6 py-4">
              <input
                value={doc.visitTitle}
                onChange={(e) => patchDoc({ visitTitle: e.target.value })}
                data-print-class="closing-visit-title"
                className="closing-visit-title w-full bg-transparent text-center text-base font-extrabold tracking-[0.14em] outline-none"
              />
              <input
                value={doc.visitBody}
                onChange={(e) => patchDoc({ visitBody: e.target.value })}
                data-print-class="closing-visit-body"
                className="closing-visit-body mt-1 w-full bg-transparent text-center text-sm text-[#4b5563] outline-none"
              />
            </div>
            <input
              value={doc.websiteLabel}
              onChange={(e) => patchDoc({ websiteLabel: e.target.value })}
              data-print-class="closing-web-label"
              className="closing-web-label w-full max-w-md bg-transparent text-center text-sm font-bold tracking-[0.12em] outline-none"
            />
            <input
              value={doc.websiteUrl}
              onChange={(e) => patchDoc({ websiteUrl: e.target.value })}
              data-print-class="closing-web-url"
              className="closing-web-url mb-5 w-full max-w-md bg-transparent text-center text-sm text-[#374151] outline-none"
            />
            <input
              value={doc.followLabel}
              onChange={(e) => patchDoc({ followLabel: e.target.value })}
              data-print-class="closing-follow"
              className="closing-follow w-full max-w-md bg-transparent text-center text-sm font-bold tracking-[0.16em] text-[#9a7748] outline-none"
            />
            <input
              value={doc.followHandle}
              onChange={(e) => patchDoc({ followHandle: e.target.value })}
              data-print-class="closing-handle"
              className="closing-handle mb-8 w-full max-w-md bg-transparent text-center text-sm outline-none"
            />
            <input
              value={doc.experienceLabel}
              onChange={(e) => patchDoc({ experienceLabel: e.target.value })}
              data-print-class="closing-experience"
              className="closing-experience mb-6 w-full max-w-md bg-transparent text-center text-xs font-bold tracking-[0.14em] outline-none"
            />
            <input
              value={doc.tagline}
              onChange={(e) => patchDoc({ tagline: e.target.value })}
              data-print-class="closing-tagline"
              className="closing-tagline w-full max-w-xl bg-transparent text-center text-xs font-semibold tracking-[0.35em] text-[#4b5563] outline-none"
            />
          </section>
        ) : (
          <div className="no-print mx-auto max-w-[297mm]">
            <button
              type="button"
              className={toolBtn}
              onClick={() => patchDoc({ showClosing: true })}
            >
              + Add closing page
            </button>
          </div>
        )}
      </div>

      {updateConfirmOpen ? (
        <div
          className="no-print fixed inset-0 z-[100000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-update-confirm-title"
        >
          <button
            type="button"
            aria-label="Close"
            disabled={catalogBusy}
            className="absolute inset-0 bg-[#1a1510]/45 backdrop-blur-[2px] transition-opacity disabled:cursor-not-allowed"
            onClick={() => {
              if (!catalogBusy) setUpdateConfirmOpen(false);
            }}
          />
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] shadow-[0_24px_64px_rgba(26,21,16,0.28)] dark:border-[#3a342c] dark:bg-[#1c1814]">
            <div className="h-1 w-full bg-gradient-to-r from-[#2c241c] via-[#8a7b68] to-[#c4a574]" />
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2c241c] text-white shadow-sm dark:bg-[#c4a574] dark:text-[#1c1814]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 7h16M4 12h10M4 17h7M16 14l2 2 4-4"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    id="catalog-update-confirm-title"
                    className="text-base font-semibold tracking-tight text-[#2c241c] dark:text-[#f3ebe0]"
                  >
                    Update catalog data?
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#6b5f52] dark:text-[#b0a89d]">
                    Save edited prices and descriptions to{" "}
                    <span className="font-semibold text-[#2c241c] dark:text-[#f3ebe0]">
                      {doc.dataSource?.label || "linked catalog"}
                    </span>
                    . This overwrites the current catalog values.
                  </p>
                  {doc.dataSource?.kind ? (
                    <p className="mt-3 inline-flex items-center rounded-full border border-[#eadfcf] bg-white/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#161411] dark:text-[#b0a89d]">
                      {doc.dataSource.kind === "modular"
                        ? "Modular catalog"
                        : "Quotation catalog"}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={catalogBusy}
                  onClick={() => setUpdateConfirmOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-medium text-[#5c5348] transition hover:bg-[#f5f0e8] disabled:opacity-50 dark:border-[#3a342c] dark:bg-[#161411] dark:text-[#d4c8b8] dark:hover:bg-[#221c17]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={catalogBusy}
                  onClick={() => void persistCatalogData()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2c241c] px-4 text-sm font-semibold text-white transition hover:bg-[#3d3328] disabled:opacity-60 dark:bg-[#c4a574] dark:text-[#1c1814] dark:hover:bg-[#d4b888]"
                >
                  {catalogBusy ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-[#1c1814]/30 dark:border-t-[#1c1814]" />
                      Updating…
                    </>
                  ) : (
                    "Update data"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
