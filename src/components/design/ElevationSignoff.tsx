"use client";

import React, { useEffect, useRef, useState } from "react";
import { printElevationSheet } from "@/lib/elevationPrint";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import {
  elevationSeriesApi,
  projectsApi,
  type ElevationSeriesDto,
} from "@/services/crmApi";

type ProjectOption = {
  id: string;
  name: string;
  clientName: string;
  address: string;
};

type MaterialRow = {
  id: string;
  material: string;
  sizes: string;
  code: string;
  thickness: string;
  image?: string;
};

function CameraCaptureModal({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");
    setReady(false);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera is not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access and try again."
            : err instanceof Error
              ? err.message
              : "Could not open camera.";
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setReady(false);
    };
  }, [open]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#111111] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold tracking-wide">Camera</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="relative aspect-[4/3] bg-black">
          {error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-rose-200">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
          )}
          {!error && !ready ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
              Opening camera…
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || Boolean(error)}
            onClick={takePhoto}
            className="rounded-xl bg-[#e8d5b5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] disabled:opacity-40"
          >
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}


const TERMS = [
  {
    title: "1. Scope of Work",
    body: "The designer agrees to provide interior design services as per the approved design plan, drawings, and specifications. Any additional work requested beyond the agreed scope will be subject to a separate quotation and timeline.",
  },
  {
    title: "2. Project Timeline",
    body: "The standard project handover period is 45 calendar days from the date of commencement, subject to timely approvals and payments by the client. Delays caused by external factors may extend the timeline.",
  },
  {
    title: "3. Warranty",
    body: "All workmanship and fixed installations carry a 7-year warranty against structural defects, poor workmanship, or material failures. Warranty excludes normal wear and tear, misuse, unauthorized modifications, movable furniture, décor, and third-party appliances.",
  },
  {
    title: "4. Payments",
    body: "Payments shall be made in installments as per the agreed schedule. Work will commence only after receipt of the initial advance. Delayed payments may suspend work and extend the handover timeline.",
  },
  {
    title: "5. Client Responsibilities",
    body: "The client must provide timely approvals for designs, materials, and finishes, and grant site access during working hours to avoid delays.",
  },
  {
    title: "6. Variations & Changes",
    body: "Any changes after commencement must be documented and may affect cost and timeline. Pricing may be adjusted accordingly.",
  },
  {
    title: "7. Handover",
    body: "On completion, the project will be handed over with a formal inspection and sign-off. Defects identified at handover will be rectified within a reasonable period.",
  },
];

const fieldClass =
  "w-full border-0 border-b border-[#d9cbb8] bg-transparent px-0 py-1 text-sm text-[#1c1610] outline-none focus:border-[#c4a574]";
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

