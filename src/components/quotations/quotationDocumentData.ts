import type { Quotation } from "./QuotationsTable";

export type QuotationLineItem = {
  description: string;
  area: string;
  qty: number;
  unit: string;
  rate: number;
};

export type QuotationDocumentData = Quotation & {
  address?: string;
  siteAddress?: string;
  discount?: number;
  gstPercent?: number;
  notes?: string;
  terms?: string;
  items: QuotationLineItem[];
};

export const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (value: string) => {
  if (!value || value === "-") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Demo line items mapped by quotation id for preview/PDF */
export const quotationItemsById: Record<string, QuotationLineItem[]> = {
  "QT-2401": [
    { description: "Modular Kitchen with soft-close hardware", area: "Kitchen", qty: 1, unit: "LS", rate: 420000 },
    { description: "Bedroom wardrobes (laminate finish)", area: "Bedrooms", qty: 3, unit: "Nos", rate: 95000 },
    { description: "False ceiling with cove lighting", area: "Living / Dining", qty: 520, unit: "sq.ft", rate: 185 },
    { description: "TV unit + feature wall panelling", area: "Living Room", qty: 1, unit: "LS", rate: 125000 },
    { description: "Designer lighting package", area: "Whole Home", qty: 1, unit: "LS", rate: 78000 },
  ],
  "QT-2402": [
    { description: "Workstation partitions & workstations", area: "Open Office", qty: 50, unit: "Nos", rate: 28500 },
    { description: "MD / Manager cabins", area: "Cabins", qty: 4, unit: "Nos", rate: 185000 },
    { description: "Reception desk & waiting lounge", area: "Reception", qty: 1, unit: "LS", rate: 320000 },
    { description: "False ceiling, AC boxing & lighting", area: "Entire Floor", qty: 4200, unit: "sq.ft", rate: 210 },
    { description: "Meeting room furniture & AV setup", area: "Conference", qty: 2, unit: "Nos", rate: 240000 },
  ],
  "QT-2403": [
    { description: "Kitchen renovation (carcass + shutters)", area: "Kitchen", qty: 1, unit: "LS", rate: 265000 },
    { description: "Wardrobe replacements", area: "Bedrooms", qty: 2, unit: "Nos", rate: 72000 },
    { description: "False ceiling touch-up & paint", area: "Living", qty: 280, unit: "sq.ft", rate: 160 },
    { description: "Bathroom vanity units", area: "Bathrooms", qty: 2, unit: "Nos", rate: 38000 },
  ],
  "QT-2404": [
    { description: "Living room furniture + TV unit", area: "Living", qty: 1, unit: "LS", rate: 385000 },
    { description: "Modular kitchen upgrade", area: "Kitchen", qty: 1, unit: "LS", rate: 455000 },
    { description: "False ceiling & lighting redesign", area: "Living / Kitchen", qty: 380, unit: "sq.ft", rate: 190 },
    { description: "Wallpaper & accent finishes", area: "Living", qty: 1, unit: "LS", rate: 65000 },
  ],
  "QT-2405": [
    { description: "Retail display units & wall fixtures", area: "Showroom Floor", qty: 1, unit: "LS", rate: 980000 },
    { description: "Reception & cash counter", area: "Front Zone", qty: 1, unit: "LS", rate: 245000 },
    { description: "Ceiling, lighting & branding backdrop", area: "Entire Area", qty: 1800, unit: "sq.ft", rate: 265 },
    { description: "Storage & back-office interiors", area: "Back Office", qty: 1, unit: "LS", rate: 420000 },
  ],
};

export function buildDocumentData(q: Quotation): QuotationDocumentData {
  const items =
    quotationItemsById[q.id] ||
    [
      {
        description: q.title,
        area: q.projectType,
        qty: 1,
        unit: "LS",
        rate: q.amount,
      },
    ];

  return {
    ...q,
    address: "Indore, Madhya Pradesh",
    siteAddress: `${q.store} · ${q.projectType} project`,
    discount: 0,
    gstPercent: 18,
    notes:
      "Quotation includes material and labour as scoped. Final billing is subject to site measurements and approved drawings. Any extra work will be charged separately with prior approval.",
    terms:
      "40% advance on confirmation · 40% on material delivery / fabrication start · 20% on project handover. Payments via bank transfer / UPI. Quotation validity as mentioned above.",
    items,
  };
}

export function calcTotals(doc: QuotationDocumentData) {
  const subtotal = doc.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const discount = Math.min(doc.discount || 0, subtotal);
  const taxable = Math.max(subtotal - discount, 0);
  const gstPercent = doc.gstPercent ?? 18;
  const gst = (taxable * gstPercent) / 100;
  const grandTotal = taxable + gst;
  return { subtotal, discount, taxable, gstPercent, gst, grandTotal };
}
