import type { MakerSettings } from "@/components/quotations/MakerSettingsModal";
import type {
  FlowBlock,
  FreeImageBlock,
} from "@/components/quotations/MakerLayoutCanvas";
import { designAssetUrl } from "@/lib/designAssets";

export type QuotationMakerLayoutSnapshot = {
  templateId?: string;
  blocks?: FlowBlock[];
  freeImages?: FreeImageBlock[];
  settings?: MakerSettings;
};

export function isPersistedImageUrl(url?: string | null): boolean {
  const value = String(url || "").trim();
  if (!value) return false;
  if (value.startsWith("blob:")) return false;
  return true;
}

export function resolveQuotationImageUrl(url?: string | null): string {
  if (!isPersistedImageUrl(url)) return "";
  return designAssetUrl(url);
}

function withResolvedImageUrl<T extends { imageUrl?: string }>(block: T): T {
  if (!("imageUrl" in block)) return block;
  return {
    ...block,
    imageUrl: resolveQuotationImageUrl(block.imageUrl),
  };
}

export function resolveLayoutMedia(blocks: FlowBlock[]): FlowBlock[] {
  return blocks.map((block) => {
    const next = withResolvedImageUrl(block as FlowBlock & { imageUrl?: string });
    if (next.type === "items") return next;
    return next;
  });
}

export function resolveFreeImages(images: FreeImageBlock[]): FreeImageBlock[] {
  return images.map((img) => ({
    ...img,
    imageUrl: resolveQuotationImageUrl(img.imageUrl),
  }));
}

function stripBlobUrl(url?: string): string {
  return isPersistedImageUrl(url) ? String(url) : "";
}

export function parseMakerLayout(
  value: unknown
): QuotationMakerLayoutSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const blocks = Array.isArray(raw.blocks) ? (raw.blocks as FlowBlock[]) : null;
  if (!blocks?.length) return null;
  return {
    templateId:
      typeof raw.templateId === "string" ? raw.templateId : undefined,
    blocks: resolveLayoutMedia(blocks),
    freeImages: Array.isArray(raw.freeImages)
      ? resolveFreeImages(raw.freeImages as FreeImageBlock[])
      : [],
    settings:
      raw.settings && typeof raw.settings === "object" && !Array.isArray(raw.settings)
        ? (raw.settings as MakerSettings)
        : undefined,
  };
}

export function buildMakerLayoutPayload(input: {
  templateId: string;
  blocks: FlowBlock[];
  freeImages: FreeImageBlock[];
  settings: MakerSettings;
}): QuotationMakerLayoutSnapshot {
  return {
    templateId: input.templateId || undefined,
    blocks: input.blocks.map((block) => {
      if (!("imageUrl" in block)) return block;
      return {
        ...block,
        imageUrl: stripBlobUrl((block as { imageUrl?: string }).imageUrl),
      } as FlowBlock;
    }),
    freeImages: input.freeImages.map((img) => ({
      ...img,
      imageUrl: stripBlobUrl(img.imageUrl),
    })),
    settings: input.settings,
  };
}
