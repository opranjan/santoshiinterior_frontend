export type CatalogPicture = {
  id: string;
  url: string;
  label?: string;
};

export type CatalogPageVariant = "green" | "yellow" | "blue";

export type CatalogTablePage = {
  id: string;
  variant: CatalogPageVariant;
  showIntro: boolean;
};

export type CatalogRow = {
  id: string;
  pageId: string;
  sr: number;
  description: string;
  rate: string;
  model: string;
  pictures: CatalogPicture[];
  /** Quotation / modular catalog item id — used by Update data */
  sourceItemId?: string;
  sourceCatalogId?: string;
};

/** Signature Series modular showcase (hero + elevations + hardware + price table). */
export type SignatureElevation = {
  id: string;
  title: string;
  imageUrl: string;
  note: string;
};

export type SignatureHardware = {
  id: string;
  label: string;
  imageUrl: string;
};

export type SignaturePriceRow = {
  id: string;
  sr: number;
  model: string;
  area: string;
  amount: string;
  /** Modular catalog size/item id — used by Update data */
  sourceItemId?: string;
};

/** One kitchen showcase page: heading + description + image + elevations + hardware + E1–E5. */
export type SignatureKitchenPage = {
  id: string;
  heading: string;
  description: string;
  imageUrl: string;
  show: boolean;
  /** Layout drawings for this kitchen’s specs page (editable per section) */
  elevations: SignatureElevation[];
  /** Hardware fittings for this kitchen (differs across Signature kitchens) */
  hardware: SignatureHardware[];
  priceRows: SignaturePriceRow[];
  /** Modular catalog id for this kitchen — used by Update data */
  sourceCatalogId?: string;
};

export type SignatureSeriesBlock = {
  seriesTitle: string;
  /** @deprecated use kitchens[0]; kept for older saved docs */
  kitchenName: string;
  /** @deprecated use kitchens[0] */
  description: string;
  /** @deprecated use kitchens[0] */
  heroImageUrl: string;
  showHeroPage: boolean;
  showSpecsPage: boolean;
  showElevations: boolean;
  showHardware: boolean;
  showPriceTable: boolean;
  hardwareTitle: string;
  /** @deprecated use kitchens[].elevations — kept as fallback for older docs */
  elevations: SignatureElevation[];
  hardware: SignatureHardware[];
  /** @deprecated use kitchens[].priceRows */
  priceRows: SignaturePriceRow[];
  /** All Signature kitchens (SMART STORAGE, Sage, Taupe, Urban Grey, …) */
  kitchens: SignatureKitchenPage[];
};

export type CatalogLayoutMode = "material" | "signature";

/** Tracks which DB catalog the editor is editing (for Update data). */
export type CatalogDataSource = {
  kind: "quotation" | "modular-series" | "modular-package" | null;
  quotationCatalogId?: string;
  modularSeriesId?: string;
  modularCatalogId?: string;
  label?: string;
};

export type KitchenCatalogDoc = {
  /** material = Kitchen Collection table sheet; signature = modular series flyer */
  layoutMode: CatalogLayoutMode;
  /** Linked catalog source for persisting price/description edits */
  dataSource?: CatalogDataSource;
  brandTop: string;
  brandBottom: string;
  coverTitle: string;
  coverSubtitle: string;
  coverHeroUrl: string;
  /** Header / cover brand mark (SVG/PNG/JPG). */
  logoUrl: string;
  showCover: boolean;
  showClosing: boolean;
  sectionBanner: string;
  sectionTag: string;
  closingHeadline: string;
  closingBody: string;
  visitTitle: string;
  visitBody: string;
  websiteLabel: string;
  websiteUrl: string;
  followLabel: string;
  followHandle: string;
  experienceLabel: string;
  tagline: string;
  pages: CatalogTablePage[];
  rows: CatalogRow[];
  signature: SignatureSeriesBlock;
};

let _n = 0;
export const catalogId = () => `kc-${++_n}-${Math.random().toString(36).slice(2, 7)}`;

type SeedRow = Omit<CatalogRow, "id" | "pageId">;

