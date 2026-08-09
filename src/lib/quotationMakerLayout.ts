import type { MakerSettings } from "@/components/quotations/MakerSettingsModal";
import type {
  FlowBlock,
  FreeImageBlock,
} from "@/components/quotations/MakerLayoutCanvas";

export type QuotationMakerLayoutSnapshot = {
  templateId?: string;
  blocks?: FlowBlock[];
  freeImages?: FreeImageBlock[];
  settings?: MakerSettings;
};

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
    blocks,
    freeImages: Array.isArray(raw.freeImages)
      ? (raw.freeImages as FreeImageBlock[])
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
    blocks: input.blocks,
    freeImages: input.freeImages.map((img) => ({
      ...img,
      imageUrl: img.imageUrl.startsWith("blob:") ? "" : img.imageUrl,
    })),
    settings: input.settings,
  };
}
