"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { FlowBlock } from "@/components/quotations/MakerLayoutCanvas";
import TemplateElementSidebar from "./TemplateElementSidebar";
import TemplateLayoutCanvas from "./TemplateLayoutCanvas";
import { ApiError } from "@/lib/api";
import type { TemplateDesign } from "@/lib/quotationTemplateEditor";
import { quotationSettingsApi } from "@/services/crmApi";

const accent = "#E85D75";

function normalizeDesign(raw: Record<string, unknown>): TemplateDesign {
  const colours = Array.isArray(raw.colours)
    ? raw.colours.map(String)
    : ["#E85D75", "#111111", "#FFFFFF"];
  while (colours.length < 3) colours.push("#FFFFFF");

  return {
    id: String(raw.id),
    name: String(raw.name || "Template"),
    font: String(raw.font || "Figtree"),
    colours,
    watermarkUrl: raw.watermarkUrl ? String(raw.watermarkUrl) : null,
    layout: Array.isArray(raw.layout) ? (raw.layout as FlowBlock[]) : [],
    isDefault: Boolean(raw.isDefault),
  };
}

export default function TemplateEditor({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [design, setDesign] = useState<TemplateDesign | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await quotationSettingsApi.getTemplate(templateId);
      setDesign(normalizeDesign(raw as Record<string, unknown>));
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (patchFn: (d: TemplateDesign) => TemplateDesign) => {
    setDesign((prev) => {
      if (!prev) return prev;
      const next = patchFn(prev);
      setDirty(true);
      return next;
    });
  };

  const handleSave = async () => {
    if (!design) return;
    try {
      setSaving(true);
      setError("");
      const saved = await quotationSettingsApi.updateTemplateDesign(templateId, {
        name: design.name,
        font: design.font,
        colours: design.colours,
        layout: design.layout,
        watermarkUrl: design.watermarkUrl,
      });
      setDesign(normalizeDesign(saved as Record<string, unknown>));
      setDirty(false);
      setNotice("Template saved");
      window.setTimeout(() => setNotice(""), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleWatermarkUpload = async (file: File) => {
    try {
      setUploading(true);
      setError("");
      const saved = await quotationSettingsApi.uploadWatermark(templateId, file);
      setDesign(normalizeDesign(saved as Record<string, unknown>));
      setNotice("Watermark uploaded");
      window.setTimeout(() => setNotice(""), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Watermark upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleWatermarkRemove = async () => {
    try {
      setUploading(true);
      const saved = await quotationSettingsApi.removeWatermark(templateId);
      setDesign(normalizeDesign(saved as Record<string, unknown>));
      setDirty(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove watermark");
    } finally {
      setUploading(false);
    }
  };

  const primaryColour = useMemo(
    () => design?.colours[0] || accent,
    [design?.colours]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">
        Loading template editor…
      </div>
    );
  }

  if (!design) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        {error || "Template not found"}
        <div className="mt-3">
          <Link href="/settings/quotations/settings" className="font-medium text-[#E85D75]">
            ← Back to Quotation Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mb-4 flex min-h-[calc(100vh-7rem)] flex-col md:-mx-6 md:-mb-6">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/settings/quotations/settings")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50"
          aria-label="Back"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
            {design.name}
          </h1>
          <p className="text-xs text-gray-500">
            Click any section to edit · then Save Template
          </p>
        </div>
        {dirty ? (
          <span className="hidden text-xs font-medium text-amber-600 sm:inline">
            Unsaved changes
          </span>
        ) : null}
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
          className="inline-flex h-10 shrink-0 items-center rounded-lg px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: dirty ? accent : "#d1d5db" }}
        >
          {saving ? "Saving…" : "Save Template"}
        </button>
      </div>

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <TemplateElementSidebar
          font={design.font}
          colours={design.colours}
          watermarkUrl={design.watermarkUrl}
          uploading={uploading}
          onFontChange={(font) => patch((d) => ({ ...d, font }))}
          onColourChange={(index, colour) =>
            patch((d) => {
              const colours = [...d.colours];
              colours[index] = colour;
              return { ...d, colours };
            })
          }
          onWatermarkUpload={(file) => void handleWatermarkUpload(file)}
          onWatermarkRemove={() => void handleWatermarkRemove()}
        />
        <TemplateLayoutCanvas
          layout={design.layout}
          font={design.font}
          primaryColour={primaryColour}
          watermarkUrl={design.watermarkUrl}
          onLayoutChange={(layout) => patch((d) => ({ ...d, layout }))}
        />
      </div>
    </div>
  );
}
