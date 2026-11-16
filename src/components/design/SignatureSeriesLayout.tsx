"use client";

import React, { useEffect, useRef } from "react";
import { designAssetUrl } from "@/lib/designAssets";
import {
  catalogId,
  cloneElevations,
  cloneHardware,
  createDefaultHardware,
  createEmptyElevation,
  createEmptyHardware,
  createEmptyKitchenPage,
  createEmptyPriceRow,
  createSignatureSeriesDefaults,
  isKnownSignatureKitchen,
  kitchenSlugFromName,
  sanitizeElevations,
  sanitizeKitchenBannerUrl,
  type KitchenCatalogDoc,
  type SignatureElevation,
  type SignatureHardware,
  type SignatureKitchenPage,
  type SignaturePriceRow,
  type SignatureSeriesBlock,
} from "@/lib/kitchenCatalogDefaults";

function SignatureDescriptionEditor({
  html,
  onChange,
}: {
  html: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const synced = useRef(html);

  useEffect(() => {
    if (!ref.current) return;
    if (html === synced.current) return;
    ref.current.innerHTML = html || "";
    synced.current = html;
  }, [html]);

  return (
    <div
      ref={ref}
      className="signature-description"
      contentEditable
      suppressContentEditableWarning
      data-placeholder="Package description / inclusions"
      dangerouslySetInnerHTML={{ __html: html || "" }}
      onBlur={(e) => {
        const next = e.currentTarget.innerHTML;
        synced.current = next;
        onChange(next);
      }}
    />
  );
}

const toolBtn =
  "inline-flex h-7 items-center rounded-md border border-[#cfd6de] bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3a4654] hover:border-[#9aa7b5]";
const toolDanger =
  "inline-flex h-7 items-center rounded-md border border-red-200 bg-red-50 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-700";

function revokeBlobUrl(url?: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function fileUrl(file: File | undefined | null) {
  if (!file) return "";
  return URL.createObjectURL(file);
}

function TitleBlock({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="signature-title-wrap">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="signature-series-title"
      />
      <div className="signature-ornament" aria-hidden>
        <span className="signature-ornament-line" />
        <span className="signature-ornament-diamond" />
        <span className="signature-ornament-line" />
      </div>
    </div>
  );
}

const SIGNATURE_DEFAULT_LOGO = "/images/logo/santoshi-interiors.jpg";

function LogoBlock({
  doc,
  onDoc,
}: {
  doc: KitchenCatalogDoc;
  onDoc: (patch: Partial<KitchenCatalogDoc>) => void;
}) {
  const logoUrl = String(doc.logoUrl || "").trim() || SIGNATURE_DEFAULT_LOGO;
  return (
    <div className="signature-logo-wrap">
      <div className="signature-logo-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="Santoshi Interiors" className="signature-logo" />
      </div>
      <label className="no-print signature-inline-btn cursor-pointer">
        Change logo
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            revokeBlobUrl(doc.logoUrl);
            onDoc({ logoUrl: URL.createObjectURL(file) });
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function PriceTable({
  rows,
  showTools,
  kitchenLabel,
  onUpdate,
  onRemove,
  onAddRow,
}: {
  rows: SignaturePriceRow[];
  showTools?: boolean;
  kitchenLabel?: string;
  onUpdate: (id: string, patch: Partial<SignaturePriceRow>) => void;
  onRemove: (id: string) => void;
  onAddRow?: () => void;
}) {
  return (
    <div className="signature-price-wrap">
      {showTools ? (
        <div className="no-print mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a8794]">
            Size packages (E1–E5) · {kitchenLabel || "Kitchen"} · {rows.length} loaded
          </p>
          {onAddRow ? (
            <button type="button" className={toolBtn} onClick={onAddRow}>
              + Add package row
            </button>
          ) : null}
        </div>
      ) : null}
      <table className="signature-price-table">
        <thead>
          <tr>
            <th>SR NO</th>
            <th>MODEL</th>
            <th>TOTAL AREA (SQ.FT)</th>
            <th>TOTAL AMOUNT</th>
            {showTools ? <th className="no-print">TOOLS</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, idx) => (
              <tr key={row.id} className={idx % 2 ? "is-alt" : undefined}>
                <td>
                  <input
                    value={row.sr}
                    onChange={(e) => onUpdate(row.id, { sr: Number(e.target.value) || 0 })}
                    className="signature-price-input"
                  />
                </td>
                <td>
                  <input
                    value={row.model}
                    onChange={(e) => onUpdate(row.id, { model: e.target.value })}
                    className="signature-price-input"
                    placeholder="E1"
                  />
                </td>
                <td>
                  <input
                    value={row.area}
                    onChange={(e) => onUpdate(row.id, { area: e.target.value })}
                    className="signature-price-input"
                    placeholder="50 (SQ.FT)"
                  />
                </td>
                <td>
                  <input
                    value={row.amount}
                    onChange={(e) => onUpdate(row.id, { amount: e.target.value })}
                    className="signature-price-input"
                    placeholder="₹0/-"
                  />
                </td>
                {showTools ? (
                  <td className="no-print">
                    <button type="button" className={toolDanger} onClick={() => onRemove(row.id)}>
                      Remove
                    </button>
                  </td>
                ) : null}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={showTools ? 5 : 4} className="!bg-[#f3f5f7] !py-4 text-center">
                <div className="no-print space-y-2 px-3">
                  <p className="text-[12px] font-semibold text-[#3a4654]">
                    No size packages in this catalog
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#7a8794]">
                    Modular catalog has no E1–E5 items yet. Add packages in Modular Catalog, then
                    click <strong>Load Signature Series data</strong> — or add a row here to draft
                    pricing.
                  </p>
                  {onAddRow ? (
                    <button type="button" className={toolBtn} onClick={onAddRow}>
                      + Add package row
                    </button>
                  ) : null}
                </div>
                <span className="print-only text-[9pt] text-[#6b7280]">No packages</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function SignatureSeriesLayout({
  doc,
  onDoc,
  onSignature,
}: {
  doc: KitchenCatalogDoc;
  onDoc: (patch: Partial<KitchenCatalogDoc>) => void;
  onSignature: (updater: (prev: SignatureSeriesBlock) => SignatureSeriesBlock) => void;
}) {
  const sig = doc.signature;
  const kitchens =
    sig.kitchens?.length > 0
      ? sig.kitchens.map((kitchen) => {
          const slug = kitchenSlugFromName(kitchen.heading);
          const known = isKnownSignatureKitchen(kitchen.heading);
          return {
            ...kitchen,
            imageUrl: sanitizeKitchenBannerUrl(kitchen.imageUrl),
            elevations: sanitizeElevations(kitchen.elevations),
            hardware: Array.isArray(kitchen.hardware)
              ? kitchen.hardware
              : known && slug
                ? createDefaultHardware(slug)
                : [],
            // Never invent E1–E5 — empty array means catalog has no size packages
            priceRows: Array.isArray(kitchen.priceRows) ? kitchen.priceRows : [],
          };
        })
      : [
          {
            id: "sig-kitchen-fallback",
            heading: sig.kitchenName || "SMART STORAGE. MODERN LIVING",
            description: sig.description || "",
            imageUrl: sanitizeKitchenBannerUrl(sig.heroImageUrl),
            show: sig.showHeroPage !== false,
            elevations: sanitizeElevations([]),
            hardware: [],
            priceRows: Array.isArray(sig.priceRows) ? sig.priceRows : [],
          },
        ];

  const patchSig = (patch: Partial<SignatureSeriesBlock>) =>
    onSignature((prev) => ({ ...prev, ...patch }));

  const kitchenList = (prev: SignatureSeriesBlock): SignatureKitchenPage[] => {
    if (prev.kitchens?.length) return prev.kitchens;
    // Persist rendered fallback kitchens into state so edits stick
    return kitchens.map((kitchen) => ({
      ...kitchen,
      elevations: Array.isArray(kitchen.elevations) ? kitchen.elevations : [],
      hardware: Array.isArray(kitchen.hardware) ? kitchen.hardware : [],
      priceRows: Array.isArray(kitchen.priceRows) ? kitchen.priceRows : [],
    }));
  };

  const syncKitchenMeta = (list: SignatureKitchenPage[], prev: SignatureSeriesBlock) => {
    const first = list[0];
    return {
      ...prev,
      kitchens: list,
      kitchenName: first?.heading || prev.kitchenName,
      description: first?.description || prev.description,
      heroImageUrl: first?.imageUrl || prev.heroImageUrl,
      priceRows: first?.priceRows ?? prev.priceRows,
      elevations: first?.elevations ?? prev.elevations,
      hardware: first?.hardware ?? prev.hardware,
    };
  };

  const updateKitchen = (id: string, patch: Partial<SignatureKitchenPage>) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((row) => (row.id === id ? { ...row, ...patch } : row));
      return syncKitchenMeta(list, prev);
    });
  };

  const setKitchenImage = (id: string, file: File | undefined | null) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((row) => {
        if (row.id !== id) return row;
        revokeBlobUrl(row.imageUrl);
        return { ...row, imageUrl: fileUrl(file) };
      });
      return syncKitchenMeta(list, prev);
    });
  };

  const updateKitchenPrice = (
    kitchenId: string,
    rowId: string,
    patch: Partial<SignaturePriceRow>
  ) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        return {
          ...kitchen,
          priceRows: (kitchen.priceRows || []).map((row) =>
            row.id === rowId ? { ...row, ...patch } : row
          ),
        };
      });
      return syncKitchenMeta(list, prev);
    });
  };

  const kitchenElevations = (kitchen: SignatureKitchenPage) =>
    sanitizeElevations(kitchen.elevations);

  const kitchenHardware = (kitchen: SignatureKitchenPage) => {
    if (Array.isArray(kitchen.hardware)) return kitchen.hardware;
    const slug = kitchenSlugFromName(kitchen.heading);
    if (isKnownSignatureKitchen(kitchen.heading) && slug) return createDefaultHardware(slug);
    return [];
  };

  const updateElevation = (
    kitchenId: string,
    elevationId: string,
    patch: Partial<SignatureElevation>
  ) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        const current = Array.isArray(kitchen.elevations) ? kitchen.elevations : [];
        return {
          ...kitchen,
          elevations: current.map((row) =>
            row.id === elevationId ? { ...row, ...patch } : row
          ),
        };
      });
      return syncKitchenMeta(list, prev);
    });
  };

  const setElevationImage = (
    kitchenId: string,
    elevationId: string,
    file: File | undefined | null
  ) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        const current = Array.isArray(kitchen.elevations) ? kitchen.elevations : [];
        return {
          ...kitchen,
          elevations: current.map((row) => {
            if (row.id !== elevationId) return row;
            revokeBlobUrl(row.imageUrl);
            return { ...row, imageUrl: fileUrl(file) };
          }),
        };
      });
      return syncKitchenMeta(list, prev);
    });
  };

  const removeElevation = (kitchenId: string, elevationId: string) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        const current = Array.isArray(kitchen.elevations) ? kitchen.elevations : [];
        return {
          ...kitchen,
          elevations: current.filter((row) => row.id !== elevationId),
        };
      });
      return syncKitchenMeta(list, prev);
    });
  };

  const addElevation = (kitchenId: string) => {
    onSignature((prev) => {
      let found = false;
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        found = true;
        const current = Array.isArray(kitchen.elevations) ? kitchen.elevations : [];
        return {
          ...kitchen,
          elevations: [...current, createEmptyElevation("")],
        };
      });
      const next = found
        ? list
        : [
            ...list,
            {
              ...createEmptyKitchenPage("Kitchen"),
              id: kitchenId,
              elevations: [createEmptyElevation("")],
            },
          ];
      return syncKitchenMeta(next, prev);
    });
  };

  const updateHardware = (
    kitchenId: string,
    hardwareId: string,
    patch: Partial<SignatureHardware>
  ) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        const current = Array.isArray(kitchen.hardware) ? kitchen.hardware : [];
        return {
          ...kitchen,
          hardware: current.map((row) =>
            row.id === hardwareId ? { ...row, ...patch } : row
          ),
        };
      });
      return syncKitchenMeta(list, prev);
    });
  };

  const setHardwareImage = (
    kitchenId: string,
    hardwareId: string,
    file: File | undefined | null
  ) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        const current = Array.isArray(kitchen.hardware) ? kitchen.hardware : [];
        return {
          ...kitchen,
          hardware: current.map((row) => {
            if (row.id !== hardwareId) return row;
            revokeBlobUrl(row.imageUrl);
            return { ...row, imageUrl: fileUrl(file) };
          }),
        };
      });
      return syncKitchenMeta(list, prev);
    });
  };

  const removeHardware = (kitchenId: string, hardwareId: string) => {
    onSignature((prev) => {
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        const current = Array.isArray(kitchen.hardware) ? kitchen.hardware : [];
        return {
          ...kitchen,
          hardware: current.filter((row) => row.id !== hardwareId),
        };
      });
      return syncKitchenMeta(list, prev);
    });
  };

  const addHardware = (kitchenId: string) => {
    onSignature((prev) => {
      let found = false;
      const list = kitchenList(prev).map((kitchen) => {
        if (kitchen.id !== kitchenId) return kitchen;
        found = true;
        const current = Array.isArray(kitchen.hardware) ? kitchen.hardware : [];
        return {
          ...kitchen,
          hardware: [...current, createEmptyHardware("NEW ITEM")],
        };
      });
      const next = found
        ? list
        : [
            ...list,
            {
              ...createEmptyKitchenPage("Kitchen"),
              id: kitchenId,
              hardware: [createEmptyHardware("NEW ITEM")],
            },
          ];
      return syncKitchenMeta(next, prev);
    });
  };

  return (
    <>
      <div className="no-print mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-[#d5dde5] bg-[#f4f6f8] p-2">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a8794]">
          Signature sections
        </span>
        <button
          type="button"
          className={toolBtn}
          onClick={() =>
            onSignature((prev) => ({
              ...prev,
              kitchens: [
                ...(prev.kitchens?.length ? prev.kitchens : kitchens),
                createEmptyKitchenPage(`Kitchen ${(prev.kitchens?.length || kitchens.length) + 1}`),
              ],
              showHeroPage: true,
            }))
          }
        >
          + Kitchen section
        </button>
        {(
          [
            ["showSpecsPage", "Specs page"],
            ["showElevations", "Elevations"],
            ["showHardware", "Hardware"],
            ["showPriceTable", "Price tables"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className={`${toolBtn} cursor-pointer gap-1`}>
            <input
              type="checkbox"
              checked={Boolean(sig[key])}
              onChange={(e) => patchSig({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>

      {kitchens.map((kitchen, kitchenIndex) =>
        kitchen.show === false ? (
          <div key={kitchen.id} className="no-print mb-3">
            <button
              type="button"
              className={toolBtn}
              onClick={() => updateKitchen(kitchen.id, { show: true })}
            >
              + Show {kitchen.heading || `kitchen ${kitchenIndex + 1}`}
            </button>
          </div>
        ) : (
          <div key={kitchen.id} className="signature-kitchen-block">
            {/* Hero: heading + description + image */}
            <section className="catalog-page catalog-signature-hero">
              <div className="no-print mb-2 flex flex-wrap gap-1.5 bg-[#e9eff1]">
                <span className="mr-1 self-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a8794]">
                  {kitchen.heading || `Kitchen ${kitchenIndex + 1}`}
                </span>
                <label className={`${toolBtn} cursor-pointer`}>
                  Change image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setKitchenImage(kitchen.id, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={toolDanger}
                  onClick={() => updateKitchen(kitchen.id, { show: false })}
                >
                  Hide section
                </button>
                <button
                  type="button"
                  className={toolDanger}
                  onClick={() =>
                    onSignature((prev) => ({
                      ...prev,
                      kitchens: (prev.kitchens?.length ? prev.kitchens : kitchens).filter(
                        (row) => row.id !== kitchen.id
                      ),
                    }))
                  }
                >
                  Remove kitchen
                </button>
              </div>

              <div className="signature-hero-inner">
                <div className="signature-hero-top">
                  <LogoBlock doc={doc} onDoc={onDoc} />
                  <TitleBlock
                    value={sig.seriesTitle}
                    onChange={(seriesTitle) => patchSig({ seriesTitle })}
                  />
                  <div />
                </div>

                <input
                  value={kitchen.heading}
                  onChange={(e) => updateKitchen(kitchen.id, { heading: e.target.value })}
                  className="signature-kitchen-name"
                  placeholder="Kitchen heading"
                />
                <SignatureDescriptionEditor
                  html={kitchen.description}
                  onChange={(description) => updateKitchen(kitchen.id, { description })}
                />

                <div className="signature-hero-media">
                  {kitchen.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={designAssetUrl(kitchen.imageUrl)} alt="" />
                  ) : (
                    <label className="signature-empty-hero no-print cursor-pointer">
                      <span className="signature-empty-hero-icon" aria-hidden>
                        <svg viewBox="0 0 48 36" className="h-7 w-9" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <rect x="2" y="4" width="44" height="28" rx="3" />
                          <path d="M8 26l8-9 6 5 7-8 11 12" strokeLinejoin="round" />
                          <circle cx="16" cy="13" r="2.5" />
                        </svg>
                      </span>
                      <span className="signature-empty-hero-title">Kitchen banner image</span>
                      <span className="signature-empty-hero-sub">
                        Full-width hero · click to upload a photo for this kitchen
                      </span>
                      <span className="signature-empty-hero-cta">Upload banner</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setKitchenImage(kitchen.id, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </section>

            {/* Specs: elevations + hardware ABOVE E1–E5 price rows */}
            {sig.showSpecsPage !== false ? (
              <section className="catalog-page catalog-signature-specs">
                <div className="no-print mb-2 flex flex-wrap gap-1.5 bg-[#e9eff1]">
                  <span className="mr-1 self-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a8794]">
                    Specs · {kitchen.heading || `Kitchen ${kitchenIndex + 1}`}
                  </span>
                  <button
                    type="button"
                    className={toolBtn}
                    onClick={() => addElevation(kitchen.id)}
                  >
                    + Elevation
                  </button>
                  <button
                    type="button"
                    className={toolBtn}
                    onClick={() => addHardware(kitchen.id)}
                  >
                    + Hardware
                  </button>
                  <button
                    type="button"
                    className={toolBtn}
                    onClick={() =>
                      updateKitchen(kitchen.id, {
                        priceRows: [
                          ...(kitchen.priceRows || []),
                          createEmptyPriceRow((kitchen.priceRows?.length || 0) + 1),
                        ],
                      })
                    }
                  >
                    + Price row
                  </button>
                </div>

                <div className="signature-specs-inner">
                  <div className="signature-specs-header">
                    <div />
                    <TitleBlock
                      value={sig.seriesTitle}
                      onChange={(seriesTitle) => patchSig({ seriesTitle })}
                    />
                    <div />
                  </div>

                  <div className="signature-specs-mid">
                    {sig.showElevations !== false ? (
                      <div className="signature-elevations">
                        {kitchenElevations(kitchen).length ? (
                          kitchenElevations(kitchen).map((el) => (
                            <div key={`${kitchen.id}-${el.id}`} className="signature-elevation-card">
                              <div className="no-print mb-1 flex flex-wrap gap-1">
                                <label className={`${toolBtn} cursor-pointer`}>
                                  Image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      setElevationImage(kitchen.id, el.id, e.target.files?.[0]);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  className={toolDanger}
                                  onClick={() => removeElevation(kitchen.id, el.id)}
                                >
                                  Remove
                                </button>
                              </div>
                              {el.title || !el.imageUrl ? (
                                <input
                                  value={el.title}
                                  onChange={(e) =>
                                    updateElevation(kitchen.id, el.id, { title: e.target.value })
                                  }
                                  className="signature-elevation-title"
                                  placeholder="Elevation title"
                                />
                              ) : null}
                              <div className="signature-elevation-media">
                                {el.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={designAssetUrl(el.imageUrl)} alt="" />
                                ) : (
                                  <div className="signature-empty-slot">Upload elevation drawing</div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="no-print col-span-2 rounded-lg border border-dashed border-[#c5ced8] bg-white/70 p-4 text-center">
                            <p className="text-[12px] font-semibold text-[#3a4654]">
                              No elevation drawings yet
                            </p>
                            <p className="mt-1 text-[11px] text-[#7a8794]">
                              Add drawings for this kitchen only — they won’t copy from other sections.
                            </p>
                            <button
                              type="button"
                              className={`${toolBtn} mt-2`}
                              onClick={() => addElevation(kitchen.id)}
                            >
                              + Elevation
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="no-print">
                        <button
                          type="button"
                          className={toolBtn}
                          onClick={() => patchSig({ showElevations: true })}
                        >
                          + Show elevations
                        </button>
                      </div>
                    )}

                    {sig.showHardware !== false ? (
                      <aside className="signature-hardware">
                        <input
                          value={sig.hardwareTitle}
                          onChange={(e) => patchSig({ hardwareTitle: e.target.value })}
                          className="signature-hardware-title"
                        />
                        <ul className="signature-hardware-list">
                          {kitchenHardware(kitchen).length ? (
                            kitchenHardware(kitchen).map((item) => (
                              <li
                                key={`${kitchen.id}-${item.id}`}
                                className="signature-hardware-item"
                              >
                                <div className="signature-hardware-thumb">
                                  {item.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={designAssetUrl(item.imageUrl)} alt="" />
                                  ) : (
                                    <span className="signature-empty-mini">+</span>
                                  )}
                                </div>
                                <span className="signature-hardware-rule" aria-hidden />
                                <div className="min-w-0 flex-1">
                                  <input
                                    value={item.label}
                                    onChange={(e) =>
                                      updateHardware(kitchen.id, item.id, {
                                        label: e.target.value,
                                      })
                                    }
                                    className="signature-hardware-label"
                                  />
                                  <div className="no-print mt-1 flex flex-wrap gap-1">
                                    <label className={`${toolBtn} cursor-pointer`}>
                                      Image
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          setHardwareImage(
                                            kitchen.id,
                                            item.id,
                                            e.target.files?.[0]
                                          );
                                          e.target.value = "";
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      className={toolDanger}
                                      onClick={() => removeHardware(kitchen.id, item.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="no-print px-2 py-3 text-center text-[10px] leading-relaxed text-[#7a8794]">
                              No hardware linked. Add items or load packages with BOM parts.
                              <div className="mt-2">
                                <button
                                  type="button"
                                  className={toolBtn}
                                  onClick={() => addHardware(kitchen.id)}
                                >
                                  + Hardware
                                </button>
                              </div>
                            </li>
                          )}
                        </ul>
                      </aside>
                    ) : (
                      <div className="no-print">
                        <button
                          type="button"
                          className={toolBtn}
                          onClick={() => patchSig({ showHardware: true })}
                        >
                          + Show hardware
                        </button>
                      </div>
                    )}
                  </div>

                  {sig.showPriceTable !== false ? (
                    <PriceTable
                      rows={kitchen.priceRows || []}
                      showTools
                      kitchenLabel={kitchen.heading}
                      onUpdate={(id, patch) => updateKitchenPrice(kitchen.id, id, patch)}
                      onRemove={(id) =>
                        updateKitchen(kitchen.id, {
                          priceRows: (kitchen.priceRows || []).filter((row) => row.id !== id),
                        })
                      }
                      onAddRow={() =>
                        updateKitchen(kitchen.id, {
                          priceRows: [
                            ...(kitchen.priceRows || []),
                            createEmptyPriceRow((kitchen.priceRows?.length || 0) + 1),
                          ],
                        })
                      }
                    />
                  ) : null}

                  <div className="signature-footer-logo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={String(doc.logoUrl || "").trim() || SIGNATURE_DEFAULT_LOGO}
                      alt="Santoshi Interiors"
                    />
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        )
      )}

      {sig.showSpecsPage === false ? (
        <div className="no-print mb-3">
          <button type="button" className={toolBtn} onClick={() => patchSig({ showSpecsPage: true })}>
            + Show specs pages (elevations above E1–E5)
          </button>
        </div>
      ) : null}
    </>
  );
}

export function cloneSignatureBlock(sig: SignatureSeriesBlock): SignatureSeriesBlock {
  return {
    ...structuredClone(sig),
    elevations: cloneElevations(sig.elevations),
    hardware: cloneHardware(sig.hardware),
    priceRows: sig.priceRows.map((row) => ({ ...row, id: catalogId() })),
    kitchens: (sig.kitchens || []).map((kitchen) => {
      const slug = kitchenSlugFromName(kitchen.heading);
      const known = isKnownSignatureKitchen(kitchen.heading);
      return {
        ...kitchen,
        id: catalogId(),
        elevations: cloneElevations(
          (kitchen.elevations || []).filter((row) => Boolean(String(row.imageUrl || "").trim())),
          slug
        ),
        hardware: cloneHardware(
          kitchen.hardware?.length
            ? kitchen.hardware
            : known && slug
              ? createDefaultHardware(slug)
              : []
        ),
        priceRows: (Array.isArray(kitchen.priceRows) ? kitchen.priceRows : []).map((row) => ({
          ...row,
          id: catalogId(),
        })),
      };
    }),
  };
}
