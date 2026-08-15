import type { FlowBlock } from "@/components/quotations/MakerLayoutCanvas";
import { defaultPreparedHtml } from "@/components/quotations/MakerRichTextEditor";

export type PreparedForContext = {
  clientName?: string;
  projectTitle?: string;
  phone?: string;
  reference?: string;
};

export function extractReferenceFromNotes(notes?: string | null, fallback = "—") {
  if (!notes?.trim()) return fallback;
  const ref = notes
    .replace(/^Ref:\s*/i, "")
    .split("|")[0]
    .trim();
  return ref || fallback;
}

export function buildPreparedForContext(
  raw: Record<string, unknown>,
  fallback?: PreparedForContext
): PreparedForContext {
  const lead = raw.lead as Record<string, unknown> | null | undefined;
  const customer = raw.customer as Record<string, unknown> | null | undefined;

  const clientName =
    String(raw.clientName || lead?.clientName || customer?.name || "").trim() ||
    fallback?.clientName ||
    "";

  const projectTitle =
    String(lead?.projectName || raw.title || fallback?.projectTitle || "").trim() ||
    "INTERIOR WORK";

  const phone =
    String(raw.phone || lead?.phone || customer?.phone || fallback?.phone || "").trim() ||
    "—";

  const reference =
    extractReferenceFromNotes(
      typeof raw.notes === "string" ? raw.notes : null,
      fallback?.reference || "—"
    );

  return { clientName, projectTitle, phone, reference };
}

export function isPlaceholderPreparedHtml(html: string): boolean {
  const normalized = html.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.includes("client name")) return true;
  if (/<strong>client<\/strong>/.test(normalized) && normalized.includes("interior work")) {
    return true;
  }
  if (normalized.includes("prepared for") && /<strong>client<\/strong>/.test(normalized)) {
    return true;
  }
  return false;
}

export function applyClientToLayoutBlocks(
  blocks: FlowBlock[],
  ctx: PreparedForContext,
  { force = false }: { force?: boolean } = {}
): FlowBlock[] {
  if (!ctx.clientName?.trim()) return blocks;

  const preparedHtml = defaultPreparedHtml({
    clientName: ctx.clientName,
    projectTitle: ctx.projectTitle,
    phone: ctx.phone,
    reference: ctx.reference,
  });

  return blocks.map((block) => {
    if (block.type === "detailsRow") {
      if (force || isPlaceholderPreparedHtml(block.preparedHtml)) {
        return { ...block, preparedHtml };
      }
      return block;
    }
    if (block.type === "preparedFor") {
      if (force || isPlaceholderPreparedHtml(block.html)) {
        return { ...block, html: preparedHtml };
      }
      return block;
    }
    return block;
  });
}

function extractTemplateCompanyHtml(templateBlocks: FlowBlock[]): string | null {
  const row = templateBlocks.find((b) => b.type === "detailsRow");
  if (row?.type === "detailsRow") return row.companyHtml;
  const company = templateBlocks.find((b) => b.type === "company");
  if (company?.type === "company") return company.html;
  return null;
}

function extractRichtextHtml(
  templateBlocks: FlowBlock[],
  titleNeedle: string
): string | null {
  const block = templateBlocks.find(
    (b) =>
      b.type === "richtext" &&
      b.title.toLowerCase().includes(titleNeedle.toLowerCase())
  );
  if (block?.type === "richtext") return block.html;
  return null;
}

/** Pull company, bank, and terms from a saved settings template into a quotation layout. */
export function mergeTemplateSettingsIntoLayout(
  blocks: FlowBlock[],
  templateBlocks: FlowBlock[],
  ctx: PreparedForContext
): FlowBlock[] {
  if (!templateBlocks.length) {
    return applyClientToLayoutBlocks(blocks, ctx);
  }

  const companyHtml = extractTemplateCompanyHtml(templateBlocks);
  const bankHtml = extractRichtextHtml(templateBlocks, "bank");
  const termsHtml = extractRichtextHtml(templateBlocks, "terms");

  const merged = blocks.map((block) => {
    if (block.type === "detailsRow" && companyHtml) {
      return { ...block, companyHtml };
    }
    if (block.type === "company" && companyHtml) {
      return { ...block, html: companyHtml };
    }
    if (block.type === "richtext") {
      const title = block.title.toLowerCase();
      if (title.includes("bank") && bankHtml) {
        return { ...block, html: bankHtml };
      }
      if (title.includes("terms") && termsHtml) {
        return { ...block, html: termsHtml };
      }
    }
    return block;
  });

  return applyClientToLayoutBlocks(merged, ctx);
}

export function buildLayoutFromTemplate(
  templateBlocks: FlowBlock[],
  ctx: PreparedForContext
): FlowBlock[] {
  if (!templateBlocks.length) return [];
  return applyClientToLayoutBlocks(
    templateBlocks.map((block) => ({ ...block })),
    ctx
  );
}
