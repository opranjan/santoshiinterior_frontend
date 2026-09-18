"use client";

import React from "react";
import type { FlowBlock } from "@/components/quotations/MakerLayoutCanvas";
import MakerRichTextEditor, {
  DEFAULT_BANK_HTML,
  DEFAULT_COMPANY_HTML,
  DEFAULT_TERMS_HTML,
  defaultPreparedHtml,
} from "@/components/quotations/MakerRichTextEditor";
import { designAssetUrl } from "@/lib/designAssets";
import { DRAG_MIME, elementToFlowBlock, type TemplateElementKind } from "@/lib/quotationTemplateEditor";

const accent = "#E85D75";

function blockLabel(block: FlowBlock): string {
  switch (block.type) {
    case "image":
      return block.size === "full" ? "Image (full)" : "Image (half)";
    case "company":
      return "Company Details";
    case "preparedFor":
      return "Project Details";
    case "detailsRow":
      return "Company + Prepared for";
    case "heading":
      return block.text || "Heading";
    case "items":
      return "Quotation Table";
    case "summary":
      return "Quotation Summary";
    case "payment":
      return "Payment Plan";
    case "richtext":
      return block.title || "Content Block";
    case "pageBreak":
      return "Page break";
    default:
      return "Section";
  }
}

function ensureHtml(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "<p></p>") return fallback;
  return value!;
}

type Props = {
  layout: FlowBlock[];
  font: string;
  primaryColour: string;
  watermarkUrl: string | null;
  onLayoutChange: (next: FlowBlock[]) => void;
};