const PAGE_SEEDS: Array<{
  variant: CatalogPageVariant;
  showIntro: boolean;
  rows: SeedRow[];
}> = [
  {
    variant: "green",
    showIntro: true,
    rows: [
      {
        sr: 1,
        model: "E1",
        rate: "1300 SQ FT",
        description:
          "Providing and fixing 18 mm plywood with wooden laminate press finish, soft-close hinges, edge banding, adhesives, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 2,
        model: "E2",
        rate: "1600 SQ FT",
        description:
          "Providing and fixing 18 mm plywood with premium PU paint finish, surface preparation, sanding, primer coating, smooth finishing, soft-close hinges, necessary hardware fittings, adhesives, cutting, edge finishing, assembly, installation, alignment and complete labour charges.",
        pictures: [],
      },
      {
        sr: 3,
        model: "E3",
        rate: "1600 SQ FT",
        description:
          "Providing and fixing 18 mm plywood with premium acrylic sheet finish, soft-close hinges, necessary hardware fittings, adhesives, cutting, edge finishing, assembly, installation, alignment and complete labour charges, finished as per approved colour and design.",
        pictures: [],
      },
      {
        sr: 4,
        model: "E4",
        rate: "1800 PER QTY",
        description:
          "Providing and fixing drawers from 18 mm plywood with laminate / PU / acrylic finish options, soft-close drawer channels, necessary hardware fittings, adhesives, cutting, edge finishing, assembly, installation, alignment and complete labour charges.",
        pictures: [],
      },
    ],
  },
  {
    variant: "yellow",
    showIntro: false,
    rows: [
      {
        sr: 5,
        model: "E5",
        rate: "500 SQ FT",
        description:
          "Providing and fixing 18 mm thick HDMRF board with decorative CNC cutting as per approved design, including premium PU paint finish, surface preparation, sanding, primer coating, smooth finishing, necessary hardware fittings, adhesives, cutting, edge finishing, assembly, installation, alignment and complete labour charges.",
        pictures: [],
      },
      {
        sr: 6,
        model: "E6",
        rate: "600 SQ FT",
        description:
          "Providing and fixing premium aluminium frame shutters with 12 mm thick fluted glass, including black powder-coated aluminium frame finish, warm-tone fluted glass as per approved design, necessary hardware fittings, glass beading, rubber gaskets, sealant, cutting, edge finishing, assembly, installation, alignment and complete labour charges.",
        pictures: [],
      },
      {
        sr: 7,
        model: "E7",
        rate: "600 SQ FT",
        description:
          "Providing and fixing premium 18 mm thick plywood with wooden laminate press finish and decorative CNC cutting as per approved design, including 12 mm thick warm-tone fluted glass fitted in CNC-cut wooden shutters, internal laminate finish, necessary hardware fittings, glass beading, rubber gaskets, adhesives, sealants, edge banding, precision CNC cutting, assembly, installation and alignment.",
        pictures: [],
      },
    ],
  },
  {
    variant: "yellow",
    showIntro: false,
    rows: [
      {
        sr: 8,
        model: "E8",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing slim tandem box with soft-close channel, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 9,
        model: "E9",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing universal magic corner unit with pull-out mechanism, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 10,
        model: "E10",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing bottle pullout unit with multi-storage shelves, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 11,
        model: "E11",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing pantry unit with multi-level storage shelves, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 12,
        model: "E12",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing swing corner unit with rotating shelves, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 13,
        model: "E13",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing wicker basket unit with sliding mechanism, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
    ],
  },
  {
    variant: "yellow",
    showIntro: false,
    rows: [
      {
        sr: 14,
        model: "E14",
        rate: "18000 QTY 1",
        description:
          "Providing and fixing premium glass pulldown unit, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 15,
        model: "E15",
        rate: "18000 QTY 1",
        description:
          "Providing and fixing PVC rolling shutter unit, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 16,
        model: "E16",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing cutlery tray with multi-compartment organizer, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 17,
        model: "E17",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing stainless steel dish rack (GIPT), including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 18,
        model: "E18",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing dustbin unit (swing & pullout), including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 19,
        model: "E19",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing thali, plate and saucer insert, including necessary hardware fittings, cutting, assembly, installation, alignment and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
      {
        sr: 20,
        model: "E20",
        rate: "1800 QTY 1",
        description:
          "Providing and fixing anti-skid drawer mat, including necessary cutting, assembly, installation and complete labour charges, finished as per approved design and actual site measurements.",
        pictures: [],
      },
    ],
  },
  {
    variant: "yellow",
    showIntro: false,
    rows: [
      {
        sr: 21,
        model: "E21",
        rate: "10000 / 20 SQFT",
        description:
          "Providing and fixing artificial marble as per approved design and actual site measurements, including necessary cutting, sizing, edge finishing, surface preparation, application of approved marble-fixing adhesive, proper alignment, levelling, joint filling, sealing, polishing, finishing, necessary materials, tools, transportation, installation and complete labour charges.",
        pictures: [],
      },
      {
        sr: 22,
        model: "E22",
        rate: "8000 / Lump Sum",
        description:
          "Providing and carrying out complete dismantling and demolition of existing kitchen structures, including breaking of brick/block walls, removal of existing granite/artificial marble countertops, wall and floor tiles, kitchen platforms, cabinets, shelves, sink, plumbing fittings, electrical fixtures, debris disposal, site cleaning, necessary tools, equipment, safety precautions and complete labour charges.",
        pictures: [],
      },
      {
        sr: 23,
        model: "E23",
        rate: "300 / RFT",
        description:
          "Providing and carrying out wall breaking, cutting, chasing and drilling for concealed electrical and plumbing points, including making grooves for PVC electrical conduits, switchboards, socket boxes, water supply pipes, drainage pipes, sink connections, cement mortar filling, surface levelling, finishing, debris removal, necessary tools and complete labour charges.",
        pictures: [],
      },
    ],
  },
  {
    variant: "blue",
    showIntro: false,
    rows: [
      {
        sr: 24,
        model: "E24",
        rate: "18000 QTY 1",
        description:
          'Kohler Strive™ Kitchen Sink | 1.2 mm Thick Stainless Steel Single Bowl with SilentShield™ | 10" Deep, Round Corners for Easy Cleaning | 30x18x10 inches, Brushed Matte Steel. Providing and fixing complete with necessary cutting, installation, plumbing connection, sealant and labour charges.',
        pictures: [],
      },
      {
        sr: 25,
        model: "E25",
        rate: "17000 QTY 1",
        description:
          'Kohler Strive™ Kitchen Sink | 1.2 mm Thick Stainless Steel Double Equal Bowl with SilentShield™ | 9" Deep, Round Corners for Easy Cleaning | 36x18x9 inches, Brushed Matte Steel. Providing and fixing complete with necessary cutting, installation, plumbing connection, sealant and labour charges.',
        pictures: [],
      },
      {
        sr: 26,
        model: "E26",
        rate: "8000 QTY 1",
        description:
          'Johnson Qubix Black Quartz Kitchen Sink with Waste Coupling | 24" x 18" x 9.5" | 5 Years Warranty | Durable and Stylish Quartz Sink for Modern Kitchens. Providing and fixing complete with necessary cutting, installation, plumbing connection, sealant and labour charges.',
        pictures: [],
      },
      {
        sr: 27,
        model: "E27",
        rate: "700 QTY 1",
        description:
          "SEER switch plate Black Modular Switch and Socket Combo, 16A Switch with 6/16A 3-Pin Socket, Gold Trim. Providing and fixing complete with necessary cutting, installation and labour charges.",
        pictures: [],
      },
      {
        sr: 28,
        model: "E28",
        rate: "800 RFT",
        description:
          "LED STRIP LIGHT — Providing and fixing LED strip light with aluminium profile, wiring, transformer and complete installation and labour charges as per approved design.",
        pictures: [],
      },
    ],
  },
];

export function createEmptyCatalogRow(pageId: string, sr: number): CatalogRow {
  return {
    id: catalogId(),
    pageId,
    sr,
    model: `E${sr}`,
    rate: "",
    description: "",
    pictures: [],
  };
}

export function createEmptyElevation(title = "KITCHEN ELEVATION"): SignatureElevation {
  return {
    id: catalogId(),
    title,
    imageUrl: "",
    note: "",
  };
}

export function createEmptyHardware(label = "Hardware item"): SignatureHardware {
  return {
    id: catalogId(),
    label,
    imageUrl: "",
  };
}

export function createEmptyPriceRow(sr: number): SignaturePriceRow {
  return {
    id: catalogId(),
    sr,
    model: `E${sr}`,
    area: "",
    amount: "",
  };
}

export function createPriceRowsFromAmounts(
  amounts: Array<{ model: string; area: string; amount: string; sr?: number }>
): SignaturePriceRow[] {
  return amounts.map((row, index) => ({
    ...createEmptyPriceRow(row.sr ?? index + 1),
    sr: row.sr ?? index + 1,
    model: row.model,
    area: row.area,
    amount: row.amount,
  }));
}

export type SignatureKitchenSlug = "smart" | "sage" | "taupe" | "urban";

/** True only for the four brochure kitchens — never treat custom catalogs (e.g. TEST) as these. */
export function isKnownSignatureKitchen(name?: string | null): boolean {
  const n = String(name || "").toLowerCase();
  return (
    /smart storage|signature kitchen/i.test(n) ||
    /sage/i.test(n) ||
    /taupe/i.test(n) ||
    /urban|grey|gray/i.test(n)
  );
}

export function kitchenSlugFromName(name?: string | null): SignatureKitchenSlug | null {
  const n = String(name || "").toLowerCase();
  if (/sage/i.test(n)) return "sage";
  if (/taupe/i.test(n)) return "taupe";
  if (/urban|grey|gray/i.test(n)) return "urban";
  if (/smart storage|signature kitchen/i.test(n)) return "smart";
  return null;
}

export function createBlankElevations(count = 4): SignatureElevation[] {
  return Array.from({ length: count }, () => createEmptyElevation(""));
}

/** True when url is a bundled brochure crop — not a user upload. */
export function isTemplateElevationUrl(url?: string | null): boolean {
  return /\/templates\/elev-/i.test(String(url || "").trim());
}

/** True when url is a bundled kitchen hero/banner crop — not a user upload. */
export function isTemplateKitchenBannerUrl(url?: string | null): boolean {
  return /\/templates\/kitchen-(smart-storage|sage-elegance|classic-taupe|urban-grey|cover-hero)/i.test(
    String(url || "").trim()
  ) || /\/templates\/signature-hero/i.test(String(url || "").trim());
}

/** Strip brochure banner images — empty until the user uploads. */
export function sanitizeKitchenBannerUrl(url?: string | null): string {
  const raw = String(url || "").trim();
  if (!raw || isTemplateKitchenBannerUrl(raw)) return "";
  return raw;
}

/**
 * Always at least 4 elevation slots for the specs grid.
 * Template brochure PNGs are stripped — empty upload slots instead.
 * User-uploaded / blob URLs are kept. Slot ids stay stable across renders.
 */
export function sanitizeElevations(
  list?: SignatureElevation[] | null
): SignatureElevation[] {
  const cleaned = (list || []).map((row) => {
    const url = String(row.imageUrl || "").trim();
    return {
      ...row,
      id: row.id || catalogId(),
      imageUrl: isTemplateElevationUrl(url) ? "" : url,
    };
  });
  if (!cleaned.length) return createBlankElevations(4);
  while (cleaned.length < 4) cleaned.push(createEmptyElevation(""));
  return cleaned;
}

/** @deprecated use createBlankElevations / sanitizeElevations — no default drawings */
export function createDefaultElevations(
  _slug?: SignatureKitchenSlug | string | null
): SignatureElevation[] {
  return createBlankElevations(4);
}

export function cloneElevations(
  list?: SignatureElevation[] | null,
  _slug?: SignatureKitchenSlug | string | null
): SignatureElevation[] {
  return sanitizeElevations(list);
}

export function createDefaultHardware(
  slug: SignatureKitchenSlug | string | null = "smart"
): SignatureHardware[] {
  const resolved: SignatureKitchenSlug =
    slug === "smart" || slug === "sage" || slug === "taupe" || slug === "urban"
      ? slug
      : kitchenSlugFromName(slug) || "smart";
  const hw = (label: string, imageUrl: string): SignatureHardware => ({
    ...createEmptyHardware(label),
    imageUrl,
  });
  const base: SignatureHardware[] = [
    hw("3 TENDOM BASKET", "/templates/hw-tandem.png"),
    hw("KITCHEN ORGANIZER", "/templates/hw-organizer.png"),
    hw("THALI, CUP & SAUCER STAND", "/templates/hw-thali.png"),
    hw("LED STRIP LIGHTS", "/templates/hw-led.png"),
    hw("BOTTLE PULL OUT", "/templates/hw-bottle.png"),
  ];
  if (resolved === "sage" || resolved === "taupe" || resolved === "urban") {
    base.push(hw("ROLLING SHUTTER", ""));
  }
  if (resolved === "taupe" || resolved === "urban") {
    base.push(hw("WICKER BASKET", ""));
  }
  if (resolved === "urban") {
    base.push(hw("PANTRY UNIT", ""));
  }
  base.push(hw("SOCKET POINT 5", "/templates/hw-socket.png"));
  return base;
}

export function cloneHardware(list?: SignatureHardware[] | null): SignatureHardware[] {
  return (list || []).map((row) => ({ ...row, id: catalogId() }));
}

export function createDefaultE1E5PriceRows(
  amounts?: Array<{ model: string; area: string; amount: string }>
): SignaturePriceRow[] {
  return createPriceRowsFromAmounts(
    amounts || [
      { model: "E1", area: "50 (SQ.FT)", amount: "" },
      { model: "E2", area: "70 (SQ.FT)", amount: "" },
      { model: "E3", area: "90 (SQ.FT)", amount: "" },
      { model: "E4", area: "120 (SQ.FT)", amount: "" },
      { model: "E5", area: "150 (SQ.FT)", amount: "" },
    ]
  );
}

export function createEmptyKitchenPage(
  heading = "NEW KITCHEN",
  description = ""
): SignatureKitchenPage {
  const slug = kitchenSlugFromName(heading);
  const known = isKnownSignatureKitchen(heading);
  return {
    id: catalogId(),
    heading,
    description,
    imageUrl: "",
    show: true,
    // Four empty elevation slots — user uploads drawings
    elevations: createBlankElevations(4),
    hardware: known && slug ? createDefaultHardware(slug) : [],
    // Manual new section starts blank — add E1–E5 via “+ Price row” or load modular items
    priceRows: [],
  };
}

function descHtml(boldPart: string, ending = "generic kitchen design and site dimensions") {
  return `Providing and fixing complete modular kitchen organizer with <strong>${boldPart}</strong> complete as per the approved ${ending}.`;
}

/** Defaults matched to `public/templates/signature-series.pdf` (Signature Series brochure). */
export function createSignatureSeriesDefaults(): SignatureSeriesBlock {
  const kitchens: SignatureKitchenPage[] = [
    {
      id: catalogId(),
      heading: "SMART STORAGE. MODERN LIVING",
      description: descHtml(
        "3 Tandem Baskets, Thali Stand, Cup &amp; Saucer Stand, LED Strip Lights, Bottle Pull-Out, 5 Socket Points, premium PU finish shutters, required hardware, fittings, installation and finishing,"
      ),
      imageUrl: "",
      show: true,
      elevations: createBlankElevations(4),
      hardware: createDefaultHardware("smart"),
      priceRows: createDefaultE1E5PriceRows([
        { model: "E1", area: "50 (SQ.FT)", amount: "₹1,09,493/-" },
        { model: "E2", area: "70 (SQ.FT)", amount: "₹1,40,493/-" },
        { model: "E3", area: "90 (SQ.FT)", amount: "₹1,71,493/-" },
        { model: "E4", area: "120 (SQ.FT)", amount: "₹2,17,993/-" },
        { model: "E5", area: "150 (SQ.FT)", amount: "₹2,64,493/-" },
      ]),
    },
    {
      id: catalogId(),
      heading: "Sage Elegance Kitchen",
      description: descHtml(
        "3 Tandem Baskets, Thali Stand, Cup &amp; Saucer Stand, LED Strip Lights, Bottle Pull-Out, Rolling Shutter, 5 Socket Points, premium PU finish shutters, required hardware, fittings, installation and finishing,"
      ),
      imageUrl: "",
      show: true,
      elevations: createBlankElevations(4),
      hardware: createDefaultHardware("sage"),
      priceRows: createDefaultE1E5PriceRows([
        { model: "E1", area: "50 (SQ.FT)", amount: "₹1,22,993/-" },
        { model: "E2", area: "70 (SQ.FT)", amount: "₹1,53,993/-" },
        { model: "E3", area: "90 (SQ.FT)", amount: "₹1,84,993/-" },
        { model: "E4", area: "120 (SQ.FT)", amount: "₹2,31,493/-" },
        { model: "E5", area: "150 (SQ.FT)", amount: "₹2,77,993/-" },
      ]),
    },
    {
      id: catalogId(),
      heading: "Classic Taupe Elegance Kitchen",
      description: descHtml(
        "3 Tandem Baskets, Thali Stand, Cup &amp; Saucer Stand, Wicker Basket, LED Strip Lights, Bottle Pull-Out, Rolling Shutter, 5 Socket Points, premium PU finish shutters, required hardware, fittings, installation and finishing,",
        "kitchen design and site dimensions"
      ),
      imageUrl: "",
      show: true,
      elevations: createBlankElevations(4),
      hardware: createDefaultHardware("taupe"),
      priceRows: createDefaultE1E5PriceRows([
        { model: "E1", area: "50 (SQ.FT)", amount: "₹1,37,993/-" },
        { model: "E2", area: "70 (SQ.FT)", amount: "₹1,68,993/-" },
        { model: "E3", area: "90 (SQ.FT)", amount: "₹1,99,993/-" },
        { model: "E4", area: "120 (SQ.FT)", amount: "₹2,46,493/-" },
        { model: "E5", area: "150 (SQ.FT)", amount: "₹2,92,993/-" },
      ]),
    },
    {
      id: catalogId(),
      heading: "Urban Grey Elegance Kitchen",
      description: descHtml(
        "3 Tandem Baskets, Thali Stand, Cup &amp; Saucer Stand, Wicker Basket, LED Strip Lights, Bottle Pull-Out, Rolling Shutter, Pantry Unit, 5 Socket Points, premium PU finish shutters, required hardware, fittings, installation and finishing,",
        "kitchen design and site dimensions"
      ),
      imageUrl: "",
      show: true,
      elevations: createBlankElevations(4),
      hardware: createDefaultHardware("urban"),
      priceRows: createDefaultE1E5PriceRows([
        { model: "E1", area: "50 (SQ.FT)", amount: "₹1,57,993/-" },
        { model: "E2", area: "70 (SQ.FT)", amount: "₹1,88,993/-" },
        { model: "E3", area: "90 (SQ.FT)", amount: "₹2,19,993/-" },
        { model: "E4", area: "120 (SQ.FT)", amount: "₹2,66,493/-" },
        { model: "E5", area: "150 (SQ.FT)", amount: "₹3,12,993/-" },
      ]),
    },
  ];

  const first = kitchens[0];
  return {
    seriesTitle: "SIGNATURE SERIES",
    kitchenName: first.heading,
    description: first.description,
    heroImageUrl: first.imageUrl,
    showHeroPage: true,
    showSpecsPage: true,
    showElevations: true,
    showHardware: true,
    showPriceTable: true,
    hardwareTitle: "HARDWARE FITTINGS USED",
    elevations: createBlankElevations(4),
    hardware: cloneHardware(first.hardware),
    priceRows: first.priceRows,
    kitchens,
  };
}

export function createKitchenCatalogDefaults(): KitchenCatalogDoc {
  _n = 0;
  const pages: CatalogTablePage[] = [];
  const rows: CatalogRow[] = [];

  for (const seed of PAGE_SEEDS) {
    const pageId = catalogId();
    pages.push({
      id: pageId,
      variant: seed.variant,
      showIntro: seed.showIntro,
    });
    for (const row of seed.rows) {
      rows.push({
        ...row,
        id: catalogId(),
        pageId,
        pictures: [],
      });
    }
  }

  return {
    layoutMode: "material",
    dataSource: { kind: null },
    brandTop: "SANTOSHI",
    brandBottom: "INTERIORS",
    coverTitle: "KITCHEN",
    coverSubtitle: "COLLECTION",
    coverHeroUrl: "/templates/kitchen-cover-hero.png",
    logoUrl: "/images/logo/santoshi-interiors.jpg",
    showCover: true,
    showClosing: true,
    sectionBanner: "CUSTOM KITCHEN",
    sectionTag: "MODULAR PRODUCT",
    closingHeadline: "Experience the Essence of Everyday",
    closingBody:
      "The Essential Series is more than just a kitchen. It's a perfect blend of style, storage and simplicity, crafted to suit the way you live. Beautifully designed. Thoughtfully made. Made for you.",
    visitTitle: "VISIT TODAY",
    visitBody: "Step into our experience center and explore the Essential Kitchen in person.",
    websiteLabel: "VISIT OUR WEBSITE",
    websiteUrl: "https://santoshiinteriors.in/",
    followLabel: "FOLLOW US",
    followHandle: "@essentialkitchens",
    experienceLabel: "OUR EXPERIENCE CENTER",
    tagline: "SIMPLE, FUNCTIONAL, BEAUTIFUL.",
    pages,
    rows,
    signature: createSignatureSeriesDefaults(),
  };
}

export function renumberCatalogRows(rows: CatalogRow[]): CatalogRow[] {
  return rows.map((row, index) => ({
    ...row,
    sr: index + 1,
    model: row.model?.trim() ? row.model : `E${index + 1}`,
  }));
}
