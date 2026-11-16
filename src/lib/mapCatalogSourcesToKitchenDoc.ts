import { designAssetUrl } from "@/lib/designAssets";
import {
  catalogId,
  cloneHardware,
  createBlankElevations,
  createDefaultHardware,
  createEmptyHardware,
  createEmptyKitchenPage,
  createEmptyPriceRow,
  createSignatureSeriesDefaults,
  isKnownSignatureKitchen,
  kitchenSlugFromName,
  renumberCatalogRows,
  sanitizeElevations,
  type CatalogPageVariant,
  type CatalogPicture,
  type CatalogRow,
  type CatalogTablePage,
  type KitchenCatalogDoc,
  type SignatureHardware,
  type SignatureKitchenPage,
} from "@/lib/kitchenCatalogDefaults";
import type {
  ModularCatalog,
  ModularCatalogItem,
  ModularSeries,
  ModularSizeItem,
} from "@/services/crmApi";

export type QuotationCatalogItemLike = {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  specification?: string;
  price?: number | string;
  uom?: string;
  imageUrl?: string | null;
  sortOrder?: number;
};

export type QuotationCatalogLike = {
  id?: string;
  name?: string;
  description?: string;
  catalogItems?: QuotationCatalogItemLike[];
  items?: QuotationCatalogItemLike[] | number;
};

const ROWS_PER_PAGE = 4;
const VARIANTS: CatalogPageVariant[] = ["green", "yellow", "yellow", "blue", "blue", "blue", "blue"];

function formatRate(price: number | string | undefined, uom?: string) {
  const n = typeof price === "number" ? price : Number(price);
  const amount = Number.isFinite(n) ? String(Math.round(n)) : String(price || "").trim();
  const unit = String(uom || "").trim().toUpperCase();
  if (!amount && !unit) return "";
  if (!unit) return amount;
  if (!amount) return unit;
  return `${amount} ${unit}`;
}

function rowDescription(item: QuotationCatalogItemLike) {
  const name = String(item.name || "").trim();
  const description = String(item.description || "").trim();
  const specification = String(item.specification || "").trim();
  const parts = [name, description, specification].filter(Boolean);
  // Prefer BOQ-style text: description/spec first when name is short accessory label
  if (description && name && description.length > name.length) {
    return [description, specification].filter(Boolean).join("\n");
  }
  return parts.join(" — ");
}

function picturesFromUrl(url?: string | null): CatalogPicture[] {
  const resolved = designAssetUrl(url);
  if (!resolved) return [];
  return [{ id: catalogId(), url: resolved }];
}

function chunkIntoPages(items: QuotationCatalogItemLike[]): {
  pages: CatalogTablePage[];
  rows: CatalogRow[];
} {
  const pages: CatalogTablePage[] = [];
  const rows: CatalogRow[] = [];
  if (!items.length) {
    const pageId = catalogId();
    pages.push({ id: pageId, variant: "green", showIntro: true });
    return { pages, rows };
  }

  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    const slice = items.slice(i, i + ROWS_PER_PAGE);
    const pageIndex = pages.length;
    const pageId = catalogId();
    pages.push({
      id: pageId,
      variant: VARIANTS[Math.min(pageIndex, VARIANTS.length - 1)] || "yellow",
      showIntro: pageIndex === 0,
    });
    slice.forEach((item, idx) => {
      const sr = i + idx + 1;
      const code = String(item.code || "").trim();
      rows.push({
        id: catalogId(),
        pageId,
        sr,
        model: code || `E${sr}`,
        rate: formatRate(item.price, item.uom),
        description: rowDescription(item),
        pictures: picturesFromUrl(item.imageUrl),
        sourceItemId: item.id ? String(item.id) : undefined,
        sourceCatalogId: undefined,
      });
    });
  }

  return { pages, rows: renumberCatalogRows(rows) };
}

export function extractQuotationItems(catalog: QuotationCatalogLike | null | undefined) {
  if (!catalog) return [] as QuotationCatalogItemLike[];
  const raw = Array.isArray(catalog.catalogItems)
    ? catalog.catalogItems
    : Array.isArray(catalog.items)
      ? catalog.items
      : [];
  return [...raw].sort((a, b) => {
    const ao = Number(a.sortOrder);
    const bo = Number(b.sortOrder);
    if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return ao - bo;
    return String(a.code || a.name || "").localeCompare(String(b.code || b.name || ""));
  });
}

