"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const accent = {
  text: "text-[#E85D75]",
  bg: "bg-[#E85D75]",
  bgHover: "hover:bg-[#d94c65]",
  soft: "bg-[#E85D75]/10",
  borderSoft: "border-[#E85D75]/40",
};

export type MakerChargeRow = {
  id: string;
  name: string;
  type: "Percent" | "Amount";
  value: string;
  discountApplicable?: boolean;
};

export type MakerSettings = {
  margin: number;
  tax: string;
  useItemTax: boolean;
  hideTax: boolean;
  summaryType: "default" | "custom";
  charges: MakerChargeRow[];
  discounts: MakerChargeRow[];
};

export const defaultMakerSettings: MakerSettings = {
  margin: 0,
  tax: "",
  useItemTax: false,
  hideTax: false,
  summaryType: "default",
  charges: [],
  discounts: [],
};

const TAX_OPTIONS = ["GST 0%", "GST 5%", "GST 12%", "GST 18%", "GST 28%"];

const outlined =
  "h-12 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-gray-500 focus:outline-hidden dark:border-gray-600 dark:text-white/90";

function FloatingField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <span className="pointer-events-none absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
        {label}
      </span>
    </div>
  );
}

function TrashButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.text} hover:bg-[#E85D75]/10`}
      aria-label="Delete"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M8 7l1 12a1 1 0 001 1h4a1 1 0 001-1l1-12"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

type Props = {
  open: boolean;
  initial: MakerSettings;
  onClose: () => void;
  onSave: (next: MakerSettings) => void;
};

export default function MakerSettingsModal({
  open,
  initial,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<MakerSettings>(initial);

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, initial]);

  if (!open || typeof document === "undefined") return null;

  const addCharge = () =>
    setDraft((prev) => ({
      ...prev,
      charges: [
        ...prev.charges,
        {
          id: `chg-${Date.now()}`,
          name: "",
          type: "Percent",
          value: "",
          discountApplicable: true,
        },
      ],
    }));

  const addDiscount = () =>
    setDraft((prev) => ({
      ...prev,
      discounts: [
        ...prev.discounts,
        {
          id: `disc-${Date.now()}`,
          name: "",
          type: "Percent",
          value: "0",
        },
      ],
    }));

  return createPortal(
    <div
      className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSave(draft)}
              className={`inline-flex h-9 items-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatingField label="Quotation Margin">
            <div className="flex">
              <input
                type="number"
                min={0}
                value={draft.margin}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    margin: Number(e.target.value) || 0,
                  }))
                }
                className={`${outlined} rounded-r-none`}
              />
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-r-xl border border-l-0 border-gray-300 bg-gray-50 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800">
                %
              </span>
            </div>
          </FloatingField>

          <div>
            <select
              value={draft.tax}
              onChange={(e) =>
                setDraft((p) => ({ ...p, tax: e.target.value }))
              }
              className={outlined}
            >
              <option value="">Select Tax</option>
              {TAX_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.useItemTax}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, useItemTax: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 accent-[#E85D75]"
                />
                Use Item Level Tax
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.hideTax}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, hideTax: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 accent-[#E85D75]"
                />
                Hide &amp; Include Tax in Item Price
              </label>
            </div>
          </div>
        </div>

        <div
          className={`mt-5 flex flex-col gap-3 rounded-xl border ${accent.borderSoft} ${accent.soft} px-4 py-3 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            Quotation Summary Type
          </p>
          <div className="flex items-center gap-5">
            {(
              [
                { id: "default", label: "Default" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.id}
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="radio"
                  name="maker-summary"
                  checked={draft.summaryType === opt.id}
                  onChange={() =>
                    setDraft((p) => ({ ...p, summaryType: opt.id }))
                  }
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-6 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Additional Charges
              </h3>
              <button
                type="button"
                onClick={addCharge}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${accent.bg} text-white ${accent.bgHover}`}
                aria-label="Add charge"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            {draft.charges.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.04] dark:text-gray-400">
                <span className="mt-0.5 text-gray-400">ⓘ</span>
                Click on the + button to add additional charges.
              </div>
            ) : (
              <div className="space-y-3">
                {draft.charges.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1.4fr_0.9fr_0.8fr_auto_auto]"
                  >
                    <FloatingField label="Name">
                      <input
                        value={row.name}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            charges: p.charges.map((c) =>
                              c.id === row.id
                                ? { ...c, name: e.target.value }
                                : c
                            ),
                          }))
                        }
                        className={outlined}
                        placeholder="Name"
                      />
                    </FloatingField>
                    <FloatingField label="Type">
                      <select
                        value={row.type}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            charges: p.charges.map((c) =>
                              c.id === row.id
                                ? {
                                    ...c,
                                    type: e.target.value as "Percent" | "Amount",
                                  }
                                : c
                            ),
                          }))
                        }
                        className={outlined}
                      >
                        <option value="Percent">Percent</option>
                        <option value="Amount">Amount</option>
                      </select>
                    </FloatingField>
                    <FloatingField label="Value">
                      <input
                        value={row.value}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            charges: p.charges.map((c) =>
                              c.id === row.id
                                ? { ...c, value: e.target.value }
                                : c
                            ),
                          }))
                        }
                        className={outlined}
                        placeholder="Value"
                      />
                    </FloatingField>
                    <label className="mb-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={Boolean(row.discountApplicable)}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            charges: p.charges.map((c) =>
                              c.id === row.id
                                ? {
                                    ...c,
                                    discountApplicable: e.target.checked,
                                  }
                                : c
                            ),
                          }))
                        }
                        className="h-4 w-4 rounded accent-[#E85D75]"
                      />
                      Discount Applicable
                    </label>
                    <TrashButton
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          charges: p.charges.filter((c) => c.id !== row.id),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Discounts
              </h3>
              <button
                type="button"
                onClick={addDiscount}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${accent.bg} text-white ${accent.bgHover}`}
                aria-label="Add discount"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            {draft.discounts.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.04] dark:text-gray-400">
                <span className="mt-0.5 text-gray-400">ⓘ</span>
                Click on the + button to add discounts.
              </div>
            ) : (
              <div className="space-y-3">
                {draft.discounts.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1.4fr_0.9fr_0.8fr_auto]"
                  >
                    <FloatingField label="Name">
                      <input
                        value={row.name}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            discounts: p.discounts.map((c) =>
                              c.id === row.id
                                ? { ...c, name: e.target.value }
                                : c
                            ),
                          }))
                        }
                        className={outlined}
                        placeholder="Name"
                      />
                    </FloatingField>
                    <FloatingField label="Type">
                      <select
                        value={row.type}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            discounts: p.discounts.map((c) =>
                              c.id === row.id
                                ? {
                                    ...c,
                                    type: e.target.value as "Percent" | "Amount",
                                  }
                                : c
                            ),
                          }))
                        }
                        className={outlined}
                      >
                        <option value="Percent">Percent</option>
                        <option value="Amount">Amount</option>
                      </select>
                    </FloatingField>
                    <FloatingField label="Value">
                      <input
                        value={row.value}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            discounts: p.discounts.map((c) =>
                              c.id === row.id
                                ? { ...c, value: e.target.value }
                                : c
                            ),
                          }))
                        }
                        className={outlined}
                        placeholder="0"
                      />
                    </FloatingField>
                    <TrashButton
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          discounts: p.discounts.filter((c) => c.id !== row.id),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
