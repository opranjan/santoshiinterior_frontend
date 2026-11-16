import type {
  KitchenCatalogDoc,
  SignatureElevation,
  SignatureHardware,
  SignatureKitchenPage,
} from "@/lib/kitchenCatalogDefaults";
import { modularCatalogsApi, quotationCatalogsApi } from "@/services/crmApi";

export function parseInrAmount(text: string): number {
  const n = Number(String(text || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function parseAreaSqFt(text: string): number {
  const m = String(text || "").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

export function parseRatePrice(rate: string): number {
  const m = String(rate || "").match(/[\d,]+(\.\d+)?/);
  if (!m) return 0;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export type CatalogUpdateResult = {
  updated: number;
  skipped: number;
  errors: string[];
  label: string;
  /** Kitchen pages with blob URLs replaced by persisted /uploads URLs */
  kitchens?: SignatureKitchenPage[];
};

function isTransientImageUrl(url?: string | null): boolean {
  const raw = String(url || "").trim();
  return raw.startsWith("blob:") || raw.startsWith("data:");
}

async function persistImageUrl(catalogId: string, url?: string | null): Promise<string> {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (!isTransientImageUrl(raw)) return raw;
  const res = await fetch(raw);
  if (!res.ok) throw new Error("Could not read uploaded image");
  const blob = await res.blob();
  const mime = blob.type || "image/jpeg";
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
        ? "gif"
        : "jpg";
  const file = new File([blob], `kitchen-${Date.now()}.${ext}`, { type: mime });
  const uploaded = await modularCatalogsApi.uploadCatalogImage(catalogId, file);
  return String(uploaded?.url || "").trim();
}

async function persistKitchenImages(
  kitchen: SignatureKitchenPage
): Promise<SignatureKitchenPage> {
  const catalogId = String(kitchen.sourceCatalogId || "").trim();
  if (!catalogId) return kitchen;

  const imageUrl = await persistImageUrl(catalogId, kitchen.imageUrl);
  const elevations: SignatureElevation[] = [];
  for (const row of kitchen.elevations || []) {
    elevations.push({
      ...row,
      imageUrl: await persistImageUrl(catalogId, row.imageUrl),
    });
  }
  const hardware: SignatureHardware[] = [];
  for (const row of kitchen.hardware || []) {
    hardware.push({
      ...row,
      imageUrl: await persistImageUrl(catalogId, row.imageUrl),
    });
  }

  await modularCatalogsApi.updateCatalog(catalogId, {
    name: /smart storage/i.test(kitchen.heading)
      ? "Signature Kitchen"
      : kitchen.heading,
    description: stripHtml(kitchen.description),
    bannerImageUrl: imageUrl || null,
    pdfLayout: {
      elevations: elevations.map((row) => ({
        id: row.id,
        title: row.title || "",
        note: row.note || "",
        imageUrl: row.imageUrl || "",
      })),
      hardware: hardware.map((row) => ({
        id: row.id,
        label: row.label || "",
        imageUrl: row.imageUrl || "",
      })),
    },
  });

  return { ...kitchen, imageUrl, elevations, hardware };
}

/** Persist editor values (esp. prices + banner/elevation images) back to modular / quotation catalog APIs. */
export async function updateCatalogDataFromDoc(
  doc: KitchenCatalogDoc
): Promise<CatalogUpdateResult> {
  const source = doc.dataSource;
  const errors: string[] = [];
  let updated = 0;
  let skipped = 0;
  const resolvedKitchens: SignatureKitchenPage[] = [];

  if (!source?.kind) {
    return {
      updated: 0,
      skipped: 0,
      errors: ["Load a quotation or Signature Series / modular catalog first."],
      label: "",
    };
  }

  if (doc.layoutMode === "signature" || source.kind === "modular-series" || source.kind === "modular-package") {
    const kitchens = doc.signature?.kitchens || [];
    for (const kitchen of kitchens) {
      if (kitchen.sourceCatalogId) {
        try {
          const resolved = await persistKitchenImages(kitchen);
          resolvedKitchens.push(resolved);
          updated += 1;
        } catch (err) {
          resolvedKitchens.push(kitchen);
          errors.push(
            `Kitchen “${kitchen.heading}”: ${err instanceof Error ? err.message : "update failed"}`
          );
        }
      } else {
        skipped += 1;
        resolvedKitchens.push(kitchen);
      }

      for (const row of kitchen.priceRows || []) {
        if (!row.sourceItemId) {
          skipped += 1;
          continue;
        }
        try {
          const area = parseAreaSqFt(row.area);
          await modularCatalogsApi.updateItem(row.sourceItemId, {
            code: row.model,
            name: area ? `${row.model} — ${area} sq.ft` : row.model,
            areaSqFt: area,
            price: parseInrAmount(row.amount),
          });
          updated += 1;
        } catch (err) {
          errors.push(
            `${kitchen.heading} ${row.model}: ${err instanceof Error ? err.message : "update failed"}`
          );
        }
      }
    }

    return {
      updated,
      skipped,
      errors,
      label: source.label || "Modular / Signature Series",
      kitchens: resolvedKitchens,
    };
  }

  // Material sheet ← quotation catalog
  const catalogId = source.quotationCatalogId;
  if (!catalogId) {
    return {
      updated: 0,
      skipped: 0,
      errors: ["No quotation catalog linked. Load a quotation catalog first."],
      label: source.label || "",
    };
  }

  for (const row of doc.rows || []) {
    if (!row.sourceItemId) {
      skipped += 1;
      continue;
    }
    try {
      await quotationCatalogsApi.updateItem(catalogId, row.sourceItemId, {
        code: row.model,
        name: row.model || "Item",
        description: row.description,
        price: parseRatePrice(row.rate),
        uom:
          String(row.rate || "")
            .replace(/[\d,.\s]+/, "")
            .trim() || "NOS",
      });
      updated += 1;
    } catch (err) {
      errors.push(
        `${row.model || row.sr}: ${err instanceof Error ? err.message : "update failed"}`
      );
    }
  }

  return {
    updated,
    skipped,
    errors,
    label: source.label || "Quotation catalog",
  };
}