function SignatureDialog({
  open,
  label,
  initialDataUrl,
  onClose,
  onSave,
}: {
  open: boolean;
  label: string;
  initialDataUrl: string | null;
  onClose: () => void;
  onSave: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(initialDataUrl));

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(280, Math.floor(wrap.clientWidth));
    const height = Math.max(180, Math.floor(Math.min(wrap.clientWidth * 0.45, 280)));
    const prev = canvas.toDataURL("image/png");
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1c1610";
    ctx.lineWidth = 2.5;
    if (prev && prev !== "data:,") {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = prev;
    }
  };

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setHasInk(Boolean(initialDataUrl));
    const id = window.requestAnimationFrame(() => {
      resizeCanvas();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);
      if (initialDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          setHasInk(true);
        };
        img.src = initialDataUrl;
      }
    });
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [open, initialDataUrl]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    lastPoint.current = p;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    const prev = lastPoint.current || p;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
    if (!hasInk) setHasInk(true);
  };

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    setHasInk(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) {
      onSave(null);
      onClose();
      return;
    }
    onSave(canvas.toDataURL("image/png"));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#eadfcf] px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-[#1c1610]">{label}</h3>
            <p className="text-xs text-[#8a7b68]">Draw with your finger or stylus</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[#8a7b68] hover:bg-[#f4efe6] hover:text-[#1c1610]"
          >
            Close
          </button>
        </div>
        <div className="px-4 py-3">
          <div
            ref={wrapRef}
            className="overflow-hidden rounded-xl border border-[#d9cbb8] bg-[#fbf8f3]"
          >
            <canvas
              ref={canvasRef}
              className="block w-full touch-none cursor-crosshair"
              style={{ touchAction: "none" }}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eadfcf] px-4 py-3">
          <button
            type="button"
            onClick={clear}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#8a7b68] hover:bg-[#f4efe6]"
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#d9cbb8] px-4 py-2 text-sm font-medium text-[#1c1610]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!hasInk}
              className="rounded-lg bg-[#1c1610] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Use signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignaturePad({ label }: { label: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="sign-box">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={label}
          className="h-20 w-full border-b border-[#1c1610] object-contain bg-transparent"
        />
      ) : (
        <div className="flex h-20 w-full items-center justify-center border-b border-dashed border-[#c4a574] bg-[#fbf8f3] text-xs text-[#8a7b68]">
          No signature yet
        </div>
      )}
      <p className="sign-label mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">{label}</p>
      <div className="no-print mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-[#1c1610] px-3 py-1.5 text-xs font-semibold text-white"
        >
          {dataUrl ? "Re-sign" : "Tap to sign"}
        </button>
        {dataUrl ? (
          <button
            type="button"
            onClick={() => setDataUrl(null)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#8a7b68] hover:bg-[#f4efe6] hover:text-[#1c1610]"
          >
            Clear
          </button>
        ) : null}
      </div>
      <SignatureDialog
        open={open}
        label={label}
        initialDataUrl={dataUrl}
        onClose={() => setOpen(false)}
        onSave={setDataUrl}
      />
    </div>
  );
}

