export function parseBudget(raw?: string | null) {
  if (!raw) return 0;
  const text = String(raw).trim();
  if (!text) return 0;
  const num = Number(text.replace(/,/g, "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return 0;
  if (/cr/i.test(text)) return num * 10000000;
  if (/lakh|lac/i.test(text)) return num * 100000;
  if (/\bk\b/i.test(text)) return num * 1000;
  return num;
}

export function formatINR(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(value)).toLocaleString("en-IN")}`;
}

export function formatINRSigned(value: number) {
  if (value < 0) return `-${formatINR(Math.abs(value))}`;
  return formatINR(value);
}

export function cashFlowPct(cashFlow: number, projectValue: number, fundsReceived = 0) {
  const base = projectValue > 0 ? projectValue : fundsReceived;
  if (base <= 0) return 0;
  return (cashFlow / base) * 100;
}

export function formatPct(value: number) {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

export function formatCompactINR(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    return `${sign}\u20B9${cr >= 10 ? cr.toFixed(0) : cr.toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    const lakhs = abs / 100000;
    return `${sign}\u20B9${lakhs >= 10 ? Math.round(lakhs) : lakhs.toFixed(1)}L`;
  }
  return `${sign}\u20B9${Math.round(abs).toLocaleString("en-IN")}`;
}

export function isExpenseType(type?: string | null) {
  const value = String(type || "").toUpperCase();
  return value === "MATERIAL" || value === "VENDOR";
}

export function isFundType(type?: string | null) {
  const value = String(type || "").toUpperCase();
  return value === "ADVANCE" || value === "MILESTONE" || value === "HANDOVER" || value === "OTHER";
}

export function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatStamp(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${mon}-${yy} ${hh}:${mm}`;
}

export function formatShortDate(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${day}-${mon}-${String(d.getFullYear()).slice(-2)}`;
}

export const paymentFieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

export const paymentLabelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";

export const paymentSerif = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

export const EXPENSE_TYPES = ["Material", "Labour", "Service", "Transport", "Other"];
export const PAYMENT_SOURCES = ["CompanyAccount", "PettyCash", "ClientDirect"];
export const COLLECTION_MODES: Array<{ label: string; value: string }> = [
  { label: "CompanyAccount", value: "BANK_TRANSFER" },
  { label: "UPI", value: "UPI" },
  { label: "Cash", value: "CASH" },
  { label: "Cheque", value: "CHEQUE" },
  { label: "Card", value: "CARD" },
];