/** Replace PDF table pages/rows from a quotation catalog (master line items). */
export function applyQuotationCatalogToDoc(
  doc: KitchenCatalogDoc,
  catalog: QuotationCatalogLike
): KitchenCatalogDoc {
  const items = extractQuotationItems(catalog);
  const catalogIdStr = catalog.id ? String(catalog.id) : "";
  const { pages, rows: rawRows } = chunkIntoPages(items);
  const rows = rawRows.map((row) => ({
    ...row,
    sourceCatalogId: catalogIdStr || row.sourceCatalogId,
  }));
  const name = String(catalog.name || "").trim();
  const description = String(catalog.description || "").trim();

  return {
    ...doc,
    layoutMode: "material",
    dataSource: {
      kind: "quotation",
      quotationCatalogId: catalogIdStr || undefined,
      label: name || "Quotation catalog",
    },
    coverTitle: doc.coverTitle || "CATALOG",
    coverSubtitle: name ? name.toUpperCase() : doc.coverSubtitle,
    sectionBanner: name ? name.toUpperCase() : doc.sectionBanner,
    sectionTag: "QUOTATION CATALOG",
    closingBody: description || doc.closingBody,
    pages,
    rows,
  };
}

/** Apply modular catalog branding (cover / section) without touching rows. */
export function applyModularBrandingToDoc(
  doc: KitchenCatalogDoc,
  catalog: ModularCatalog,
  seriesName?: string
): KitchenCatalogDoc {
  const name = String(catalog.name || "").trim();
  const inclusions = String(catalog.inclusions || "").trim();
  const description = String(catalog.description || "").trim();
  return {
    ...doc,
    coverTitle: seriesName?.trim() ? seriesName.trim().toUpperCase() : doc.coverTitle,
    coverSubtitle: name ? name.toUpperCase() : doc.coverSubtitle,
    sectionBanner: name ? name.toUpperCase() : doc.sectionBanner,
    sectionTag: "MODULAR PRODUCT",
    closingBody: [description, inclusions].filter(Boolean).join("\n\n") || doc.closingBody,
  };
}

function partToItem(part: ModularSizeItem): QuotationCatalogItemLike {
  return {
    id: part.id,
    name: part.name,
    code: part.code,
    description: part.description || part.name,
    price: part.amount,
    uom: part.uom || (part.qty ? `QTY ${part.qty}` : "NOS"),
  };
}

/** Import modular size package + BOM parts as PDF rows (append or replace). */
export function applyModularItemToDoc(
  doc: KitchenCatalogDoc,
  catalog: ModularCatalog,
  item: ModularCatalogItem,
  mode: "replace" | "append" = "replace",
  seriesName?: string
): KitchenCatalogDoc {
  const packageLine: QuotationCatalogItemLike = {
    id: item.id,
    name: item.name,
    code: item.code,
    description:
      item.description ||
      `${item.name}${item.areaSqFt ? ` — ${item.areaSqFt} sq.ft package` : ""}`,
    price: item.price,
    uom: item.uom || "SQ FT",
  };
  const parts = [...(item.parts || [])]
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(partToItem);
  const items = [packageLine, ...parts];

  if (mode === "append" && doc.pages.length && doc.rows.length) {
    const startSr = doc.rows.reduce((max, row) => Math.max(max, row.sr), 0);
    const pageId = catalogId();
    const pages = [
      ...doc.pages,
      { id: pageId, variant: "yellow" as CatalogPageVariant, showIntro: false },
    ];
    const newRows: CatalogRow[] = items.map((entry, idx) => ({
      id: catalogId(),
      pageId,
      sr: startSr + idx + 1,
      model: String(entry.code || "").trim() || `E${startSr + idx + 1}`,
      rate: formatRate(entry.price, entry.uom),
      description: rowDescription(entry),
      pictures: [],
      sourceItemId: entry.id ? String(entry.id) : undefined,
      sourceCatalogId: catalog.id,
    }));
    return {
      ...applyModularBrandingToDoc(
        {
          ...doc,
          pages,
          rows: renumberCatalogRows([...doc.rows, ...newRows]),
        },
        catalog,
        seriesName
      ),
      dataSource: {
        kind: "modular-package",
        modularCatalogId: catalog.id,
        label: `${seriesName || "Modular"} · ${catalog.name}`,
      },
    };
  }

  const { pages, rows: rawRows } = chunkIntoPages(items);
  const rows = rawRows.map((row) => ({
    ...row,
    sourceCatalogId: catalog.id,
  }));
  return {
    ...applyModularBrandingToDoc({ ...doc, pages, rows }, catalog, seriesName),
    dataSource: {
      kind: "modular-package",
      modularCatalogId: catalog.id,
      label: `${seriesName || "Modular"} · ${catalog.name}`,
    },
  };
}

function formatInr(amount: number) {
  if (!Number.isFinite(amount)) return "";
  return `₹${Math.round(amount).toLocaleString("en-IN")}/-`;
}

function kitchenImageForCatalog(_name: string, fallbackUrl?: string) {
  // Never auto-fill brochure banner crops — hero stays empty until user uploads
  const raw = String(fallbackUrl || "").trim();
  if (/\/templates\/kitchen-/i.test(raw) || /\/templates\/signature-hero/i.test(raw)) {
    return "";
  }
  return raw;
}