function TemplateImageSlot({
  block,
  onChange,
}: {
  block: Extract<FlowBlock, { type: "image" }>;
  onChange: (patch: { imageUrl: string }) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const height =
    block.heightLevel === 3
      ? "h-56"
      : block.heightLevel === 1
        ? "h-28"
        : "h-40";
  const label = block.size === "full" ? "Upload logo" : "Upload image";

  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-md`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (block.imageUrl.startsWith("blob:")) {
            URL.revokeObjectURL(block.imageUrl);
          }
          onChange({ imageUrl: URL.createObjectURL(file) });
          e.target.value = "";
        }}
      />
      {block.imageUrl ? (
        <div className="maker-banner-slot relative h-full w-full bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={designAssetUrl(block.imageUrl)}
            alt=""
            className="mx-auto h-full max-h-full w-auto max-w-full rounded-xl object-contain"
          />
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded bg-white/95 px-2 py-1 text-[11px] font-medium text-[#E85D75] shadow"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                if (block.imageUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(block.imageUrl);
                }
                onChange({ imageUrl: "" });
              }}
              className="rounded bg-white/95 px-2 py-1 text-[11px] text-gray-600 shadow"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#E85D75]/60 bg-[#E85D75]/[0.03] text-sm text-[#E85D75] hover:bg-[#E85D75]/[0.06]"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2-2l1.2-1.2a2 2 0 012.8 0L20 15M8 8h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M12 8v6M9 11h6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-xs font-medium">{label}</span>
        </button>
      )}
    </div>
  );
}

export default function TemplateLayoutCanvas({
  layout,
  font,
  primaryColour,
  watermarkUrl,
  onLayoutChange,
}: Props) {
  const [dragOver, setDragOver] = React.useState(false);

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ||
    "http://localhost:5000";
  const wmSrc = watermarkUrl
    ? watermarkUrl.startsWith("http")
      ? watermarkUrl
      : `${apiBase}${watermarkUrl}`
    : null;

  const updateBlock = (id: string, patch: Partial<FlowBlock>) => {
    onLayoutChange(
      layout.map((block) =>
        block.id === id ? ({ ...block, ...patch } as FlowBlock) : block
      )
    );
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const kind = e.dataTransfer.getData(DRAG_MIME) as TemplateElementKind;
    if (!kind) return;
    onLayoutChange([...layout, elementToFlowBlock(kind)]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= layout.length) return;
    const copy = [...layout];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onLayoutChange(copy);
  };

  const remove = (id: string) => {
    onLayoutChange(layout.filter((b) => b.id !== id));
  };

  const renderBlock = (block: FlowBlock) => {
    if (block.type === "image" || block.type === "banner") {
      const imageBlock =
        block.type === "image"
          ? block
          : {
              id: block.id,
              type: "image" as const,
              imageUrl: block.imageUrl,
              size: "full" as const,
              heightLevel: 2 as const,
              pageBreak: "none" as const,
              fit: "contain" as const,
            };
      return (
        <TemplateImageSlot
          block={imageBlock}
          onChange={(patch) => updateBlock(block.id, patch)}
        />
      );
    }

    if (block.type === "heading") {
      return (
        <input
          value={block.text}
          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
          className="w-full border-0 bg-transparent text-center font-serif text-2xl font-semibold outline-none"
          style={{ color: primaryColour || accent }}
        />
      );
    }

    if (block.type === "items" || block.type === "summary" || block.type === "payment") {
      return (
        <div className="rounded-md border border-gray-300 px-3 py-4 text-center text-xs text-gray-500">
          {blockLabel(block)} — filled automatically when making a quotation
        </div>
      );
    }

    if (block.type === "detailsRow") {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MakerRichTextEditor
            inline
            value={ensureHtml(block.companyHtml, DEFAULT_COMPANY_HTML)}
            onChange={(html) => updateBlock(block.id, { companyHtml: html })}
          />
          <MakerRichTextEditor
            inline
            value={ensureHtml(block.preparedHtml, defaultPreparedHtml())}
            onChange={(html) => updateBlock(block.id, { preparedHtml: html })}
          />
        </div>
      );
    }

    if (block.type === "company") {
      return (
        <MakerRichTextEditor
          inline
          value={ensureHtml(block.html, DEFAULT_COMPANY_HTML)}
          onChange={(html) => updateBlock(block.id, { html })}
        />
      );
    }

    if (block.type === "preparedFor") {
      return (
        <MakerRichTextEditor
          inline
          value={ensureHtml(block.html, defaultPreparedHtml())}
          onChange={(html) => updateBlock(block.id, { html })}
        />
      );
    }

    if (block.type === "richtext") {
      const fallback =
        block.title.toLowerCase().includes("bank")
          ? DEFAULT_BANK_HTML
          : block.title.toLowerCase().includes("terms")
            ? DEFAULT_TERMS_HTML
            : "<p>Enter content…</p>";
      return (
        <MakerRichTextEditor
          title={block.title}
          value={ensureHtml(block.html, fallback)}
          qrImageUrl={
            block.title.toLowerCase().includes("bank")
              ? block.qrImageUrl || ""
              : undefined
          }
          onQrChange={
            block.title.toLowerCase().includes("bank")
              ? (url) => {
                  if (
                    block.qrImageUrl?.startsWith("blob:") &&
                    block.qrImageUrl !== url
                  ) {
                    URL.revokeObjectURL(block.qrImageUrl);
                  }
                  updateBlock(block.id, { qrImageUrl: url });
                }
              : undefined
          }
          onChange={(html) => updateBlock(block.id, { html })}
        />
      );
    }

    if (block.type === "pageBreak") {
      return (
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 border-t border-dashed border-[#E85D75]/60" />
          <span className="text-xs font-medium uppercase tracking-wide text-[#E85D75]">
            Page break
          </span>
          <div className="h-px flex-1 border-t border-dashed border-[#E85D75]/60" />
        </div>
      );
    }

    return (
      <div className="rounded-md border border-gray-200 px-3 py-3 text-xs text-gray-600">
        {blockLabel(block)}
      </div>
    );
  };

  return (
    <div
      className={`relative flex-1 overflow-auto bg-[#eef0f3] p-4 sm:p-6 ${
        dragOver ? "ring-2 ring-inset ring-[#E85D75]/40" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div
        className="relative mx-auto min-h-[720px] max-w-[860px] bg-white p-6 shadow-sm sm:p-10"
        style={{ fontFamily: font }}
      >
        {wmSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wmSrc}
            alt=""
            className="pointer-events-none absolute inset-0 z-0 mx-auto max-h-full max-w-full object-contain opacity-[0.08]"
          />
        ) : null}

        <div className="relative z-10 space-y-4">
          {layout.map((block, index) => (
            <div
              key={block.id}
              className="group relative rounded-lg border border-transparent hover:border-[#E85D75]/30"
            >
              <div className="absolute -top-3 right-0 z-20 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded bg-white px-2 py-0.5 text-xs shadow border border-gray-200 disabled:opacity-40"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === layout.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded bg-white px-2 py-0.5 text-xs shadow border border-gray-200 disabled:opacity-40"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(block.id)}
                  className="rounded bg-white px-2 py-0.5 text-xs text-[#E85D75] shadow border border-gray-200"
                  aria-label="Remove section"
                >
                  ×
                </button>
              </div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {blockLabel(block)}
              </p>
              {renderBlock(block)}
            </div>
          ))}

          {layout.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E85D75]/40 bg-[#E85D75]/[0.02] text-center">
              <p className="text-sm font-medium text-gray-700">
                Drag elements here
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Drop from the left sidebar to build your template
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
