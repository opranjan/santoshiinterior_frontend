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
};

export type KitchenCatalogDoc = {
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
    brandTop: "SANTOSHI",
    brandBottom: "INTERIORS",
    coverTitle: "KITCHEN",
    coverSubtitle: "COLLECTION",
    coverHeroUrl: "/templates/kitchen-cover-hero.png",
    logoUrl: "/images/logo/santoshi-mark.svg",
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
  };
}

export function renumberCatalogRows(rows: CatalogRow[]): CatalogRow[] {
  return rows.map((row, index) => ({
    ...row,
    sr: index + 1,
    model: row.model?.trim() ? row.model : `E${index + 1}`,
  }));
}