function matchKitchenFallback(
  catalogName: string,
  defaults: SignatureKitchenPage[]
): SignatureKitchenPage | undefined {
  const n = String(catalogName || "").toLowerCase().trim();
  if (!n || !isKnownSignatureKitchen(n)) return undefined;
  return defaults.find((kitchen) => {
    const h = kitchen.heading.toLowerCase();
    if (/signature kitchen|smart storage/i.test(n)) return /smart storage/i.test(h);
    if (/sage/i.test(n)) return /sage/i.test(h);
    if (/taupe/i.test(n)) return /taupe/i.test(h);
    if (/urban|grey|gray/i.test(n)) return /urban|grey|gray/i.test(h);
    return false;
  });
}

function catalogToKitchenPage(
  catalog: ModularCatalog,
  fallback?: SignatureKitchenPage
): SignatureKitchenPage {
  const sizes = [...(catalog.items || [])].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.code).localeCompare(String(b.code))
  );
  // Only real modular size packages — never invent E1–E5 for empty catalogs (e.g. TEST)
  const priceRows = sizes.map((size, index) => ({
    ...createEmptyPriceRow(index + 1),
    sr: index + 1,
    model: size.code || size.name || `E${index + 1}`,
    area: size.areaSqFt ? `${size.areaSqFt} (SQ.FT)` : size.uom || "",
    amount: formatInr(Number(size.price) || 0),
    sourceItemId: size.id ? String(size.id) : undefined,
  }));
  const heading =
    /signature kitchen/i.test(catalog.name || "")
      ? "SMART STORAGE. MODERN LIVING"
      : catalog.name || fallback?.heading || "Kitchen";
  const plain = String(catalog.description || "").trim();
  const description =
    plain && !plain.includes("<strong>")
      ? plain.replace(
          /(with\s+)(.+?)(,\s*complete as per)/i,
          "$1<strong>$2,</strong>$3"
        )
      : plain || (fallback ? fallback.description : "") || "";
  const slug = kitchenSlugFromName(catalog.name || heading);
  const known = Boolean(fallback) || isKnownSignatureKitchen(catalog.name || heading);
  const empty = createEmptyKitchenPage(heading);
  const hardwareFromParts = hardwareFromItemParts(catalog);
  const savedBanner = String(catalog.bannerImageUrl || "").trim();
  const savedLayout = catalog.pdfLayout;
  const savedElevations = Array.isArray(savedLayout?.elevations)
    ? sanitizeElevations(
        savedLayout.elevations.map((row) => ({
          id: row.id || catalogId(),
          title: String(row.title || ""),
          note: String(row.note || ""),
          imageUrl: String(row.imageUrl || "").trim(),
        }))
      )
    : null;
  const savedHardware = Array.isArray(savedLayout?.hardware)
    ? savedLayout.hardware.map((row) => ({
        id: row.id || catalogId(),
        label: String(row.label || ""),
        imageUrl: String(row.imageUrl || "").trim(),
      }))
    : null;
  return {
    ...(fallback || empty),
    id: fallback?.id || catalogId(),
    heading,
    description,
    imageUrl: kitchenImageForCatalog(
      catalog.name || heading,
      savedBanner || fallback?.imageUrl
    ),
    show: true,
    sourceCatalogId: catalog.id ? String(catalog.id) : fallback?.sourceCatalogId,
    // Prefer saved PDF layout elevations; otherwise four empty upload slots
    elevations: savedElevations || createBlankElevations(4),
    hardware: savedHardware?.length
      ? savedHardware
      : hardwareFromParts.length
        ? hardwareFromParts
        : known
          ? cloneHardware(
              fallback?.hardware?.length
                ? fallback.hardware
                : slug
                  ? createDefaultHardware(slug)
                  : []
            )
          : [],
    priceRows,
  };
}

function hardwareThumbForLabel(label: string): string {
  const n = label.toLowerCase();
  if (/tandem|tendom/.test(n)) return "/templates/hw-tandem.png";
  if (/organizer/.test(n)) return "/templates/hw-organizer.png";
  if (/thali|cup|saucer/.test(n)) return "/templates/hw-thali.png";
  if (/led/.test(n)) return "/templates/hw-led.png";
  if (/bottle/.test(n)) return "/templates/hw-bottle.png";
  if (/socket/.test(n)) return "/templates/hw-socket.png";
  return "";
}

function hardwareFromItemParts(catalog: ModularCatalog): SignatureHardware[] {
  for (const item of catalog.items || []) {
    if ((item.parts || []).length) {
      return item.parts
        .filter((part) => !/pu shutter/i.test(String(part.name || "")))
        .map((part) => {
          const label = String(part.name || "").toUpperCase();
          return {
            ...createEmptyHardware(label),
            label,
            imageUrl: hardwareThumbForLabel(label),
          };
        });
    }
  }
  return [];
}

