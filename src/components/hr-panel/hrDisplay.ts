export function deptLabel(value?: string | null) {
  const key = String(value || "")
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/gi, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
  if (key.includes("SALES")) return "Sales & Marketing";
  if (key.includes("DESIGN")) return "Design Team";
  if (key.includes("SITE")) return "Site Execution";
  const map: Record<string, string> = {
    SALES: "Sales & Marketing",
    DESIGN: "Design Team",
    SITE: "Site Execution",
    ACCOUNTS: "Accounts",
    HR: "Administration",
    ADMIN: "Administration",
  };
  return map[key] || (value ? String(value).replace(/_/g, " ") : "Other");
}

export function initials(name?: string | null) {
  return String(name || "E")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function empCode(id: string, index: number) {
  const n = String(index + 1).padStart(2, "0");
  return `EMP${n}`;
}
