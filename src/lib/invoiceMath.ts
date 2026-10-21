import type { InvoiceItemDto } from "@/services/crmApi";

export function lineTotals(item: Pick<InvoiceItemDto, "qty" | "rate" | "discountPct" | "taxPct">) {
  const qty = Number(item.qty || 0);
  const rate = Number(item.rate || 0);
  const line = qty * rate;
  const disc = line * (Number(item.discountPct || 0) / 100);
  const taxable = line - disc;
  const tax = taxable * (Number(item.taxPct || 0) / 100);
  return { line, disc, tax, final: taxable + tax };
}

export function invoiceTotals(
  items: InvoiceItemDto[],
  additionalCharge = 0,
  additionalDiscount = 0
) {
  const named = items.filter((row) => String(row.name || "").trim());
  const subtotal = named.reduce((sum, row) => sum + lineTotals(row).line, 0);
  const itemDiscount = named.reduce((sum, row) => sum + lineTotals(row).disc, 0);
  const tax = named.reduce((sum, row) => sum + lineTotals(row).tax, 0);
  const extraCharge = Number(additionalCharge || 0);
  const extraDiscount = Number(additionalDiscount || 0);
  const grand = Math.max(0, subtotal - itemDiscount - extraDiscount + tax + extraCharge);
  return {
    itemCount: named.length,
    subtotal,
    itemDiscount,
    extraCharge,
    extraDiscount,
    totalDiscount: itemDiscount + extraDiscount,
    tax,
    grand,
  };
}

export function money(value?: number | null) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function toYmd(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    d.getMonth()
  ];
  return `${day}-${mon}-${d.getFullYear()}`;
}

export function parseTaxPct(value?: string | null) {
  const match = String(value || "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}
