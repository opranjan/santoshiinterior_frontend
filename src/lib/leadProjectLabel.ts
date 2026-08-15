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

/** User-facing project name on a lead (ignores auto-generated placeholders). */
export function getLeadProjectName(
  projectName?: string | null,
  convertedProjectName?: string | null
): string {
  if (convertedProjectName?.trim()) {
    return convertedProjectName.trim();
  }
  const trimmed = projectName?.trim();
  if (trimmed && !isAutoProjectLabel(trimmed)) {
    return trimmed;
  }
  return "";
}

/** Display label for a lead workspace header. */
export function getLeadProjectLabel(
  leadId: string,
  projectName?: string | null,
  convertedProjectName?: string | null
): string {
  const name = getLeadProjectName(projectName, convertedProjectName);
  if (name) return name;
  return `Lead ${leadId.slice(0, 8)}`;
}

/** Default quotation title when creating from a lead workspace. */
export function getDefaultQuotationName(
  leadId: string,
  projectName?: string | null,
  clientName?: string | null
): string {
  const name = getLeadProjectName(projectName);
  if (name) return name;
  if (clientName?.trim()) return `${clientName.trim()} Quotation`;
  return `Lead ${leadId.slice(0, 8)}`;
}
