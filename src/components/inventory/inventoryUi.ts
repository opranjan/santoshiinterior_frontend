export const fieldClass =
  "h-11 w-full rounded-lg border border-[#eadfcf] bg-white px-4 text-sm text-[#1c1610] placeholder:text-gray-400 focus:border-[#C4A574] focus:outline-hidden focus:ring-3 focus:ring-[#C4A574]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export const primaryBtn =
  "inline-flex h-11 items-center justify-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-40 dark:bg-[#e8d5b5] dark:text-[#1c1610]";

export const goldBtn =
  "inline-flex h-11 items-center justify-center rounded-xl bg-[#C4A574] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] hover:bg-[#b8945f] disabled:opacity-40";

export const outlineBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#C4A574] bg-white px-4 text-sm font-medium text-[#1c1610] hover:bg-[#faf6ef] disabled:opacity-40";

export function moneyPlain(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function money(value: number, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value) || 0);
}

export function fmtDt(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).replace(",", "");
}

export function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export const GOODS_TYPE_LABEL: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  FINISHED_GOOD: "Finished Good",
  CONSUMABLE: "Consumable",
  SERVICE: "Service",
};
