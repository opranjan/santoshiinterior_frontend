export function enumToLabel(value?: string | null) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function labelToEnum(value?: string | null) {
  if (!value) return undefined;
  return value.trim().toUpperCase().replace(/[\s/-]+/g, "_");
}

/** Material categories with special UI labels */
export function materialCategoryToEnum(value?: string | null) {
  if (!value) return "OTHER";
  const map: Record<string, string> = {
    Laminate: "LAMINATE",
    "Plywood / Board": "PLYWOOD_BOARD",
    Hardware: "HARDWARE",
    Glass: "GLASS",
    "Stone / Quartz": "STONE_QUARTZ",
    Paint: "PAINT",
    Electrical: "ELECTRICAL",
    Other: "OTHER",
  };
  return map[value] || labelToEnum(value) || "OTHER";
}

export function materialCategoryToLabel(value?: string | null) {
  if (!value) return "Other";
  const map: Record<string, string> = {
    LAMINATE: "Laminate",
    PLYWOOD_BOARD: "Plywood / Board",
    HARDWARE: "Hardware",
    GLASS: "Glass",
    STONE_QUARTZ: "Stone / Quartz",
    PAINT: "Paint",
    ELECTRICAL: "Electrical",
    OTHER: "Other",
  };
  return map[value] || enumToLabel(value);
}

export function warrantyTypeToEnum(value?: string | null) {
  if (!value) return "COMPLAINT";
  const map: Record<string, string> = {
    "Warranty Claim": "WARRANTY_CLAIM",
    "Service Visit": "SERVICE_VISIT",
    AMC: "AMC",
    Complaint: "COMPLAINT",
    Inspection: "INSPECTION",
  };
  return map[value] || labelToEnum(value) || "COMPLAINT";
}

export function warrantyTypeToLabel(value?: string | null) {
  if (!value) return "Complaint";
  const map: Record<string, string> = {
    WARRANTY_CLAIM: "Warranty Claim",
    SERVICE_VISIT: "Service Visit",
    AMC: "AMC",
    COMPLAINT: "Complaint",
    INSPECTION: "Inspection",
  };
  return map[value] || enumToLabel(value);
}

export function paymentMethodToEnum(value?: string | null) {
  if (!value) return "UPI";
  const map: Record<string, string> = {
    UPI: "UPI",
    "Bank Transfer": "BANK_TRANSFER",
    Cash: "CASH",
    Cheque: "CHEQUE",
    Card: "CARD",
  };
  return map[value] || labelToEnum(value) || "UPI";
}

export function paymentMethodToLabel(value?: string | null) {
  if (!value) return "UPI";
  const map: Record<string, string> = {
    UPI: "UPI",
    BANK_TRANSFER: "Bank Transfer",
    CASH: "Cash",
    CHEQUE: "Cheque",
    CARD: "Card",
  };
  return map[value] || enumToLabel(value);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export type Paginated<T> = {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
