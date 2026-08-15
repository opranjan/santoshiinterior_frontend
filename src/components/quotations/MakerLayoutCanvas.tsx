"use client";

import React, { useMemo, useRef, useState } from "react";
import MakerRichTextEditor, {
  DEFAULT_BANK_HTML,
  DEFAULT_COMPANY_HTML,
  DEFAULT_TERMS_HTML,
  defaultPreparedHtml,
} from "./MakerRichTextEditor";

const accent = "#E85D75";

export type PaymentRow = {
  id: string;
  milestone: string;
  description: string;
  percent: string;
  amount: string;
};

export type FreeImageBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string;
};

export type PageBreakMode = "none" | "before" | "after" | "avoid";
export type ImageSizeMode = "half" | "full";

export type FlowBlock =
  | { id: string; type: "banner"; imageUrl: string }
  | {
      id: string;
      type: "image";
      imageUrl: string;
      size: ImageSizeMode;
      heightLevel: 1 | 2 | 3;
      pageBreak: PageBreakMode;
    }
  | { id: string; type: "detailsRow"; companyHtml: string; preparedHtml: string }
  | { id: string; type: "company"; html: string }
  | { id: string; type: "preparedFor"; html: string }
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "items" }
  | { id: string; type: "summary" }
  | { id: string; type: "payment"; rows: PaymentRow[] }
  | { id: string; type: "richtext"; title: string; html: string }
  | { id: string; type: "pageBreak"; mode: "break" };

export function createDefaultLayout(opts?: {
  clientName?: string;
  projectTitle?: string;
  phone?: string;
  reference?: string;
}): FlowBlock[] {
  const t = Date.now();
  return [
    {
      id: `blk-img-full-${t}`,
      type: "image",
      imageUrl: "",
      size: "full",
      heightLevel: 2,
      pageBreak: "none",
    },
    {
      id: `blk-img-a-${t}`,
      type: "image",
      imageUrl: "",
      size: "half",
      heightLevel: 1,
      pageBreak: "none",
    },
    {
      id: `blk-img-b-${t}`,
      type: "image",
      imageUrl: "",
      size: "half",
      heightLevel: 1,
      pageBreak: "none",
    },
    {
      id: `blk-details-${t}`,
      type: "detailsRow",
      companyHtml: DEFAULT_COMPANY_HTML,
      preparedHtml: defaultPreparedHtml(opts),
    },
    { id: `blk-heading-${t}`, type: "heading", text: "Estimate" },
    { id: `blk-items-${t}`, type: "items" },
    { id: `blk-summary-${t}`, type: "summary" },
    {
      id: `blk-pay-${t}`,
      type: "payment",
      rows: [
        {
          id: "pay-1",
          milestone: "Advance",
          description: "On booking confirmation",
          percent: "0",
          amount: "0",
        },
      ],
    },
    {
      id: `blk-bank-${t}`,
      type: "richtext",
      title: "Bank Details",
      html: DEFAULT_BANK_HTML,
    },
    {
      id: `blk-terms-${t}`,
      type: "richtext",
      title: "Terms And Conditions",
      html: DEFAULT_TERMS_HTML,
    },
  ];
}

