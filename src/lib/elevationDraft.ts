export const ELEVATION_DRAFT_FILE = "elevation-signoff.json";

export type ElevationDraft = {
  version: 1;
  projectId: string;
  savedAt: string;
  docTitle: string;
  clientName: string;
  siteAddress: string;
  date: string;
  workingKicker: string;
  sheetTitle: string;
  drawingsTitle: string;
  materialTitle: string;
  termsTitle: string;
  rows: Array<{
    id: string;
    material: string;
    sizes: string;
    code: string;
    thickness: string;
    image?: string;
  }>;
  terms: Array<{ title: string; body: string }>;
  photos: Array<{ id: string; url: string }>;
  designerSignature: string | null;
  clientSignature: string | null;
};

const storageKey = (projectId: string) => `crm:elevation-signoff:${projectId}`;

export function readElevationDraftLocal(projectId: string): ElevationDraft | null {
  if (!projectId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ElevationDraft;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeElevationDraftLocal(draft: ElevationDraft) {
  if (!draft.projectId || typeof window === "undefined") return;
  localStorage.setItem(storageKey(draft.projectId), JSON.stringify(draft));
}

export async function toPersistableUrl(url?: string | null): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }
  if (!url.startsWith("blob:")) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function prepareElevationDraft(
  draft: Omit<ElevationDraft, "version" | "savedAt" | "rows" | "photos"> & {
    rows: ElevationDraft["rows"];
    photos: ElevationDraft["photos"];
  }
): Promise<ElevationDraft> {
  const rows = await Promise.all(
    draft.rows.map(async (row) => ({
      ...row,
      image: await toPersistableUrl(row.image),
    }))
  );
  const photos = (
    await Promise.all(
      draft.photos.map(async (photo) => {
        const url = await toPersistableUrl(photo.url);
        return url ? { id: photo.id, url } : null;
      })
    )
  ).filter(Boolean) as ElevationDraft["photos"];

  return {
    ...draft,
    version: 1,
    savedAt: new Date().toISOString(),
    rows,
    photos,
  };
}
