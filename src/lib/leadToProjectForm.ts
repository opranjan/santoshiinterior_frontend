import type { LeadDto } from "@/services/crmApi";
import { formatDate } from "@/lib/mappers";
import { getLeadProjectName } from "@/lib/leadProjectLabel";

export type ProjectFormFromLead = {
  name: string;
  client: string;
  phone: string;
  store: string;
  projectType: string;
  scope: string;
  budget: string;
  salesOwner: string;
  assignedTo: string;
  financialYear: string;
  startDate: string;
  address: string;
  description: string;
  latestRemark: string;
};

export function projectFormFromLead(
  lead: LeadDto,
  defaults: Partial<ProjectFormFromLead> = {}
): ProjectFormFromLead {
  return {
    name:
      getLeadProjectName(lead.projectName, lead.project?.name) ||
      `${lead.clientName} Project`,
    client: lead.clientName || "",
    phone: lead.phone || "",
    store: lead.store?.name || defaults.store || "",
    projectType: lead.projectType || defaults.projectType || "Residential",
    scope: lead.scope || defaults.scope || "Full Home Interiors",
    budget: lead.budget || defaults.budget || "₹10 – 25 Lakh",
    salesOwner: lead.salesOwner?.name || defaults.salesOwner || "",
    assignedTo: lead.assignedTo?.name || defaults.assignedTo || "",
    financialYear: lead.financialYear || defaults.financialYear || "2026-27",
    startDate: formatDate(lead.tentativeStart),
    address: lead.clientAddress || "",
    description: lead.description || "",
    latestRemark: lead.latestRemark || "",
  };
}