export type MakerItemLite = {
  id: string;
  name: string;
  description: string;
  qty: number;
  uom: string;
  unitPrice: number;
  imageUrl?: string;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

const IMAGE_HEIGHT: Record<1 | 2 | 3, string> = {
  1: "h-28 sm:h-32",
  2: "h-40 sm:h-48",
  3: "h-56 sm:h-64",
};

function increaseImageSize<
  T extends { size: ImageSizeMode; heightLevel: 1 | 2 | 3 },
>(block: T): T {
  if (block.size === "half") return { ...block, size: "full" };
  if (block.heightLevel < 3) {
    return {
      ...block,
      heightLevel: (block.heightLevel + 1) as 1 | 2 | 3,
    };
  }
  return block;
}

function decreaseImageSize<
  T extends { size: ImageSizeMode; heightLevel: 1 | 2 | 3 },
>(block: T): T {
  if (block.size === "full" && block.heightLevel > 1) {
    return {
      ...block,
      heightLevel: (block.heightLevel - 1) as 1 | 2 | 3,
    };
  }
  if (block.size === "full") return { ...block, size: "half", heightLevel: 1 };
  if (block.heightLevel > 1) {
    return {
      ...block,
      heightLevel: (block.heightLevel - 1) as 1 | 2 | 3,
    };
  }
  return block;
}

function ImageToolbar({
  size,
  pageBreak,
  canIncrease,
  canDecrease,
  onIncrease,
  onDecrease,
  onPageBreak,
  onDelete,
  onMoveUp,
  onMoveDown,
  canUp,
  canDown,
}: {
  size: ImageSizeMode;
  pageBreak: PageBreakMode;
  canIncrease: boolean;
  canDecrease: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onPageBreak: (mode: PageBreakMode) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const [breakOpen, setBreakOpen] = useState(false);

  return (
    <div
      className="no-print absolute -bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-1 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={!canUp}
        title="Move up"
        onClick={onMoveUp}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={!canDown}
        title="Move down"
        onClick={onMoveDown}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-30"
      >
        ↓
      </button>
      <button
        type="button"
        disabled={!canIncrease}
        title="Increase size"
        onClick={onIncrease}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-30"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        disabled={!canDecrease}
        title="Decrease size"
        onClick={onDecrease}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-30"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="relative">
        <button
          type="button"
          title="Page break"
          onClick={() => setBreakOpen((v) => !v)}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-50 ${
            pageBreak !== "none" ? "text-[#E85D75]" : "text-gray-600"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 4h8l4 4v12H6V4zM14 4v4h4M4 12h16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="3 2"
            />
          </svg>
        </button>
        {breakOpen ? (
          <div className="absolute bottom-10 left-1/2 z-40 w-40 -translate-x-1/2 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
            {(
              [
                { id: "before", label: "Before", tip: "Inserts page break before element." },
                { id: "after", label: "After", tip: "Inserts page break after element." },
                { id: "avoid", label: "Avoid", tip: "Avoid splitting this element across pages." },
                { id: "none", label: "None", tip: "No page break." },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                title={opt.tip}
                onClick={() => {
                  onPageBreak(opt.id);
                  setBreakOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span
                  className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded border ${
                    pageBreak === opt.id
                      ? "border-[#E85D75] bg-[#E85D75] text-white"
                      : "border-gray-300"
                  }`}
                >
                  {pageBreak === opt.id ? "✓" : ""}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        title="Delete"
        onClick={onDelete}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#E85D75] hover:bg-[#E85D75]/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <span className="px-1 text-[10px] text-gray-400">
        {size === "full" ? "Full" : "Half"}
      </span>
    </div>
  );
}

function UploadBox({
  imageUrl,
  onPick,
  selected,
  onSelect,
  className = "",
  label = "Upload Image",
  toolbar,
}: {
  imageUrl: string;
  onPick: (file: File) => void;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  label?: string;
  toolbar?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`maker-image-frame relative ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`maker-upload-slot flex h-full w-full items-center justify-center overflow-hidden border border-dashed text-sm print:overflow-hidden print:border-0 print:shadow-none ${
          selected
            ? "border-[#E85D75] bg-[#E85D75]/[0.04]"
            : "border-[#E85D75]/70 bg-[#E85D75]/[0.03]"
        } text-gray-500 hover:bg-[#E85D75]/[0.06]`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[#E85D75]">
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
          </span>
        )}
      </button>
      {selected ? toolbar : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function BlockChrome({
  selected,
  blockId,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragStart,
  canUp,
  canDown,
  label,
  children,
}: {
  selected: boolean;
  blockId: string;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDragStart: (id: string) => void;
  canUp: boolean;
  canDown: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`group relative rounded-lg transition print:shadow-none print:ring-0 ${
        selected
          ? "ring-2 ring-[#E85D75]/50"
          : "hover:ring-1 hover:ring-gray-200"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {selected ? (
        <div className="no-print absolute -top-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-0.5 shadow-lg">
          <span className="mr-1 max-w-[100px] truncate px-1 text-[10px] font-medium text-gray-500">
            {label}
          </span>
          <button
            type="button"
            disabled={!canUp}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={!canDown}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              onDragStart(blockId);
              e.dataTransfer.setData("block-id", blockId);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-full text-gray-500 hover:bg-gray-50 active:cursor-grabbing"
            title="Drag to reorder"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#E85D75] hover:bg-[#E85D75]/10"
            title="Remove section"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function FreeImage({
  block,
  selected,
  containerRef,
  onSelect,
  onChange,
  onRemove,
}: {
  block: FreeImageBlock;
  selected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onChange: (b: FreeImageBlock) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{
    mode: "move" | "resize";
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
  } | null>(null);

  const clamp = (x: number, y: number, w: number, h: number) => {
    const box = containerRef.current?.getBoundingClientRect();
    const maxW = box?.width ?? 800;
    const width = Math.max(120, Math.min(w, maxW - 16));
    const height = Math.max(80, Math.min(h, 600));
    return {
      x: Math.max(0, Math.min(x, maxW - width)),
      y: Math.max(0, y),
      width,
      height,
    };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (d.mode === "move") {
      onChange({
        ...block,
        ...clamp(d.ox + dx, d.oy + dy, block.width, block.height),
      });
    } else {
      onChange({
        ...block,
        ...clamp(d.ox, d.oy, d.ow + dx, d.oh + dy),
      });
    }
  };

  const end = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`no-print absolute z-20 touch-none overflow-hidden rounded-md print:hidden ${
        selected
          ? "border-2 border-[#E85D75] shadow-lg"
          : "border border-dashed border-[#E85D75]/70"
      }`}
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        cursor: "grab",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        e.preventDefault();
        onSelect();
        drag.current = {
          mode: "move",
          sx: e.clientX,
          sy: e.clientY,
          ox: block.x,
          oy: block.y,
          ow: block.width,
          oh: block.height,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {block.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.imageUrl}
          alt=""
          className="pointer-events-none h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <button
          type="button"
          data-no-drag
          onClick={() => inputRef.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#E85D75]"
        >
          <span className="text-xs font-medium">Upload Image</span>
        </button>
      )}
      {selected ? (
        <>
          <div
            data-no-drag
            className="no-print absolute right-1 top-1 flex gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-no-drag
              onClick={() => inputRef.current?.click()}
              className="rounded bg-white/95 px-2 py-1 text-[11px] font-medium text-[#E85D75] shadow"
            >
              {block.imageUrl ? "Replace" : "Upload"}
            </button>
            <button
              type="button"
              data-no-drag
              onClick={onRemove}
              className="h-7 w-7 rounded bg-white/95 text-gray-600 shadow"
            >
              ×
            </button>
          </div>
          <div
            data-no-drag
            className="no-print absolute bottom-0 right-0 h-4 w-4 cursor-se-resize bg-[#E85D75]"
            style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect();
              drag.current = {
                mode: "resize",
                sx: e.clientX,
                sy: e.clientY,
                ox: block.x,
                oy: block.y,
                ow: block.width,
                oh: block.height,
              };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={onMove}
            onPointerUp={end}
            onPointerCancel={end}
          />
        </>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-no-drag
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (block.imageUrl.startsWith("blob:")) URL.revokeObjectURL(block.imageUrl);
          onChange({ ...block, imageUrl: URL.createObjectURL(f) });
          e.target.value = "";
        }}
      />
    </div>
  );
}

type Props = {
  clientName: string;
  items: MakerItemLite[];
  itemsTotal: number;
  blocks: FlowBlock[];
  freeImages: FreeImageBlock[];
  onBlocksChange: (blocks: FlowBlock[]) => void;
  onFreeImagesChange: (images: FreeImageBlock[]) => void;
};

export default function MakerLayoutCanvas({
  clientName,
  items,
  itemsTotal,
  blocks,
  freeImages,
  onBlocksChange,
  onFreeImagesChange,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggingId = useRef<string | null>(null);

  const selectedIndex = useMemo(
    () => blocks.findIndex((b) => b.id === selectedId),
    [blocks, selectedId]
  );

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onBlocksChange(next);
  };

  const updateBlock = (id: string, patch: Partial<FlowBlock> | FlowBlock) => {
    onBlocksChange(
      blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as FlowBlock) : b
      )
    );
  };

  const removeBlock = (id: string) => {
    const target = blocks.find((b) => b.id === id);
    if (
      (target?.type === "banner" || target?.type === "image") &&
      "imageUrl" in target &&
      target.imageUrl.startsWith("blob:")
    ) {
      URL.revokeObjectURL(target.imageUrl);
    }
    onBlocksChange(blocks.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const pickFileUrl = (file: File) => URL.createObjectURL(file);

  const blockLabel = (b: FlowBlock) => {
    switch (b.type) {
      case "banner":
        return "Banner";
      case "image":
        return b.size === "full" ? "Image (full)" : "Image (half)";
      case "detailsRow":
        return "Company / Client";
      case "company":
        return "Company";
      case "preparedFor":
        return "Prepared for";
      case "heading":
        return "Heading";
      case "items":
        return "Items";
      case "summary":
        return "Summary";
      case "payment":
        return "Payment Plan";
      case "richtext":
        return b.title || "Text";
      case "pageBreak":
        return "Page break";
      default:
        return "Section";
    }
  };

  const renderBlock = (block: FlowBlock, index: number) => {
    const selected = selectedId === block.id;
    const chrome = (child: React.ReactNode) => (
      <BlockChrome
        selected={selected}
        blockId={block.id}
        label={blockLabel(block)}
        canUp={index > 0}
        canDown={index < blocks.length - 1}
        onSelect={() => setSelectedId(block.id)}
        onMoveUp={() => moveBlock(index, index - 1)}
        onMoveDown={() => moveBlock(index, index + 1)}
        onRemove={() => removeBlock(block.id)}
        onDragStart={(id) => {
          draggingId.current = id;
        }}
      >
        {child}
      </BlockChrome>
    );

    let body: React.ReactNode = null;
    let useImageChrome = false;

    if (block.type === "banner" || block.type === "image") {
      const imgBlock =
        block.type === "image"
          ? block
          : {
              ...block,
              size: "full" as ImageSizeMode,
              heightLevel: 2 as const,
              pageBreak: "none" as PageBreakMode,
            };
      const canIncrease =
        imgBlock.size === "half" || imgBlock.heightLevel < 3;
      const canDecrease =
        imgBlock.size === "full" || imgBlock.heightLevel > 1;
      useImageChrome = true;
      body = (
        <div
          className={`${
            imgBlock.pageBreak === "before"
              ? "border-t-2 border-dashed border-[#E85D75]/50 pt-3 print:border-0 print:pt-0 print-break-before"
              : ""
          }${
            imgBlock.pageBreak === "after" ? " print-break-after" : ""
          }`}
        >
          {imgBlock.pageBreak === "before" ? (
            <p className="no-print mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-[#E85D75]">
              Page break before
            </p>
          ) : null}
          <UploadBox
            imageUrl={block.imageUrl}
            selected={selected}
            onSelect={() => setSelectedId(block.id)}
            onPick={(f) => {
              if (block.imageUrl.startsWith("blob:")) {
                URL.revokeObjectURL(block.imageUrl);
              }
              if (block.type === "image") {
                updateBlock(block.id, { imageUrl: pickFileUrl(f) });
              } else {
                updateBlock(block.id, { imageUrl: pickFileUrl(f) });
              }
            }}
            className={`w-full rounded-md ${
              block.type === "image"
                ? IMAGE_HEIGHT[block.heightLevel]
                : IMAGE_HEIGHT[2]
            }`}
            toolbar={
              <ImageToolbar
                size={block.type === "image" ? block.size : "full"}
                pageBreak={block.type === "image" ? block.pageBreak : "none"}
                canIncrease={canIncrease}
                canDecrease={canDecrease}
                canUp={index > 0}
                canDown={index < blocks.length - 1}
                onMoveUp={() => moveBlock(index, index - 1)}
                onMoveDown={() => moveBlock(index, index + 1)}
                onIncrease={() => {
                  if (block.type !== "image") {
                    // promote banner to full image block semantics via size fields if we convert
                    onBlocksChange(
                      blocks.map((b) =>
                        b.id === block.id
                          ? {
                              id: b.id,
                              type: "image" as const,
                              imageUrl: block.imageUrl,
                              size: "full" as const,
                              heightLevel: 3 as const,
                              pageBreak: "none" as const,
                            }
                          : b
                      )
                    );
                    return;
                  }
                  updateBlock(block.id, increaseImageSize(block));
                }}
                onDecrease={() => {
                  if (block.type !== "image") return;
                  updateBlock(block.id, decreaseImageSize(block));
                }}
                onPageBreak={(mode) => {
                  if (block.type !== "image") {
                    onBlocksChange(
                      blocks.map((b) =>
                        b.id === block.id
                          ? {
                              id: b.id,
                              type: "image" as const,
                              imageUrl: block.imageUrl,
                              size: "full" as const,
                              heightLevel: 2 as const,
                              pageBreak: mode,
                            }
                          : b
                      )
                    );
                    return;
                  }
                  updateBlock(block.id, { pageBreak: mode });
                }}
                onDelete={() => removeBlock(block.id)}
              />
            }
          />
          {(block.type === "image" ? block.pageBreak : "none") === "after" ? (
            <p className="no-print mt-2 text-center text-[10px] font-medium uppercase tracking-wide text-[#E85D75]">
              Page break after
            </p>
          ) : null}
          {(block.type === "image" ? block.pageBreak : "none") === "avoid" ? (
            <p className="no-print mt-1 text-center text-[10px] text-gray-400">
              Avoid page split
            </p>
          ) : null}
        </div>
      );
    } else if (block.type === "detailsRow") {
      body = (
        <div className="relative z-10 grid grid-cols-1 gap-3 bg-white sm:grid-cols-2">
          <MakerRichTextEditor
            inline
            dragHandle
            value={block.companyHtml}
            onChange={(html) => updateBlock(block.id, { companyHtml: html })}
            onRemove={() => removeBlock(block.id)}
            onFocusChange={(f) => {
              if (f) setSelectedId(block.id);
            }}
          />
          <MakerRichTextEditor
            inline
            dragHandle
            value={block.preparedHtml}
            onChange={(html) => updateBlock(block.id, { preparedHtml: html })}
            onRemove={() => removeBlock(block.id)}
            onFocusChange={(f) => {
              if (f) setSelectedId(block.id);
            }}
          />
        </div>
      );
    } else if (block.type === "company") {
      body = (
        <MakerRichTextEditor
          inline
          dragHandle
          value={block.html}
          onChange={(html) => updateBlock(block.id, { html })}
          onRemove={() => removeBlock(block.id)}
          onFocusChange={(f) => {
            if (f) setSelectedId(block.id);
          }}
        />
      );
    } else if (block.type === "preparedFor") {
      body = (
        <MakerRichTextEditor
          inline
          dragHandle
          value={block.html}
          onChange={(html) => updateBlock(block.id, { html })}
          onRemove={() => removeBlock(block.id)}
          onFocusChange={(f) => {
            if (f) setSelectedId(block.id);
          }}
        />
      );
    } else if (block.type === "heading") {
      body = (
        <input
          value={block.text}
          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
          className="w-full border-0 bg-transparent text-center font-serif text-2xl font-semibold outline-none"
          style={{ color: accent }}
        />
      );
    } else if (block.type === "items") {
      body = (
        <div className="quotation-items-table overflow-hidden rounded-md border border-gray-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="text-xs font-medium text-gray-900">
              <tr>
                <th className="border border-gray-900 px-3 py-2">S.No</th>
                <th className="border border-gray-900 px-3 py-2">Description</th>
                <th className="border border-gray-900 px-3 py-2">Image</th>
                <th className="border border-gray-900 px-3 py-2">UOM</th>
                <th className="border border-gray-900 px-3 py-2">USP</th>
                <th className="border border-gray-900 px-3 py-2">QTY</th>
                <th className="border border-gray-900 px-3 py-2 text-right">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border border-gray-900 px-3 py-2 text-gray-600">
                    {idx + 1}
                  </td>
                  <td className="border border-gray-900 px-3 py-2 font-medium">
                    {item.name || item.description || "Item"}
                  </td>
                  <td className="border border-gray-900 px-3 py-2 text-gray-400">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border border-gray-900 px-3 py-2">
                    {item.uom}
                  </td>
                  <td className="border border-gray-900 px-3 py-2">
                    ₹ {item.unitPrice.toLocaleString("en-IN")}
                  </td>
                  <td className="border border-gray-900 px-3 py-2">
                    {item.qty}
                  </td>
                  <td className="border border-gray-900 px-3 py-2 text-right font-medium">
                    ₹ {(item.qty * item.unitPrice).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (block.type === "summary") {
      body = (
        <div className="quotation-summary-table">
          <h3
            className="mb-2 font-serif text-base font-semibold"
            style={{ color: accent }}
          >
            Summary
          </h3>
          <div className="overflow-hidden rounded-md border border-gray-900">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="text-xs font-medium text-gray-900">
                <tr>
                  <th className="border border-gray-900 px-3 py-2">S.No</th>
                  <th className="border border-gray-900 px-3 py-2">Name</th>
                  <th className="border border-gray-900 px-3 py-2">Quantity</th>
                  <th className="border border-gray-900 px-3 py-2">Price</th>
                  <th className="border border-gray-900 px-3 py-2">Discount</th>
                  <th className="border border-gray-900 px-3 py-2 text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border border-gray-900 px-3 py-2 text-gray-600">
                      {idx + 1}
                    </td>
                    <td className="border border-gray-900 px-3 py-2">
                      {item.name || item.description || "Item"}
                    </td>
                    <td className="border border-gray-900 px-3 py-2">
                      {item.qty}
                    </td>
                    <td className="border border-gray-900 px-3 py-2">
                      ₹ {item.unitPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="border border-gray-900 px-3 py-2">—</td>
                    <td className="border border-gray-900 px-3 py-2 text-right">
                      ₹ {(item.qty * item.unitPrice).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={5}
                    className="border border-gray-900 px-3 py-2 text-right font-semibold"
                    style={{ color: accent }}
                  >
                    Final Total
                  </td>
                  <td
                    className="border border-gray-900 px-3 py-2 text-right font-semibold"
                    style={{ color: accent }}
                  >
                    ₹ {Math.round(itemsTotal).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (block.type === "payment") {
      const rows = block.rows;
      const pct = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0);
      const amt = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      body = (
        <div className="rounded-lg border border-gray-200">
          <h3
            className="px-3 pt-3 font-serif text-base font-semibold"
            style={{ color: accent }}
          >
            Payment Plan
          </h3>
          <div className="overflow-x-auto px-2 pb-3 pt-2">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="px-2 py-2">S.No</th>
                  <th className="px-2 py-2">Milestone</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Percent</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="no-print w-10 px-1 py-2" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="px-2 py-1.5 text-gray-500">{idx + 1}</td>
                    {(
                      ["milestone", "description", "percent", "amount"] as const
                    ).map((key) => (
                      <td key={key} className="px-1 py-1">
                        <input
                          value={row[key]}
                          onChange={(e) =>
                            updateBlock(block.id, {
                              rows: rows.map((r) =>
                                r.id === row.id
                                  ? { ...r, [key]: e.target.value }
                                  : r
                              ),
                            })
                          }
                          className="h-8 w-full rounded border border-transparent px-1.5 hover:border-gray-200 focus:border-[#E85D75] focus:outline-hidden"
                        />
                      </td>
                    ))}
                    <td className="no-print px-1 py-1 text-center">
                      <button
                        type="button"
                        title={
                          rows.length <= 1
                            ? "At least one milestone is required"
                            : "Remove milestone"
                        }
                        disabled={rows.length <= 1}
                        onClick={() =>
                          updateBlock(block.id, {
                            rows: rows.filter((r) => r.id !== row.id),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-[#E85D75] hover:bg-[#E85D75]/10 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Remove milestone"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M10 11v6M14 11v6M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="px-2 py-2 text-right font-medium">
                    Total
                  </td>
                  <td className="px-2 py-2 font-semibold" style={{ color: accent }}>
                    {pct}%
                  </td>
                  <td className="px-2 py-2 font-semibold">
                    ₹ {amt.toLocaleString("en-IN")}
                  </td>
                  <td className="no-print" />
                </tr>
              </tbody>
            </table>
          </div>
          {selected ? (
            <div className="no-print flex justify-center gap-1 pb-3">
              <button
                type="button"
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs shadow"
                onClick={() =>
                  updateBlock(block.id, {
                    rows: [
                      ...rows,
                      {
                        id: uid("pay"),
                        milestone: "",
                        description: "",
                        percent: "0",
                        amount: "0",
                      },
                    ],
                  })
                }
              >
                + Milestone
              </button>
            </div>
          ) : null}
        </div>
      );
    } else if (block.type === "richtext") {
      body = (
        <MakerRichTextEditor
          title={block.title}
          value={block.html}
          onChange={(html) => updateBlock(block.id, { html })}
          onRemove={() => removeBlock(block.id)}
          onFocusChange={(f) => {
            if (f) setSelectedId(block.id);
          }}
        />
      );
    } else if (block.type === "pageBreak") {
      body = (
        <div className="print-page-break print:min-h-0">
          <div className="no-print flex items-center gap-3 py-2">
            <div className="h-px flex-1 border-t border-dashed border-[#E85D75]/60" />
            <span className="text-xs font-medium uppercase tracking-wide text-[#E85D75]">
              Page break
            </span>
            <div className="h-px flex-1 border-t border-dashed border-[#E85D75]/60" />
          </div>
        </div>
      );
    }

    const isImageBlock = block.type === "banner" || block.type === "image";
    const isHalfImage = block.type === "image" && block.size === "half";
    const widthClass = isHalfImage
      ? "w-full sm:w-[calc(50%-0.375rem)]"
      : "w-full";
    const hideWhenEmpty =
      isImageBlock && !("imageUrl" in block && block.imageUrl);

    return (
      <div
        key={block.id}
        className={`${widthClass} mb-4 ${hideWhenEmpty ? "print:hidden" : ""} ${
          dragOverId === block.id
            ? "outline outline-2 outline-dashed outline-[#E85D75]"
            : ""
        }`}
        draggable={false}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverId(block.id);
        }}
        onDragLeave={() => setDragOverId((id) => (id === block.id ? null : id))}
        onDrop={(e) => {
          e.preventDefault();
          const fromId = draggingId.current || e.dataTransfer.getData("block-id");
          setDragOverId(null);
          draggingId.current = null;
          if (!fromId || fromId === block.id) return;
          const from = blocks.findIndex((b) => b.id === fromId);
          const to = blocks.findIndex((b) => b.id === block.id);
          if (from >= 0 && to >= 0) moveBlock(from, to);
        }}
        onDragStartCapture={(e) => {
          const handle = (e.target as HTMLElement).closest(
            '[title="Drag to reorder"]'
          );
          if (!handle) return;
          draggingId.current = block.id;
          e.dataTransfer.setData("block-id", block.id);
          e.dataTransfer.effectAllowed = "move";
        }}
      >
        {useImageChrome ? body : chrome(body)}
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      className="quotation-print-sheet relative mx-auto min-h-[720px] w-full max-w-[860px] bg-white p-6 shadow-sm print:mx-0 print:min-h-0 print:max-w-none print:p-0 print:shadow-none sm:p-10"
      onClick={() => {
        setSelectedId(null);
      }}
    >
      {freeImages.map((img) => (
        <FreeImage
          key={img.id}
          block={img}
          selected={selectedId === img.id}
          containerRef={canvasRef}
          onSelect={() => setSelectedId(img.id)}
          onChange={(next) =>
            onFreeImagesChange(
              freeImages.map((f) => (f.id === next.id ? next : f))
            )
          }
          onRemove={() => {
            if (img.imageUrl.startsWith("blob:")) URL.revokeObjectURL(img.imageUrl);
            onFreeImagesChange(freeImages.filter((f) => f.id !== img.id));
            setSelectedId(null);
          }}
        />
      ))}

      <div className="relative z-0 flex flex-wrap gap-3">
        {blocks.map((b, i) => renderBlock(b, i))}
      </div>

      {blocks.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">
          Layout is empty. Use + to add sections or images.
        </p>
      ) : null}

      {selectedIndex >= 0 ? (
        <p className="no-print mt-2 text-center text-[11px] text-gray-400">
          Section {selectedIndex + 1} of {blocks.length} — use ↑ ↓ or drag to
          change position
        </p>
      ) : null}
    </div>
  );
}

export function createFlowBlock(
  kind:
    | "banner"
    | "image"
    | "imageHalf"
    | "imageFull"
    | "detailsRow"
    | "company"
    | "preparedFor"
    | "heading"
    | "items"
    | "summary"
    | "payment"
    | "richtext"
    | "bank"
    | "terms"
    | "pageBreak",
  preparedOpts?: Parameters<typeof defaultPreparedHtml>[0]
): FlowBlock {
  const id = uid("blk");
  switch (kind) {
    case "banner":
      return {
        id,
        type: "image",
        imageUrl: "",
        size: "full",
        heightLevel: 2,
        pageBreak: "none",
      };
    case "image":
    case "imageHalf":
      return {
        id,
        type: "image",
        imageUrl: "",
        size: "half",
        heightLevel: 1,
        pageBreak: "none",
      };
    case "imageFull":
      return {
        id,
        type: "image",
        imageUrl: "",
        size: "full",
        heightLevel: 2,
        pageBreak: "none",
      };
    case "detailsRow":
      return {
        id,
        type: "detailsRow",
        companyHtml: DEFAULT_COMPANY_HTML,
        preparedHtml: defaultPreparedHtml(preparedOpts),
      };
    case "company":
      return { id, type: "company", html: DEFAULT_COMPANY_HTML };
    case "preparedFor":
      return {
        id,
        type: "preparedFor",
        html: defaultPreparedHtml(preparedOpts),
      };
    case "heading":
      return { id, type: "heading", text: "Estimate" };
    case "items":
      return { id, type: "items" };
    case "summary":
      return { id, type: "summary" };
    case "payment":
      return {
        id,
        type: "payment",
        rows: [
          {
            id: uid("pay"),
            milestone: "Advance",
            description: "",
            percent: "0",
            amount: "0",
          },
        ],
      };
    case "bank":
      return {
        id,
        type: "richtext",
        title: "Bank Details",
        html: DEFAULT_BANK_HTML,
      };
    case "terms":
      return {
        id,
        type: "richtext",
        title: "Terms And Conditions",
        html: DEFAULT_TERMS_HTML,
      };
    case "richtext":
      return {
        id,
        type: "richtext",
        title: "New Section",
        html: "<p>Start typing…</p>",
      };
    case "pageBreak":
      return { id, type: "pageBreak", mode: "break" };
  }
}

export function createFreeImage(offset = 0): FreeImageBlock {
  return {
    id: uid("free"),
    x: 24 + (offset % 160),
    y: 24 + offset,
    width: 280,
    height: 160,
    imageUrl: "",
  };
}