export default function ElevationSignoff() {
  const [docTitle, setDocTitle] = useState("PROJECT SIGNOFF");
  const [clientName, setClientName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  );
  const [workingKicker, setWorkingKicker] = useState("WORKING SHEET");
  const [sheetTitle, setSheetTitle] = useState("1.MODULAR KITCHEN");
  const [drawingsTitle, setDrawingsTitle] = useState("");
  const [materialTitle, setMaterialTitle] = useState("MATERIAL SHEET");
  const [termsTitle, setTermsTitle] = useState("TERMS AND CONDITION");
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [terms, setTerms] = useState(TERMS);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [cameraRowId, setCameraRowId] = useState<string | null>(null);
  const [seriesPickerOpen, setSeriesPickerOpen] = useState(false);
  const [seriesOptions, setSeriesOptions] = useState<ElevationSeriesDto[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProjectsLoading(true);
        const data = await projectsApi.list({ limit: 200 });
        if (cancelled) return;
        setProjects(
          (data.items || []).map((row) => {
            const p = row as Record<string, unknown>;
            return {
              id: String(p.id || ""),
              name: String(p.name || "Untitled project"),
              clientName: String(p.clientName || "").trim(),
              address: String(p.address || "").trim(),
            };
          }).filter((p) => p.id)
        );
      } catch (err) {
        if (!cancelled) {
          toastError(err instanceof Error ? err.message : "Failed to load projects");
        }
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyProject = (id: string) => {
    setProjectId(id);
    if (!id) return;
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    if (project.clientName) setClientName(project.clientName);
    if (project.address) setSiteAddress(project.address);
    if (!drawingsTitle.trim() && project.name) setDrawingsTitle(project.name);
  };

  const updateRow = (id: string, patch: Partial<MaterialRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const setRowImage = (id: string, file: File | null | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (row.image) URL.revokeObjectURL(row.image);
        return { ...row, image: url };
      })
    );
  };

  const addPhoto = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: `${Date.now()}-${file.name}-${file.size}`,
      url: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...next].slice(0, 12));
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((photo) => photo.id !== id);
    });
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const target = prev.find((row) => row.id === id);
      if (target?.image) URL.revokeObjectURL(target.image);
      return prev.filter((row) => row.id !== id);
    });
  };

  const openSeriesPicker = async () => {
    setSeriesPickerOpen(true);
    setSeriesLoading(true);
    try {
      const rows = await elevationSeriesApi.list();
      setSeriesOptions(rows);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to load series");
      setSeriesPickerOpen(false);
    } finally {
      setSeriesLoading(false);
    }
  };

  const applySeries = (series: ElevationSeriesDto) => {
    const imported = (series.materials || [])
      .filter((item) => item.material || item.sizes || item.code || item.thickness)
      .map((item, index) => ({
        id: `${Date.now()}-${index}-${Math.random()}`,
        material: item.material || "",
        sizes: item.sizes || "",
        code: item.code || "",
        thickness: item.thickness || "",
        image: item.imageUrl || undefined,
      }));
    if (!imported.length) {
      toastError("This series has no materials.");
      return;
    }
    setRows((prev) => [...prev, ...imported]);
    setMaterialTitle(series.name || "MATERIAL SHEET");
    setSeriesPickerOpen(false);
    toastSuccess(`Added ${imported.length} material(s) from ${series.name}.`);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="no-print mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#b0a89d]">Architecture</p>
          <h1 className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-[#111111] dark:text-white">
            Elevation
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[220px]">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
              Project
            </span>
            <select
              value={projectId}
              onChange={(e) => applyProject(e.target.value)}
              disabled={projectsLoading}
              className="h-9 w-full min-w-[240px] rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-white/10 dark:bg-[#1c1610] dark:text-white"
            >
              <option value="">
                {projectsLoading ? "Loading projects…" : "Select project"}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.clientName ? ` · ${p.clientName}` : ""}
                </option>
              ))}
            </select>
          </label>
          <a
            href="/templates/signedpdf2.pdf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-xl border border-[#eadfcf] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68]"
          >
            Original PDF
          </a>
          <button
            type="button"
            onClick={() => void printElevationSheet("signedpdf2")}
            className="inline-flex h-9 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
          >
            Create signedpdf2.pdf
          </button>
        </div>
      </div>

      <style>{`
        .elevation-print-sheet table th,
        .elevation-print-sheet table td { border: 1px solid #eadfcf; padding: 6px 8px; vertical-align: middle; }
        .elevation-print-sheet table th { background: #1c1610; color: #f4eadb; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
        .material-row-image { width: 56px; height: 42px; object-fit: contain; margin: 0 auto; display: block; }
      `}</style>
      <div className="elevation-print-sheet mx-auto min-h-0 w-full max-w-[210mm] flex-1 space-y-4 overflow-y-auto rounded-xl bg-white p-3 shadow-[0_0_0_1px_rgba(28,22,16,0.06)] md:p-4">
        <section className="elevation-cover overflow-hidden rounded-xl border border-[#eceae6]">
          <div className="elevation-cover-top flex flex-col items-center justify-center bg-black px-8 py-10 text-center text-white">
            <div className="cover-logo-wrap mb-8 flex h-[108px] w-[210px] items-center justify-center overflow-hidden">
              <img src="/images/logo/santoshi-interiors.jpg" alt="Santoshi Interiors" className="cover-logo h-[160px] w-auto object-cover" />
            </div>
            <input
              aria-label="Document title"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              data-print-class="cover-title"
              className="cover-title w-full bg-transparent text-center text-[28px] tracking-[0.32em] text-white outline-none"
              style={serif}
            />
            <div className="cover-rule mx-auto my-5 h-0.5 w-10 bg-[#c4a574]" />
            <div className="cover-meta grid w-full max-w-2xl grid-cols-3 gap-6">
              <label className="text-center">
                <span className="cover-meta-label mb-1 block text-[10px] uppercase tracking-[0.18em] text-white/60">Client name</span>
                <input
                  aria-label="Client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Select project"
                  data-print-class="cover-meta-value"
                  className="w-full bg-transparent text-center text-[11px] uppercase tracking-[0.12em] text-white outline-none placeholder:text-white/35"
                />
              </label>
              <label className="text-center">
                <span className="cover-meta-label mb-1 block text-[10px] uppercase tracking-[0.18em] text-white/60">Site address</span>
                <input
                  aria-label="Site address"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="Select project"
                  data-print-class="cover-meta-value"
                  className="w-full bg-transparent text-center text-[11px] uppercase tracking-[0.12em] text-white outline-none placeholder:text-white/35"
                />
              </label>
              <label className="text-center">
                <span className="cover-meta-label mb-1 block text-[10px] uppercase tracking-[0.18em] text-white/60">Date</span>
                <input
                  aria-label="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-print-class="cover-meta-value"
                  className="w-full bg-transparent text-center text-[11px] uppercase tracking-[0.12em] text-white outline-none"
                />
              </label>
            </div>
          </div>
          <div className="elevation-cover-bottom relative flex flex-col items-center justify-center bg-[#c8c8c8] px-8 py-10">
            <input
              aria-label="Working sheet kicker"
              value={workingKicker}
              onChange={(e) => setWorkingKicker(e.target.value)}
              data-print-class="working-kicker"
              className="relative w-full bg-transparent text-center text-2xl font-extrabold tracking-[0.14em] text-black outline-none"
            />
            <input
              aria-label="Working sheet title"
              value={sheetTitle}
              onChange={(e) => setSheetTitle(e.target.value)}
              data-print-class="working-title"
              className="relative mt-4 w-full bg-transparent text-center text-[30px] text-black outline-none"
              style={serif}
            />
          </div>
        </section>

        <section className="elevation-photos doc-section rounded-xl border border-[#eceae6] p-4">
          <input
            aria-label="Drawings title"
            value={drawingsTitle}
            onChange={(e) => setDrawingsTitle(e.target.value)}
            data-print-class="section-heading"
            className={`${fieldClass} section-heading font-semibold uppercase tracking-[0.08em]`}
          />
          <div className="photo-grid mt-3 grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="photo-cell relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f6f1ea]">
                <img src={photo.url} alt="" className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="no-print absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-[#8a7b68]"
                >
                  Remove
                </button>
              </div>
            ))}
            <label className="empty-slot no-print flex aspect-[4/3] cursor-pointer items-center justify-center rounded-md border border-dashed border-[#c4a574] text-sm text-[#8a7b68]">
              + Add drawing
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addPhoto(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </section>

        <section className="doc-section rounded-xl border border-[#eceae6] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <input
              aria-label="Material sheet title"
              value={materialTitle}
              onChange={(e) => setMaterialTitle(e.target.value)}
              data-print-class="section-heading"
              className={`${fieldClass} section-heading min-w-0 flex-1 font-semibold uppercase tracking-[0.08em]`}
            />
            <button
              type="button"
              onClick={() => void openSeriesPicker()}
              className="no-print inline-flex h-9 shrink-0 items-center rounded-xl bg-[#1c1610] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
            >
              + Add series
            </button>
          </div>
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="col-sr">Sr.</th>
                <th>Material</th>
                <th className="col-size">Sizes</th>
                <th>Code no.</th>
                <th className="col-thick">Thickness</th>
                <th className="col-img">Image</th>
                <th className="no-print w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-[#8a7b68]">
                    No materials yet. Use <span className="font-semibold">+ Add series</span> to
                    import from Elevation Collection.
                  </td>
                </tr>
              ) : null}
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td className="col-sr text-center text-[#8a7b68]">{index + 1}</td>
                  <td>
                    <input value={row.material} onChange={(e) => updateRow(row.id, { material: e.target.value })} className={fieldClass} />
                  </td>
                  <td className="col-size">
                    <input value={row.sizes} onChange={(e) => updateRow(row.id, { sizes: e.target.value })} className={fieldClass} />
                  </td>
                  <td>
                    <input value={row.code} onChange={(e) => updateRow(row.id, { code: e.target.value })} className={fieldClass} />
                  </td>
                  <td className="col-thick">
                    <input value={row.thickness} onChange={(e) => updateRow(row.id, { thickness: e.target.value })} className={fieldClass} />
                  </td>
                  <td className="col-img">
                    <div className="flex flex-col items-center gap-1">
                      {row.image ? (
                        <img src={row.image} alt="" className="material-row-image" />
                      ) : (
                        <div className="empty-slot material-row-image border border-dashed border-[#eadfcf]" />
                      )}
                      <div className="no-print flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                        <label className="cursor-pointer text-[11px] font-semibold text-[#9a7748]">
                          From file
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              setRowImage(row.id, e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <span className="text-[11px] text-[#c4b8a8]">·</span>
                        <button
                          type="button"
                          onClick={() => setCameraRowId(row.id)}
                          className="text-[11px] font-semibold text-[#9a7748]"
                        >
                          Camera
                        </button>
                      </div>
                      {row.image ? (
                        <button
                          type="button"
                          className="no-print text-[11px] text-[#8a7b68]"
                          onClick={() => {
                            URL.revokeObjectURL(row.image!);
                            updateRow(row.id, { image: undefined });
                          }}
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="no-print">
                    <button type="button" className="text-[11px] font-semibold text-[#8a7b68]" onClick={() => removeRow(row.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="no-print mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="text-sm font-semibold text-[#9a7748]"
              onClick={() => void openSeriesPicker()}
            >
              + Add series from collection
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-[#9a7748]"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  { id: `${Date.now()}`, material: "", sizes: "", code: "", thickness: "" },
                ])
              }
            >
              + Add material
            </button>
          </div>
        </section>

        <section className="doc-section rounded-xl border border-[#eceae6] p-4">
          <input
            aria-label="Terms title"
            value={termsTitle}
            onChange={(e) => setTermsTitle(e.target.value)}
            data-print-class="section-heading"
            className={`${fieldClass} section-heading mb-3 font-semibold uppercase tracking-[0.08em]`}
          />
          <div className="space-y-3">
            {terms.map((term, index) => (
              <div key={`${term.title}-${index}`} className="term-block">
                <div className="flex items-start gap-2">
                  <input
                    value={term.title}
                    onChange={(e) =>
                      setTerms((prev) => prev.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))
                    }
                    data-print-class="term-title"
                    className={`${fieldClass} font-semibold`}
                  />
                  <button
                    type="button"
                    className="no-print shrink-0 text-[11px] font-semibold text-[#8a7b68]"
                    onClick={() => setTerms((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  rows={Math.max(2, Math.ceil(term.body.length / 110))}
                  value={term.body}
                  onChange={(e) =>
                    setTerms((prev) => prev.map((row, i) => (i === index ? { ...row, body: e.target.value } : row)))
                  }
                  data-print-class="term-body"
                  className="mt-1 w-full resize-y bg-transparent text-sm leading-relaxed text-[#1c1610] outline-none"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="no-print mt-2 text-sm font-semibold text-[#9a7748]"
            onClick={() => setTerms((prev) => [...prev, { title: `${prev.length + 1}. New clause`, body: "" }])}
          >
            + Add clause
          </button>
          <div className="sign-row mt-6 grid gap-8 sm:grid-cols-2">
            <SignaturePad label="Sales authorized signature" />
            <SignaturePad label="Customer signature" />
          </div>
        </section>
      </div>

      <CameraCaptureModal
        open={Boolean(cameraRowId)}
        onClose={() => setCameraRowId(null)}
        onCapture={(file) => {
          if (cameraRowId) setRowImage(cameraRowId, file);
        }}
      />

      {seriesPickerOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#161411]">
            <div className="flex items-center justify-between border-b border-[#eadfcf] px-4 py-3 dark:border-[#3a342c]">
              <div>
                <h3 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                  Add series from collection
                </h3>
                <p className="text-xs text-[#8a7b68]">
                  Pick a series to add all of its materials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeriesPickerOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-[#8a7b68] hover:bg-[#f6efe4]"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
              {seriesLoading ? (
                <p className="py-6 text-center text-sm text-[#8a7b68]">Loading series…</p>
              ) : seriesOptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#8a7b68]">
                  No series yet. Create one under Design → Elevation Collection.
                </p>
              ) : (
                seriesOptions.map((series) => (
                  <button
                    key={series.id}
                    type="button"
                    onClick={() => applySeries(series)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-4 py-3 text-left hover:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1c1914]"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                        {series.name}
                      </span>
                      <span className="block text-xs text-[#8a7b68]">
                        {(series.materials || []).length} material
                        {(series.materials || []).length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748]">
                      Add
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
