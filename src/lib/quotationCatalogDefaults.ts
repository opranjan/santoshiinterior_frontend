export type CatalogItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  subCategory?: string;
  description: string;
  specification?: string;
  price: number;
  uom: string;
  imageUrl?: string;
  margin?: number;
  marginUnit?: "%" | "INR";
  discount?: number;
  discountUnit?: "%" | "INR";
  tax?: string;
  hsnCode?: string;
  bom?: CatalogItemBom;
};

export type BomLine = {
  id: string;
  name: string;
  remarks: string;
  qty: number;
  uom: string;
  lpc: number;
};

export type CatalogItemBom = {
  outputQty: number;
  materials: BomLine[];
  labour: BomLine[];
  machines: BomLine[];
};

export type CatalogRecord = {
  id: string;
  name: string;
  description: string;
  items: number;
  isDefault?: boolean;
  margin?: number;
  marginUnit?: "%" | "INR";
  discount?: number;
  discountUnit?: "%" | "INR";
  tax?: string;
  hsnCode?: string;
  catalogItems?: CatalogItem[];
};

export type CategoryRecord = {
  id: string;
  name: string;
  description?: string;
  subCategories: string[];
};

export type UomRecord = {
  id: string;
  name: string;
  abbreviation: string;
};

export type QuotationCatalogSettings = {
  catalogs: CatalogRecord[];
  categories: CategoryRecord[];
  uoms: UomRecord[];
};

export const QUOTATION_CATALOGS_KEY = "quotation-catalogs";

export const defaultKitchenItems: CatalogItem[] = [
  {
    id: "i1",
    name: "ebco pro motion drawer",
    code: "",
    category: "Kitchen collection 25 inspired living / Santoshi interior",
    description: "pmds1 -50-s3",
    price: 18232,
    uom: "NOS",
  },
  {
    id: "i2",
    name: "Kitchen cutlery tray",
    code: "",
    category: "Kitchen collection 25 inspired living / Santoshi interior",
    description: "",
    price: 728,
    uom: "NOS",
  },
  {
    id: "i3",
    name: "Kitchen drawer rack - thali",
    code: "",
    category: "Kitchen collection 25 inspired living / Santoshi interior",
    description: "",
    price: 1287,
    uom: "NOS",
  },
  {
    id: "i4",
    name: "plastic wicker basket soft close",
    code: "",
    category: "Kitchen collection 25 inspired living / Santoshi interior",
    description: "",
    price: 18300,
    uom: "NOS",
  },
  {
    id: "i5",
    name: "Bottle pullout",
    code: "",
    category: "Kitchen collection 25 inspired living / Santoshi interior",
    description: "",
    price: 8329,
    uom: "NOS",
  },
];

export const defaultQuotationCatalogSettings: QuotationCatalogSettings = {
  catalogs: [
    {
      id: "cat-1",
      name: "kitchen fittings",
      description: "Default quotation list",
      items: 5,
      isDefault: true,
      catalogItems: defaultKitchenItems,
    },
    {
      id: "cat-2",
      name: "Plywood",
      description: "Plywood catalog",
      items: 0,
      catalogItems: [],
    },
    {
      id: "cat-3",
      name: "Hardware",
      description: "Hardware catalog",
      items: 0,
      catalogItems: [],
    },
    {
      id: "cat-4",
      name: "Electrical",
      description: "",
      items: 0,
      catalogItems: [],
    },
    {
      id: "cat-5",
      name: "Laminate",
      description: "",
      items: 0,
      catalogItems: [],
    },
    {
      id: "cat-6",
      name: "Glass",
      description: "",
      items: 0,
      catalogItems: [],
    },
    {
      id: "cat-7",
      name: "Plywood Description 2026 for selling",
      description: "",
      items: 0,
      catalogItems: [],
    },
    {
      id: "cat-8",
      name: "Stone / Quartz",
      description: "",
      items: 0,
      catalogItems: [],
    },
    {
      id: "cat-9",
      name: "Paint & Finish",
      description: "",
      items: 0,
      catalogItems: [],
    },
  ],
  categories: [
    {
      id: "c1",
      name: "Asian Paints Smart Care Damp Proof Ultra",
      subCategories: [],
    },
    {
      id: "c2",
      name: "Coating with thin cement layer",
      subCategories: [],
    },
    {
      id: "c3",
      name: "Kitchen collection 25 inspired living",
      subCategories: ["Base Units", "Wall Units"],
    },
    { id: "c4", name: "LOGO", subCategories: [] },
    { id: "c5", name: "myk arment arm grout", subCategories: [] },
    { id: "c6", name: "Non retainable", subCategories: [] },
    { id: "c7", name: "Scrubbing WALL", subCategories: ["Interior Walls"] },
    {
      id: "c8",
      name: "Walls with 2 coats of acrylic emulsion paint",
      subCategories: [],
    },
  ],
  uoms: [
    { id: "u1", name: "KG", abbreviation: "KG" },
    { id: "u2", name: "NOS", abbreviation: "NOS" },
    { id: "u3", name: "SQ MT", abbreviation: "SQ MT" },
    { id: "u4", name: "Sq Ft", abbreviation: "Sq Ft" },
    { id: "u5", name: "Sq ft", abbreviation: "Sq ft" },
    { id: "u6", name: "Sq. Ft", abbreviation: "Sq. Ft" },
    { id: "u7", name: "sq ft", abbreviation: "sq ft" },
  ],
};

