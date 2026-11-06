"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Tool = "brush" | "eraser";

type Props = {
  imageUrl: string;
  onCancel: () => void;
  onDone: (file: File) => void;
};

const COLORS = [
  "#ef4444",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ffffff",
  "#0d0d0d",
];

const SIZES = [
  { id: "s", label: "S", value: 4 },
  { id: "m", label: "M", value: 10 },
  { id: "l", label: "L", value: 20 },
  { id: "xl", label: "XL", value: 36 },
];

function IconBrush({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 15.5L4 21m9.5-9.5l2.5-2.5a3.5 3.5 0 10-5-5L8.5 7.5" />
      <path strokeLinecap="round" d="M14 6l4 4" />
    </svg>
  );
}

function IconEraser({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7H6l-3-3 9-9 7 5z" />
      <path strokeLinecap="round" d="M8 11l5 5" />
    </svg>
  );
}

async function loadImageAsObjectUrl(url: string): Promise<string> {
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
  if (!res.ok) throw new Error("Could not load image for marking");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export default function DesignPaintMarkup({ imageUrl, onCancel, onDone }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const marksDataUrlRef = useRef<string | null>(null);

  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1].value);
  const [saving, setSaving] = useState(false);
  const [hasMarks, setHasMarks] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [error, setError] = useState("");

  /** Fetch to a same-origin blob URL so canvas export is not tainted. */
  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setLoadingImage(true);
    setReady(false);
    setHasMarks(false);
    setCanUndo(false);
    setError("");
    historyRef.current = [];
    marksDataUrlRef.current = null;
    setLocalUrl(null);

    void (async () => {
      try {
        const next = await loadImageAsObjectUrl(imageUrl);
        if (cancelled) {
          if (next.startsWith("blob:") && next !== imageUrl) URL.revokeObjectURL(next);
          return;
        }
        objectUrl = next;
        setLocalUrl(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load image");
        }
      } finally {
        if (!cancelled) setLoadingImage(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl.startsWith("blob:") && objectUrl !== imageUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  const syncCanvasSize = useCallback(() => {
    const img = imageRef.current;
    const canvas = drawRef.current;
    const stage = stageRef.current;
    if (!img || !canvas || !stage || !img.naturalWidth) return;

    const maxW = stage.clientWidth;
    const maxH = stage.clientHeight;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const prev = marksDataUrlRef.current;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    img.style.width = `${w}px`;
    img.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (prev) {
      const restore = new Image();
      restore.onload = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(restore, 0, 0, w, h);
      };
      restore.src = prev;
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const onResize = () => syncCanvasSize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [syncCanvasSize]);

  const pushHistory = () => {
    const canvas = drawRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [...historyRef.current.slice(-24), snap];
      setCanUndo(true);
    } catch {
      /* ignore tainted/security edge cases */
    }
  };

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const paintTo = (x: number, y: number) => {
    const canvas = drawRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const prev = lastPoint.current;
    ctx.lineWidth = size;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.beginPath();
    if (prev) {
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.01, y + 0.01);
    }
    ctx.stroke();
    lastPoint.current = { x, y };
    setHasMarks(true);
    try {
      marksDataUrlRef.current = canvas.toDataURL("image/png");
    } catch {
      /* ignore */
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const point = getPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pushHistory();
    drawing.current = true;
    lastPoint.current = point;
    paintTo(point.x, point.y);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    event.preventDefault();
    const point = getPoint(event);
    if (!point) return;
    paintTo(point.x, point.y);
  };

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  };

  const undo = () => {
    const canvas = drawRef.current;
    const ctx = canvas?.getContext("2d");
    const prev = historyRef.current.pop();
    if (!canvas || !ctx || !prev) {
      setCanUndo(false);
      return;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.putImageData(prev, 0, 0);
    setCanUndo(historyRef.current.length > 0);
    const empty = !ctx
      .getImageData(0, 0, canvas.width, canvas.height)
      .data.some((v, i) => i % 4 === 3 && v !== 0);
    setHasMarks(!empty);
    try {
      marksDataUrlRef.current = empty ? null : canvas.toDataURL("image/png");
    } catch {
      marksDataUrlRef.current = null;
    }
  };

  const clearMarks = () => {
    const canvas = drawRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    pushHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    marksDataUrlRef.current = null;
    setHasMarks(false);
  };

  const finish = async () => {
    const img = imageRef.current;
    const draw = drawRef.current;
    if (!img?.naturalWidth || !draw || !localUrl) return;
    if (!hasMarks) {
      setError("Mark the area you want changed, then tap Use marking.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      /**
       * Always redraw from a blob/data source so export never hits a tainted canvas
       * (cross-origin /uploads without CORS taint on plain <img src>).
       */
      const source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const next = new Image();
        next.onload = () => resolve(next);
        next.onerror = () => reject(new Error("Could not prepare marked image"));
        next.src = localUrl;
      });

      const out = document.createElement("canvas");
      out.width = source.naturalWidth || img.naturalWidth;
      out.height = source.naturalHeight || img.naturalHeight;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas");
      ctx.drawImage(source, 0, 0, out.width, out.height);
      ctx.drawImage(draw, 0, 0, out.width, out.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob(resolve, "image/png", 0.95)
      );
      if (!blob) throw new Error("Could not export marked image");
      const file = new File([blob], `marked-${Date.now()}.png`, {
        type: "image/png",
      });
      onDone(file);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save marking";
      setError(
        /tainted/i.test(message)
          ? "Could not export marking. Try again or re-open Mark."
          : message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-[#111111] text-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10"
        >
          Cancel
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-medium">Mark what to change</p>
          <p className="truncate text-[11px] text-white/55">
            Circle or highlight an area, then describe the change
          </p>
        </div>
        <button
          type="button"
          disabled={saving || loadingImage || !localUrl}
          onClick={() => void finish()}
          className="min-h-10 rounded-full bg-white px-3.5 text-sm font-medium text-[#0d0d0d] disabled:opacity-60 sm:px-4"
        >
          {saving ? "Saving…" : "Use marking"}
        </button>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5"
      >
        {loadingImage || !localUrl ? (
          <p className="text-sm text-white/60">
            {loadingImage ? "Loading image…" : "Image unavailable"}
          </p>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={localUrl}
              alt="Mark up"
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
              onLoad={() => syncCanvasSize()}
            />
            <canvas
              ref={drawRef}
              className={`absolute touch-none ${ready ? "" : "pointer-events-none opacity-0"}`}
              style={{
                cursor: tool === "eraser" ? "cell" : "crosshair",
                touchAction: "none",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
            />
          </>
        )}
      </div>

      {error ? (
        <p className="px-4 pb-1 text-center text-xs text-red-300">{error}</p>
      ) : null}

      <div className="shrink-0 space-y-3 border-t border-white/10 bg-[#1a1a1a] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setTool("brush")}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm ${
              tool === "brush" ? "bg-white text-[#0d0d0d]" : "bg-white/10 text-white"
            }`}
          >
            <IconBrush />
            Brush
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm ${
              tool === "eraser" ? "bg-white text-[#0d0d0d]" : "bg-white/10 text-white"
            }`}
          >
            <IconEraser />
            Eraser
          </button>
          <button
            type="button"
            disabled={!canUndo}
            onClick={undo}
            className="inline-flex h-10 items-center rounded-full bg-white/10 px-3 text-sm text-white disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!hasMarks}
            onClick={clearMarks}
            className="inline-flex h-10 items-center rounded-full bg-white/10 px-3 text-sm text-white disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              title={swatch}
              onClick={() => {
                setColor(swatch);
                setTool("brush");
              }}
              className={`h-8 w-8 rounded-full border-2 ${
                color === swatch && tool === "brush"
                  ? "border-white scale-110"
                  : "border-white/25"
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] text-white/50">Size</span>
          {SIZES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSize(item.value)}
              className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-xs font-medium ${
                size === item.value ? "bg-white text-[#0d0d0d]" : "bg-white/10 text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
