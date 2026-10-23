export function parseMoney(value?: string | number | null) {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function holdingPercent(value?: string | number | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function splitProjectValue(projectValue: number, percent: number) {
  const value = Math.max(0, parseMoney(projectValue));
  const pct = holdingPercent(percent);
  const dlp = Math.round((value * pct) / 100 * 100) / 100;
  const payable = Math.round((value - dlp) * 100) / 100;
  return { value, percent: pct, dlp, payable };
}

export function splitVendorPayout(
  projectValue: number,
  dlpPercent: number,
  retentionAmount = 0
) {
  const split = splitProjectValue(projectValue, dlpPercent);
  const retention = Math.max(0, parseMoney(retentionAmount));
  return {
    ...split,
    retention,
    payable: Math.max(0, Math.round((split.payable - retention) * 100) / 100),
  };
}
