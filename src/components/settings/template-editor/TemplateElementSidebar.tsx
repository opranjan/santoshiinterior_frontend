"use client";

import React from "react";
import {
  DRAG_MIME,
  FONT_OPTIONS,
  TEMPLATE_ELEMENTS,
  type TemplateElementKind,
} from "@/lib/quotationTemplateEditor";

const accent = "#E85D75";

function ElementIcon({ icon }: { icon: string }) {
  const cls = "h-5 w-5 text-gray-500";
  switch (icon) {
    case "image":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
          <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
  }
}

type Props = {
  font: string;
  colours: string[];
  watermarkUrl: string | null;
  onFontChange: (font: string) => void;
  onColourChange: (index: number, colour: string) => void;
  onWatermarkUpload: (file: File) => void;
  onWatermarkRemove: () => void;
  uploading: boolean;
};

export default function TemplateElementSidebar({
  font,
  colours,
  watermarkUrl,
  onFontChange,
  onColourChange,
  onWatermarkUpload,
  onWatermarkRemove,
  uploading,
}: Props) {
  const [themeOpen, setThemeOpen] = React.useState(true);
  const [watermarkOpen, setWatermarkOpen] = React.useState(true);
  const [elementsOpen, setElementsOpen] = React.useState(true);

  const onDragStart = (kind: TemplateElementKind) => (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-semibold" style={{ color: accent }}>
          Elements
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <section className="border-b border-gray-100">
          <button
            type="button"
            onClick={() => setThemeOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-800"
          >
            Theme
            <span className="text-gray-400">{themeOpen ? "▾" : "▸"}</span>
          </button>
          {themeOpen ? (
            <div className="space-y-3 px-4 pb-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Font</label>
                <select
                  value={font}
                  onChange={(e) => onFontChange(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Colours</label>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <label key={i} className="relative h-9 w-9 cursor-pointer">
                      <input
                        type="color"
                        value={colours[i] || "#ffffff"}
                        onChange={(e) => onColourChange(i, e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      <span
                        className="block h-9 w-9 rounded-lg border border-gray-200"
                        style={{ backgroundColor: colours[i] }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="border-b border-gray-100">
          <button
            type="button"
            onClick={() => setWatermarkOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-800"
          >
            Watermark
            <span className="text-gray-400">{watermarkOpen ? "▾" : "▸"}</span>
          </button>
          {watermarkOpen ? (
            <div className="px-4 pb-4">
              {watermarkUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={watermarkUrl.startsWith("http") ? watermarkUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${watermarkUrl}`}
                    alt="Watermark"
                    className="mx-auto max-h-20 object-contain opacity-60"
                  />
                  <button
                    type="button"
                    onClick={onWatermarkRemove}
                    className="w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Remove watermark
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#E85D75]/50 bg-[#E85D75]/[0.03] px-4 py-6 text-center">
                  <span className="text-sm font-medium text-[#E85D75]">
                    {uploading ? "Uploading…" : "Upload Watermark"}
                  </span>
                  <span className="mt-1 text-xs text-gray-500">
                    Click to select image (Max 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onWatermarkUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          ) : null}
        </section>

        <section>
          <button
            type="button"
            onClick={() => setElementsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-800"
          >
            Drag elements
            <span className="text-gray-400">{elementsOpen ? "▾" : "▸"}</span>
          </button>
          {elementsOpen ? (
            <div className="space-y-1 px-2 pb-4">
              {TEMPLATE_ELEMENTS.map((el) => (
                <div
                  key={el.kind}
                  draggable
                  onDragStart={onDragStart(el.kind)}
                  className="flex cursor-grab items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50 active:cursor-grabbing"
                >
                  <ElementIcon icon={el.icon} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{el.label}</p>
                    <p className="text-xs text-gray-500">{el.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
