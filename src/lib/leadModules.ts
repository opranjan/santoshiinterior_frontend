export type LeadModuleId =
  | "summary"
  | "details"
  | "notes"
  | "inspirations"
  | "documents"
  | "project-plan"
  | "finance-plan"
  | "site"
  | "communication"
  | "quotations"
  | "vtour";

export type LeadModuleDef = {
  id: LeadModuleId;
  label: string;
  badge?: string;
  badgeTone?: "blue" | "pink";
  ready: boolean;
  icon: LeadModuleId | "quotations";
};

export const LEAD_MODULES: LeadModuleDef[] = [
  { id: "summary", label: "Summary", ready: true, icon: "summary" },
  { id: "details", label: "Details", ready: true, icon: "details" },
  { id: "notes", label: "Notes", ready: true, icon: "notes" },
  { id: "quotations", label: "Quotation", ready: true, icon: "quotations" },
  {
    id: "inspirations",
    label: "Inspirations",
    badge: "AI",
    badgeTone: "pink",
    ready: false,
    icon: "inspirations",
  },
  { id: "documents", label: "Documents", ready: false, icon: "documents" },
  {
    id: "project-plan",
    label: "Project Plan",
    badge: "AI Planning",
    badgeTone: "pink",
    ready: false,
    icon: "project-plan",
  },
  { id: "finance-plan", label: "Finance Plan", ready: false, icon: "finance-plan" },
  { id: "site", label: "Site", ready: false, icon: "site" },
  { id: "communication", label: "Communication", ready: false, icon: "communication" },
  { id: "vtour", label: "vTour", ready: false, icon: "vtour" },
];

export function leadModuleHref(leadId: string, module: LeadModuleId) {
  return `/sales/leads/${leadId}?module=${module}`;
}

export function normalizeLeadModule(value: string | null): LeadModuleId {
  if (value === "quotations-v2") return "quotations";
  return LEAD_MODULES.some((m) => m.id === value)
    ? (value as LeadModuleId)
    : "summary";
}