function hardwareFromCatalogs(catalogs: ModularCatalog[]) {
  for (const catalog of catalogs) {
    const rows = hardwareFromItemParts(catalog);
    if (rows.length) return rows;
  }
  return null;
}

/** Fill Signature Series layout from one modular catalog + selected package. */
export function applyModularToSignatureDoc(
  doc: KitchenCatalogDoc,
  catalog: ModularCatalog,
  item: ModularCatalogItem,
  seriesName?: string
): KitchenCatalogDoc {
  const branded = applyModularBrandingToDoc(doc, catalog, seriesName);
  const defaults = createSignatureSeriesDefaults();
  const base = branded.signature || defaults;
  const existing = base.kitchens?.length ? base.kitchens : defaults.kitchens;
  const fallback = matchKitchenFallback(catalog.name, existing) || existing[0];
  const matchIndex = existing.findIndex((kitchen) => kitchen.id === fallback?.id);
  const nextKitchen = catalogToKitchenPage(catalog, fallback);
  const kitchens =
    matchIndex >= 0
      ? existing.map((kitchen, index) => (index === matchIndex ? nextKitchen : kitchen))
      : [...existing, nextKitchen];
  const first = kitchens[0];

  return {
    ...branded,
    layoutMode: "signature",
    showCover: branded.showCover !== false,
    showClosing: branded.showClosing !== false,
    dataSource: {
      kind: "modular-package",
      modularCatalogId: catalog.id,
      label: `${seriesName || "Modular"} · ${catalog.name}`,
    },
    signature: {
      ...base,
      seriesTitle: (seriesName || base.seriesTitle || "SIGNATURE SERIES").toUpperCase(),
      kitchens,
      kitchenName: first.heading,
      description: first.description,
      heroImageUrl: first.imageUrl,
      priceRows: first.priceRows,
      elevations: first.elevations?.length ? first.elevations : base.elevations,
      hardwareTitle: base.hardwareTitle || "HARDWARE FITTINGS USED",
      hardware: first.hardware?.length ? first.hardware : base.hardware,
      showHeroPage: true,
      showSpecsPage: true,
      showElevations: true,
      showHardware: true,
      showPriceTable: true,
    },
  };
}

/** Wire full Signature Series (all kitchens + E1–E5) into the brochure layout. */
export function applySignatureSeriesToDoc(
  doc: KitchenCatalogDoc,
  series: ModularSeries
): KitchenCatalogDoc {
  const defaults = createSignatureSeriesDefaults();
  const catalogs = [...(series.catalogs || [])].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );
  if (!catalogs.length) {
    return {
      ...doc,
      layoutMode: "signature",
      showCover: doc.showCover !== false,
      showClosing: doc.showClosing !== false,
      signature: defaults,
    };
  }

  const kitchens = catalogs.map((catalog) => {
    const fallback = matchKitchenFallback(catalog.name, defaults.kitchens);
    return catalogToKitchenPage(catalog, fallback);
  });
  const first = kitchens[0];
  const branded = applyModularBrandingToDoc(doc, catalogs[0], series.name);

  return {
    ...branded,
    layoutMode: "signature",
    showCover: branded.showCover !== false,
    showClosing: branded.showClosing !== false,
    dataSource: {
      kind: "modular-series",
      modularSeriesId: series.id,
      label: series.name || "Signature Series",
    },
    coverTitle: "KITCHEN",
    coverSubtitle: "COLLECTION",
    sectionBanner: "SIGNATURE SERIES",
    sectionTag: "MODULAR PRODUCT",
    signature: {
      ...defaults,
      ...branded.signature,
      seriesTitle: (series.name || "SIGNATURE SERIES").toUpperCase(),
      kitchens,
      kitchenName: first.heading,
      description: first.description,
      heroImageUrl: first.imageUrl,
      priceRows: first.priceRows,
      hardwareTitle: defaults.hardwareTitle,
      hardware: first.hardware?.length
        ? first.hardware
        : hardwareFromCatalogs(catalogs) || defaults.hardware,
      elevations: first.elevations?.length
        ? first.elevations
        : defaults.elevations,
      showHeroPage: true,
      showSpecsPage: true,
      showElevations: true,
      showHardware: true,
      showPriceTable: true,
    },
  };
}

export function findSignatureSeries(seriesList: ModularSeries[]): ModularSeries | null {
  return (
    seriesList.find((row) => /signature/i.test(row.name || "")) ||
    seriesList.find((row) =>
      (row.catalogs || []).some((catalog) => /sage|taupe|urban|signature kitchen/i.test(catalog.name || ""))
    ) ||
    null
  );
}
