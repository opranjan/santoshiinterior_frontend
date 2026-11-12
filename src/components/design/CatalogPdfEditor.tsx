"use client";

import React, { useMemo, useState } from "react";
import { printCatalogPdf } from "@/lib/catalogPrint";
import {
  catalogId,
  createEmptyCatalogRow,
  createKitchenCatalogDefaults,
  renumberCatalogRows,
  type CatalogPageVariant,
  type CatalogPicture,
  type CatalogRow,
  type CatalogTablePage,
  type KitchenCatalogDoc,
} from "@/lib/kitchenCatalogDefaults";

const field =
  "w-full border-0 bg-transparent px-0 py-0 outline-none placeholder:text-black/30";
const area = `${field} resize-none leading-snug`;

const toolBtn =
  "inline-flex h-8 items-center rounded-lg border border-[#eadfcf] bg-white px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5c5348] hover:border-[#c4a574] hover:text-[#1c1610] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#d9d0c4]";
const toolBtnDark =
  "inline-flex h-8 items-center rounded-lg bg-[#1c1610] px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#e8d5b5] hover:bg-black disabled:opacity-40";
const toolBtnDanger =
  "inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-700 hover:bg-red-100 disabled:opacity-40";

function newPic(file: File): CatalogPicture {
  return {
    id: catalogId(),
    url: URL.createObjectURL(file),
  };
}

const DEFAULT_LOGO = "/images/logo/santoshi-mark.svg";

function revokeBlobUrl(url?: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function revokeRowPics(row: CatalogRow) {
  row.pictures.forEach((pic) => revokeBlobUrl(pic.url));
}

function normalizeDoc(doc: KitchenCatalogDoc): KitchenCatalogDoc {
  return {
    ...doc,
    logoUrl: doc.logoUrl ?? DEFAULT_LOGO,
    coverHeroUrl: doc.coverHeroUrl ?? "",
    showCover: doc.showCover ?? true,
    showClosing: doc.showClosing ?? true,
    pages: doc.pages ?? [],
    rows: doc.rows ?? [],
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
            {doc.logoUrl ? (
              <img src={doc.logoUrl} alt="" className="catalog-logo-mark" />
            ) : (
              <div className="catalog-logo-mark catalog-logo-placeholder no-print" />
            )}
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
    commit((prev) => {
      revokeBlobUrl(prev.logoUrl);
      return { ...prev, logoUrl: "" };
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="no-print mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#b0a89d]">
            Design · Catalog
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-[#111111] dark:text-white">
            Catalog PDF Editor
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#8a7b68]">
            Full controls for Kitchen Collection PDF — pages, rows, images, cover & closing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/templates/kitchen-collection-material-sheet.pdf"
            target="_blank"
            rel="noreferrer"
            className={toolBtn}
          >
            Original PDF
          </a>
          <button
            type="button"
            className={toolBtnDark}
            onClick={() => void printCatalogPdf("KITCHEN COLLECTION material sheet")}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Editor toolbar */}
      <div className="no-print mb-3 sticky top-0 z-20 space-y-2 rounded-xl border border-[#eadfcf] bg-[#fbf8f3]/95 p-2 shadow-sm backdrop-blur dark:border-[#3a342c] dark:bg-[#161411]/95">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b0a89d]">
            Document
          </span>
          <button type="button" className={toolBtn} disabled={!history.length} onClick={undo}>
            Undo
          </button>
          <button type="button" className={toolBtn} disabled={!future.length} onClick={redo}>
            Redo
          </button>
          <ToolSep />
          <label className={`${toolBtn} cursor-pointer gap-1`}>
            <input
              type="checkbox"
              checked={doc.showCover}
              onChange={(e) => patchDoc({ showCover: e.target.checked })}
            />
            Cover
          </label>
          <label className={`${toolBtn} cursor-pointer gap-1`}>
            <input
              type="checkbox"
              checked={doc.showClosing}
              onChange={(e) => patchDoc({ showClosing: e.target.checked })}
            />
            Closing
          </label>
          <ToolSep />
          <label className={`${toolBtn} cursor-pointer gap-1.5`}>
            {doc.logoUrl ? (
              <img src={doc.logoUrl} alt="" className="h-5 w-5 object-contain" />
            ) : null}
            {doc.logoUrl ? "Change logo" : "Add logo"}
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
          <button
            type="button"
            className={toolBtn}
            disabled={!doc.logoUrl}
            onClick={clearLogo}
          >
            Remove logo
          </button>
          <button type="button" className={toolBtn} onClick={resetDefaultLogo}>
            Default logo
          </button>
          <ToolSep />
          <button type="button" className={toolBtn} onClick={() => addPage("yellow")}>
            + Table page
          </button>
          <button type="button" className={toolBtn} onClick={renumberAll}>
            Renumber SR
          </button>
          <button type="button" className={toolBtn} onClick={resetTemplate}>
            Reset template
          </button>
          <button type="button" className={toolBtnDanger} onClick={clearAllRows}>
            Clear rows
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b0a89d]">
            Selection
          </span>
          <span className="text-[11px] text-[#8a7b68]">
            {selectedIds.size} selected · {doc.rows.length} rows · {doc.pages.length} pages
          </span>
          <ToolSep />
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
            Delete selected
          </button>
          <button
            type="button"
            className={toolBtn}
            disabled={!selectedIds.size}
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
          <ToolSep />
          <button
            type="button"
            className={toolBtn}
            onClick={() => {
              const last = doc.pages[doc.pages.length - 1];
              if (last) insertRow(last.id);
              else addPage("yellow");
            }}
          >
            + Add item
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');
        .catalog-print-sheet {
          font-family: Montserrat, "Segoe UI", Arial, sans-serif;
        }
        .catalog-page {
          width: 100%;
          max-width: 297mm;
          min-height: 210mm;
          margin: 0 auto 16px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(28,22,16,0.08);
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
      `}</style>

      <div className="catalog-print-sheet min-h-0 flex-1 space-y-4 overflow-y-auto pb-8">
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
                {doc.logoUrl ? (
                  <img src={doc.logoUrl} alt="" className="catalog-logo-mark h-8 w-auto" />
                ) : null}
                <label className={`${toolBtn} no-print cursor-pointer`}>
                  {doc.logoUrl ? "Change logo" : "Add logo"}
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

        {pagesWithRows.map(({ page, rows }, index) => (
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
        ))}

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
    </div>
  );
}
