import type {
  FlowBlock,
  FreeImageBlock,
} from "@/components/quotations/MakerLayoutCanvas";
import { quotationSettingsApi, quotationsApi } from "@/services/crmApi";

function needsUpload(url?: string | null) {
  const value = String(url || "");
  return value.startsWith("blob:") || value.startsWith("data:");
}

async function uploadLocalUrl(quotationId: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not read uploaded image");
  const blob = await res.blob();
  const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
  const file = new File([blob], `quotation-image.${ext}`, {
    type: blob.type || "image/png",
  });
  const saved = await quotationsApi.uploadAsset(quotationId, file);
  return saved.url;
}

export async function persistMakerMedia(input: {
  quotationId: string;
  blocks: FlowBlock[];
  freeImages: FreeImageBlock[];
}): Promise<{ blocks: FlowBlock[]; freeImages: FreeImageBlock[] }> {
  const cache = new Map<string, string>();
  const blobsToRevoke: string[] = [];

  const persistUrl = async (url?: string) => {
    if (!url) return "";
    if (!needsUpload(url)) return url;
    if (cache.has(url)) return cache.get(url)!;
    const stored = await uploadLocalUrl(input.quotationId, url);
    cache.set(url, stored);
    if (url.startsWith("blob:")) blobsToRevoke.push(url);
    return stored;
  };

  const blocks = await Promise.all(
    input.blocks.map(async (block) => {
      let next = block;
      if ("imageUrl" in next && next.imageUrl) {
        next = { ...next, imageUrl: await persistUrl(next.imageUrl) } as FlowBlock;
      }
      if (next.type === "richtext" && next.qrImageUrl) {
        next = { ...next, qrImageUrl: await persistUrl(next.qrImageUrl) };
      }
      return next;
    })
  );

  const freeImages = await Promise.all(
    input.freeImages.map(async (img) => {
      if (!img.imageUrl) return img;
      return { ...img, imageUrl: await persistUrl(img.imageUrl) };
    })
  );

  blobsToRevoke.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  });

  return { blocks, freeImages };
}

export async function persistTemplateLayout(input: {
  templateId: string;
  blocks: FlowBlock[];
}): Promise<FlowBlock[]> {
  const cache = new Map<string, string>();
  const blobsToRevoke: string[] = [];

  const persistUrl = async (url?: string) => {
    if (!url) return "";
    if (!needsUpload(url)) return url;
    if (cache.has(url)) return cache.get(url)!;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not read uploaded image");
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const file = new File([blob], `template-image.${ext}`, {
      type: blob.type || "image/png",
    });
    const saved = await quotationSettingsApi.uploadAsset(input.templateId, file);
    cache.set(url, saved.url);
    if (url.startsWith("blob:")) blobsToRevoke.push(url);
    return saved.url;
  };

  const blocks = await Promise.all(
    input.blocks.map(async (block) => {
      let next = block;
      if ("imageUrl" in next && next.imageUrl) {
        next = { ...next, imageUrl: await persistUrl(next.imageUrl) } as FlowBlock;
      }
      if (next.type === "richtext" && next.qrImageUrl) {
        next = { ...next, qrImageUrl: await persistUrl(next.qrImageUrl) };
      }
      return next;
    })
  );

  blobsToRevoke.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  });

  return blocks;
}
