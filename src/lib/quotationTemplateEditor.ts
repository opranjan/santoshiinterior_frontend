import type { FlowBlock } from "@/components/quotations/MakerLayoutCanvas";
import { createFlowBlock } from "@/components/quotations/MakerLayoutCanvas";

export type TemplateElementKind =
  | "image"
  | "company"
  | "projectDetails"
  | "customProjectDetails"
  | "heading"
  | "quotationTable"
  | "quotationSummary"
  | "paymentPlan"
  | "bankDetails"
  | "termsConditions"
  | "contentBlock"
  | "hardwareTable"
  | "detailsRow"
  | "pageBreak";

export type TemplateElementDef = {
  kind: TemplateElementKind;
  label: string;
  description: string;
  icon: string;
};

export const TEMPLATE_ELEMENTS: TemplateElementDef[] = [
  { kind: "image", label: "Image", description: "Add an image", icon: "image" },
  {
    kind: "company",
    label: "Company Details",
    description: "Details about your company",
    icon: "company",
  },
  {
    kind: "projectDetails",
    label: "Project Details",
    description: "Details about the project",
    icon: "project",
  },
  {
    kind: "customProjectDetails",
    label: "Custom Project Details",
    description: "Customisable details about the project",
    icon: "custom",
  },
  {
    kind: "heading",
    label: "Heading",
    description: "Add a heading or title",
    icon: "heading",
  },
  {
    kind: "quotationTable",
    label: "Quotation Table",
    description: "Table of quotation items",
    icon: "table",
  },
  {
    kind: "quotationSummary",
    label: "Quotation Summary",
    description: "Summary of quotation",
    icon: "summary",
  },
  {
    kind: "paymentPlan",
    label: "Payment Plan",
    description: "Payment plan of quotation",
    icon: "payment",
  },
  {
    kind: "bankDetails",
    label: "Bank Details",
    description: "Bank details of your company",
    icon: "bank",
  },
  {
    kind: "termsConditions",
    label: "Terms & Conditions",
    description: "Terms and Conditions of quotation",
    icon: "terms",
  },
  {
    kind: "contentBlock",
    label: "Content Block",
    description: "Add some content",
    icon: "content",
  },
  {
    kind: "hardwareTable",
    label: "Hardware Table",
    description: "Table of hardware items",
    icon: "hardware",
  },
];

const kindToFlowBlockKind: Record<
  TemplateElementKind,
  Parameters<typeof createFlowBlock>[0] | "hardware" | "summary" | "customProject"
> = {
  image: "imageFull",
  company: "company",
  projectDetails: "preparedFor",
  customProjectDetails: "richtext",
  heading: "heading",
  quotationTable: "items",
  quotationSummary: "summary",
  paymentPlan: "payment",
  bankDetails: "bank",
  termsConditions: "terms",
  contentBlock: "richtext",
  hardwareTable: "hardware",
  detailsRow: "detailsRow",
  pageBreak: "pageBreak",
};

export function elementToFlowBlock(kind: TemplateElementKind): FlowBlock {
  const mapped = kindToFlowBlockKind[kind];
  if (mapped === "hardware") {
    return {
      id: `blk-hw-${Date.now()}`,
      type: "richtext",
      title: "Hardware Table",
      html: "<p>Hardware items table placeholder</p>",
    };
  }
  if (kind === "customProjectDetails") {
    const block = createFlowBlock("richtext");
    return { ...block, title: "Project Details", html: "<p>Project details</p>" };
  }
  if (kind === "contentBlock") {
    const block = createFlowBlock("richtext");
    return { ...block, title: "Content", html: "<p>Content</p>" };
  }
  return createFlowBlock(mapped as Parameters<typeof createFlowBlock>[0]);
}

export const FONT_OPTIONS = [
  "Figtree",
  "Inter",
  "Outfit",
  "Georgia",
  "Times New Roman",
  "Arial",
];

export type TemplateDesign = {
  id: string;
  name: string;
  font: string;
  colours: string[];
  watermarkUrl: string | null;
  layout: FlowBlock[];
  isDefault?: boolean;
};

export const DRAG_MIME = "application/x-quotation-template-element";
