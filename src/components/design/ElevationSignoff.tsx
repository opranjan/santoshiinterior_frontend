"use client";

import Link from "next/link";
import React, { useRef, useState } from "react";
import { printElevationSheet } from "@/lib/elevationPrint";

type MaterialRow = {
  id: string;
  material: string;
  sizes: string;
  code: string;
  thickness: string;
  image?: string;
};

const DEFAULT_MATERIALS: MaterialRow[] = [
  { id: "1", material: "MARINE PLYWOOD", sizes: "8x4", code: "", thickness: "18mm" },
  { id: "2", material: "DECK PLY", sizes: "8x3", code: "", thickness: "6mm" },
  { id: "3", material: "INNER LAMINATE (FABRICATED)", sizes: "8x4", code: "", thickness: "0.8" },
  { id: "4", material: "OUTER LAMINATE", sizes: "8x4", code: "71731 PAS EARTH BROWN", thickness: "1mm" },
  { id: "5", material: "OUTER LAMINATE", sizes: "8x4", code: "1154 SGL TANDEM GRAY", thickness: "1mm" },
  { id: "6", material: "OUTER LAMINATE", sizes: "8x4", code: "CL 794 SF | BURNT WILD TEAK", thickness: "1mm" },
  { id: "7", material: "FEVICOL", sizes: "", code: "", thickness: "" },
  { id: "8", material: "MASKING TAPE", sizes: "1\"", code: "", thickness: "" },
  { id: "9", material: "EDGE BINDING", sizes: "22MM", code: "WHITE COLOR", thickness: "0.8" },
  { id: "10", material: "EDGE BINDING", sizes: "22MM", code: "AS PER LAMINATE", thickness: "0.8" },
  { id: "11", material: "EDGE BINDING", sizes: "22MM", code: "AS PER LAMINATE", thickness: "0.8" },
  { id: "12", material: "EDGE BINDING", sizes: "22MM", code: "AS PER LAMINATE", thickness: "0.8" },
  { id: "13", material: "HEATEX", sizes: "", code: "", thickness: "" },
];

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

function SignaturePad({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1c1610";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="sign-box">
      <canvas
        ref={canvasRef}
        width={420}
        height={110}
        className="h-20 w-full cursor-crosshair border-b border-[#1c1610] bg-transparent"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <p className="sign-label mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">{label}</p>
      <button type="button" onClick={clear} className="no-print mt-1 text-xs text-[#8a7b68] hover:text-[#1c1610]">
        Clear
      </button>
    </div>
  );
}

export default function ElevationSignoff() {
  const [docTitle, setDocTitle] = useState("PROJECT SIGNOFF");
  const [clientName, setClientName] = useState("COMMANDER ANIL.");
  const [siteAddress, setSiteAddress] = useState("BIANA");
  const [date, setDate] = useState("14/06/2026");
  const [workingKicker, setWorkingKicker] = useState("WORKING SHEET");
  const [sheetTitle, setSheetTitle] = useState("1.MODULAR KITCHEN");
  const [drawingsTitle, setDrawingsTitle] = useState("COMMANDER KUBER KITCHEN");
  const [materialTitle, setMaterialTitle] = useState("KITCHEN MATERIAL SHEET");
  const [termsTitle, setTermsTitle] = useState("TERMS AND CONDITION");
  const [rows, setRows] = useState(DEFAULT_MATERIALS);
  const [terms, setTerms] = useState(TERMS);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);

  const updateRow = (id: string, patch: Partial<MaterialRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#b0a89d]">Architecture</p>
          <h1 className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-[#111111] dark:text-white">
            Elevation
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-[#eceae6] bg-white p-1 shadow-sm">
            <Link
              href="/design/designing"
              className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-[#6b6560] hover:text-[#111111]"
            >
              Designing
            </Link>
            <Link
              href="/design/elevation"
              className="rounded-lg bg-[#111111] px-3.5 py-1.5 text-sm font-medium text-white"
            >
              Elevation
            </Link>
          </div>
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
      <div className="elevation-print-sheet mx-auto min-h-0 w-full max-w-[210mm] flex-1 space-y-4 overflow-y-auto bg-white">
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
                  data-print-class="cover-meta-value"
                  className="w-full bg-transparent text-center text-[11px] uppercase tracking-[0.12em] text-white outline-none"
                />
              </label>
              <label className="text-center">
                <span className="cover-meta-label mb-1 block text-[10px] uppercase tracking-[0.18em] text-white/60">Site address</span>
                <input
                  aria-label="Site address"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  data-print-class="cover-meta-value"
                  className="w-full bg-transparent text-center text-[11px] uppercase tracking-[0.12em] text-white outline-none"
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
          <input
            aria-label="Material sheet title"
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
            data-print-class="section-heading"
            className={`${fieldClass} section-heading mb-3 font-semibold uppercase tracking-[0.08em]`}
          />
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
                      <label className="no-print cursor-pointer text-[11px] font-semibold text-[#9a7748]">
                        {row.image ? "Change" : "Add"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            const url = URL.createObjectURL(file);
                            if (row.image) URL.revokeObjectURL(row.image);
                            updateRow(row.id, { image: url });
                          }}
                        />
                      </label>
                      {row.image ? (
                        <button
                          type="button"
                          className="no-print text-[11px] text-[#8a7b68]"
                          onClick={() => {
                            URL.revokeObjectURL(row.image!);
                            updateRow(row.id, { image: undefined });
                          }}
                        >
                          Remove
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
          <button
            type="button"
            className="no-print mt-2 text-sm font-semibold text-[#9a7748]"
            onClick={() =>
              setRows((prev) => [...prev, { id: `${Date.now()}`, material: "", sizes: "", code: "", thickness: "" }])
            }
          >
            + Add material
          </button>
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
    </div>
  );
}