function normalizeUnit(unit: unknown): "%" | "INR" {
  if (unit === "%" || unit === "INR") return unit;
  // Accept legacy rupee glyph / mojibake from older saves
  if (unit === "₹" || unit === "â‚¹" || unit === "Rs" || unit === "rs") {
    return "INR";
  }
  return "%";
}

function normalizeCatalogRecord(c: Partial<CatalogRecord> & { id?: string }): CatalogRecord {
  const catalogItems = Array.isArray(c.catalogItems) ? c.catalogItems : [];
  const name = String(c.name || "Untitled catalog");

  return {
    id: String(c.id || `cat-${Date.now()}`),
    name,
    description: String(c.description || ""),
    items: catalogItems.length || Number(c.items) || 0,
    isDefault: Boolean(c.isDefault),
    margin: Number(c.margin) || 0,
    marginUnit: normalizeUnit(c.marginUnit),
    discount: Number(c.discount) || 0,
    discountUnit: normalizeUnit(c.discountUnit),
    tax: String(c.tax || ""),
    hsnCode: String(c.hsnCode || ""),
    catalogItems,
  };
}

export function normalizeCatalogSettings(
  raw: unknown,
  options?: { useDefaults?: boolean }
): QuotationCatalogSettings {
  const useDefaults = options?.useDefaults !== false;
  const value =
    raw && typeof raw === "object"
      ? (raw as Partial<QuotationCatalogSettings>)
      : {};

  const hasCatalogs = Array.isArray(value.catalogs);
  const hasCategories = Array.isArray(value.categories);
  const hasUoms = Array.isArray(value.uoms);
  const fromApi = hasCatalogs || hasCategories || hasUoms;

  let catalogs: CatalogRecord[] = [];
  if (hasCatalogs) {
    catalogs = value.catalogs!.map((c) => normalizeCatalogRecord(c));
  } else if (useDefaults && !fromApi) {
    catalogs = defaultQuotationCatalogSettings.catalogs.map((c) =>
      normalizeCatalogRecord(c)
    );
  }

  // Only merge built-in fallbacks when not loading from API
  if (!fromApi && useDefaults) {
    const byId = new Set(catalogs.map((c) => c.id));
    const byName = new Set(catalogs.map((c) => c.name.toLowerCase()));
    for (const fallback of defaultQuotationCatalogSettings.catalogs) {
      if (!byId.has(fallback.id) && !byName.has(fallback.name.toLowerCase())) {
        catalogs = [...catalogs, normalizeCatalogRecord(fallback)];
        byId.add(fallback.id);
        byName.add(fallback.name.toLowerCase());
      }
    }
  }

  const categories =
    hasCategories
      ? value.categories!.map((c) => ({
          id: String(c.id || `c-${Date.now()}`),
          name: String(c.name || "Untitled"),
          description: c.description,
          subCategories: Array.isArray(c.subCategories) ? c.subCategories : [],
        }))
      : useDefaults && !fromApi
        ? defaultQuotationCatalogSettings.categories
        : [];

  const uoms =
    hasUoms
      ? value.uoms!.map((u) => ({
          id: String(u.id || `u-${Date.now()}`),
          name: String(u.name || ""),
          abbreviation: String(u.abbreviation || u.name || ""),
        }))
      : useDefaults && !fromApi
        ? defaultQuotationCatalogSettings.uoms
        : [];

  return { catalogs, categories, uoms };
}

function matchCatalog(
  list: CatalogRecord[],
  catalogId: string
): CatalogRecord | undefined {
  const decoded = decodeURIComponent(catalogId || "").trim();
  if (!decoded) return undefined;
  const lower = decoded.toLowerCase();
  const slug = lower.replace(/\s+/g, "-");
  return (
    list.find((c) => c.id === decoded) ||
    list.find((c) => c.id === catalogId) ||
    list.find((c) => c.name.toLowerCase() === lower) ||
    list.find((c) => c.name.toLowerCase().replace(/\s+/g, "-") === slug)
  );
}

export function findCatalog(
  settings: QuotationCatalogSettings,
  catalogId: string
): CatalogRecord | null {
  return matchCatalog(settings.catalogs, catalogId) || null;
}
