/** True when the label matches the auto project code pattern, e.g. "Project - 4683". */
export function isAutoProjectLabel(name: string): boolean {
  return /^Project\s*-\s*\d+/i.test(name.trim());
}

/** Stable 4-digit suffix derived from a lead id. */
export function projectCodeFromLeadId(leadId: string): string {
  let hash = 0;
  for (let i = 0; i < leadId.length; i++) {
    hash = (hash * 31 + leadId.charCodeAt(i)) >>> 0;
  }
  return String((hash % 9000) + 1000);
}

/** Random project code for new leads before an id exists. */
export function randomProjectCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function formatProjectLabel(code: string): string {
  return `Project - ${code}`;
}

/** Display label for a lead's project row. */
export function getLeadProjectLabel(
  leadId: string,
  projectName?: string | null
): string {
  const trimmed = projectName?.trim();
  if (trimmed && isAutoProjectLabel(trimmed)) {
    return trimmed;
  }
  return formatProjectLabel(projectCodeFromLeadId(leadId));
}

/** Default quotation title when creating from a lead workspace. */
export function getDefaultQuotationName(
  leadId: string,
  projectName?: string | null
): string {
  return getLeadProjectLabel(leadId, projectName);
}
