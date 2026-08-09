"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Label from "@/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { quotationSettingsApi } from "@/services/crmApi";

const accent = {
  text: "text-[#E85D75]",
  border: "border-[#E85D75]",
  bg: "bg-[#E85D75]",
  bgHover: "hover:bg-[#d94c65]",
  underline: "bg-[#E85D75]",
  ring: "focus:border-[#E85D75] focus:ring-[#E85D75]/15",
};

const fieldClass = `h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`;

type TabId = "templates" | "config" | "modular" | "approval";

type QuotationTemplate = {
  id: string;
  name: string;
  font: string;
  colours: string[];
  isDefault?: boolean;
};

type NamedAmount = {
  id: string;
  name: string;
  value: string;
  type: "Percent" | "Amount";
  discountApplicable?: boolean;
};

type QuotationSettingsData = {
  templates: QuotationTemplate[];
  config: {
    fixedMargin: string;
    defaultMargin: number;
    maxDiscountLimit: "Disabled" | "Enabled";
    defaultTax: string;
    useItemTax: boolean;
    hideTax: boolean;
    summaryType: "default" | "custom";
    defaultDiscounts: NamedAmount[];
    defaultCharges: NamedAmount[];
  };
  modular: {
    calculatorType: "Box" | "Running" | "Area";
    fixedMargin: string;
    defaultMargin: number;
    maxDiscountLimit: "Disabled" | "Enabled";
    defaultTax: string;
    useItemTax: boolean;
    hideTax: boolean;
    addInstallationCharge: boolean;
    summaryType: "default" | "custom";
    defaultDiscounts: NamedAmount[];
    defaultCharges: NamedAmount[];
  };
  approval: {
    requireApproval: boolean;
    minAmount: number;
    approverRole: string;
  };
};

const defaultData: QuotationSettingsData = {
  templates: [
    {
      id: "tpl-1",
      name: "Default View Template",
      font: "Figtree",
      colours: ["#E85D75", "#111111"],
      isDefault: true,
    },
  ],
  config: {
    fixedMargin: "",
    defaultMargin: 0,
    maxDiscountLimit: "Disabled",
    defaultTax: "",
    useItemTax: false,
    hideTax: false,
    summaryType: "default",
    defaultDiscounts: [],
    defaultCharges: [],
  },
  modular: {
    calculatorType: "Box",
    fixedMargin: "0",
    defaultMargin: 0,
    maxDiscountLimit: "Disabled",
    defaultTax: "",
    useItemTax: false,
    hideTax: false,
    addInstallationCharge: false,
    summaryType: "default",
    defaultDiscounts: [],
    defaultCharges: [],
  },
  approval: {
    requireApproval: false,
    minAmount: 0,
    approverRole: "ADMIN",
  },
};

function normalizeNamedAmount(raw: unknown): NamedAmount {
  const row = (raw && typeof raw === "object" ? raw : {}) as Partial<
    NamedAmount & { unit?: string; value?: string | number }
  >;
  const type =
    row.type === "Amount" || row.type === "Percent"
      ? row.type
      : row.unit === "INR" || row.unit === "₹"
        ? "Amount"
        : "Percent";
  return {
    id: String(row.id || `row-${Date.now()}`),
    name: String(row.name || ""),
    value: row.value === undefined || row.value === null ? "" : String(row.value),
    type,
    discountApplicable: Boolean(row.discountApplicable),
  };
}

function FloatingField({
  label,
  required,
  children,
  invalid,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <span
        className={`pointer-events-none absolute -top-2 left-3 bg-white px-1 text-xs font-medium dark:bg-gray-900 ${
          invalid ? accent.text : "text-gray-600 dark:text-gray-300"
        }`}
      >
        {label}
        {required ? <span className="text-red-500">*</span> : null}
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

const outlinedInput = (invalid?: boolean) =>
  `h-12 w-full rounded-xl border bg-transparent px-4 text-sm text-gray-800 placeholder:text-transparent focus:outline-hidden dark:text-white/90 ${
    invalid
      ? "border-[#E85D75] focus:border-[#E85D75]"
      : "border-gray-300 focus:border-gray-500 dark:border-gray-600"
  }`;

const outlinedSelect = (invalid?: boolean) =>
  `h-12 w-full appearance-none rounded-xl border bg-transparent px-4 pr-8 text-sm text-gray-800 focus:outline-hidden dark:text-white/90 ${
    invalid
      ? "border-[#E85D75]"
      : "border-gray-300 focus:border-gray-500 dark:border-gray-600"
  }`;

const percentFieldClass = `h-11 min-w-0 flex-1 rounded-l-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`;
const percentSuffixClass =
  "inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

const TAX_OPTIONS = [
  "",
  "GST 0%",
  "GST 5%",
  "GST 12%",
  "GST 18%",
  "GST 28%",
];

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "templates", label: "Templates" },
  { id: "config", label: "Config" },
  { id: "modular", label: "Modular Config" },
  { id: "approval", label: "Quotation Approval" },
];

function normalizeSettings(raw: unknown): QuotationSettingsData {
  const value =
    raw && typeof raw === "object"
      ? (raw as Partial<QuotationSettingsData>)
      : {};
  return {
    templates:
      Array.isArray(value.templates) && value.templates.length
        ? value.templates.map((t) => ({
            id: String(t.id || `tpl-${Date.now()}`),
            name: String(t.name || "Untitled"),
            font: String(t.font || "Figtree"),
            colours: Array.isArray(t.colours) && t.colours.length
              ? t.colours.map(String)
              : ["#E85D75", "#111111"],
            isDefault: Boolean(t.isDefault),
          }))
        : defaultData.templates,
    config: {
      ...defaultData.config,
      ...(value.config || {}),
      defaultDiscounts: Array.isArray(value.config?.defaultDiscounts)
        ? value.config.defaultDiscounts.map(normalizeNamedAmount)
        : defaultData.config.defaultDiscounts,
      defaultCharges: Array.isArray(value.config?.defaultCharges)
        ? value.config.defaultCharges.map(normalizeNamedAmount)
        : defaultData.config.defaultCharges,
    },
    modular: {
      ...defaultData.modular,
      ...(value.modular || {}),
      defaultDiscounts: Array.isArray(value.modular?.defaultDiscounts)
        ? value.modular.defaultDiscounts.map(normalizeNamedAmount)
        : defaultData.modular.defaultDiscounts,
      defaultCharges: Array.isArray(value.modular?.defaultCharges)
        ? value.modular.defaultCharges.map(normalizeNamedAmount)
        : defaultData.modular.defaultCharges,
    },
    approval: { ...defaultData.approval, ...(value.approval || {}) },
  };
}

function MoreMenu({
  onEdit,
  onDelete,
  onSetDefault,
  showDefault,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault?: () => void;
  showDefault?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06]"
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Edit
          </button>
          {showDefault && onSetDefault && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              onClick={() => {
                setOpen(false);
                onSetDefault();
              }}
            >
              Set as default
            </button>
          )}
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function QuotationSettings() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("templates");
  const [data, setData] = useState<QuotationSettingsData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formFont, setFormFont] = useState("Figtree");
  const [formColour1, setFormColour1] = useState("#E85D75");
  const [formColour2, setFormColour2] = useState("#111111");
  const [formDefault, setFormDefault] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const bundle = await quotationSettingsApi.getBundle();
        if (cancelled) return;
        setData(normalizeSettings(bundle));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load settings"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadBundle = async () => {
    const bundle = await quotationSettingsApi.getBundle();
    setData(normalizeSettings(bundle));
  };

  const persist = async (next: QuotationSettingsData) => {
    setData(next);
    try {
      setSaving(true);
      setError("");
      await quotationSettingsApi.saveProfile({
        config: next.config,
        modular: next.modular,
        approval: next.approval,
      });
      setNotice("Settings saved");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  const templates = useMemo(() => data.templates, [data.templates]);

  const resetForm = () => {
    setFormName("");
    setFormFont("Figtree");
    setFormColour1("#E85D75");
    setFormColour2("#111111");
    setFormDefault(false);
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row: QuotationTemplate) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormFont(row.font);
    setFormColour1(row.colours[0] || "#E85D75");
    setFormColour2(row.colours[1] || "#111111");
    setFormDefault(Boolean(row.isDefault));
    setShowForm(true);
  };

  const saveTemplate = async () => {
    if (!formName.trim()) {
      setError("Template name is required");
      return;
    }
    const body = {
      name: formName.trim(),
      font: formFont || "Figtree",
      colours: [formColour1 || "#E85D75", formColour2 || "#111111"],
      isDefault: editingId ? formDefault : templates.length === 0 || formDefault,
    };
    try {
      setSaving(true);
      setError("");
      if (editingId) {
        await quotationSettingsApi.updateTemplate(editingId, body);
        await reloadBundle();
        setShowForm(false);
        setNotice("Template updated");
      } else {
        const created = await quotationSettingsApi.createTemplate(body);
        setShowForm(false);
        router.push(`/settings/quotations/templates/${created.id}`);
        return;
      }
      window.setTimeout(() => setNotice(""), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save template"
      );
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    try {
      setSaving(true);
      setError("");
      await quotationSettingsApi.setDefaultTemplate(id);
      await reloadBundle();
      setNotice("Default template updated");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to update default"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      setSaving(true);
      setError("");
      await quotationSettingsApi.deleteTemplate(id);
      await reloadBundle();
      setNotice("Template deleted");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to delete template"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
          {saving ? " Saving…" : ""}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/[0.06]"
              aria-label="Back to settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white/90 sm:text-2xl">
              Quotation Settings
            </h1>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              onClick={() => {
                setNotice("Help coming soon");
                window.setTimeout(() => setNotice(""), 1800);
              }}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                ?
              </span>
              Learn
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5 border-b border-gray-200 dark:border-gray-800">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative -mb-px pb-3 text-sm font-medium transition ${
                  tab === t.id
                    ? accent.text
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span
                    className={`absolute inset-x-0 bottom-0 h-0.5 ${accent.underline}`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === "templates" ? (
          <div className="flex flex-wrap items-center gap-2 sm:pt-1">
            <button
              type="button"
              onClick={() => {
                setNotice("Import coming soon");
                window.setTimeout(() => setNotice(""), 1800);
              }}
              className={`inline-flex h-10 items-center justify-center rounded-lg border ${accent.border} bg-white px-4 text-sm font-medium ${accent.text} hover:bg-[#E85D75]/5 dark:bg-transparent`}
            >
              Import
            </button>
            <button
              type="button"
              onClick={openCreate}
              className={`inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
            >
              Create
            </button>
          </div>
        ) : (
          <div className="flex sm:pt-1">
            <button
              type="button"
              onClick={() => void persist(data)}
              disabled={saving}
              className={`inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-5 text-sm font-medium text-white ${accent.bgHover} disabled:opacity-60`}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800">
          Loading…
        </div>
      ) : tab === "templates" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  {["S.No.", "Name", "Font", "Colours", "Action"].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className={`px-4 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${
                        h === "Action" ? "text-end" : "text-start"
                      }`}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={`border-b border-gray-100 dark:border-white/[0.04] ${
                      index % 2 === 0
                        ? "bg-white dark:bg-transparent"
                        : "bg-gray-50/70 dark:bg-white/[0.02]"
                    }`}
                  >
                    <TableCell className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/settings/quotations/templates/${row.id}`}
                          className="text-sm font-medium text-gray-800 hover:text-[#E85D75] dark:text-white/90"
                        >
                          {row.name}
                        </Link>
                        {row.isDefault && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-white/[0.08] dark:text-gray-300">
                            Default
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                      {row.font}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {row.colours.map((c) => (
                          <span
                            key={`${row.id}-${c}`}
                            className="inline-block h-5 w-5 rounded-md border border-gray-200 dark:border-gray-700"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell
                      className="px-4 py-3.5 text-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreMenu
                        onEdit={() =>
                          router.push(`/settings/quotations/templates/${row.id}`)
                        }
                        onDelete={() => void deleteTemplate(row.id)}
                        showDefault={!row.isDefault}
                        onSetDefault={() => void setDefault(row.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="px-4 py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <rect
                              x="4"
                              y="3"
                              width="16"
                              height="18"
                              rx="2"
                              stroke="#94a3b8"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M8 8h8M8 12h8M8 16h5"
                              stroke="#E85D75"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <p className="text-base font-semibold text-gray-800 dark:text-white/90">
                          No templates yet
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Create your first quotation template to get started.
                        </p>
                        <button
                          type="button"
                          onClick={openCreate}
                          className={`mt-5 inline-flex h-10 items-center justify-center rounded-lg ${accent.bg} px-4 text-sm font-medium text-white ${accent.bgHover}`}
                        >
                          Create
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : tab === "config" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Label className="mb-0">Fixed Margin</Label>
                <span
                  className={accent.text}
                  title="Fixed margin applied across quotations"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 10v6M12 7.5h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </div>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.config.fixedMargin}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      config: { ...prev.config, fixedMargin: e.target.value },
                    }))
                  }
                  className={percentFieldClass}
                  placeholder="Fixed Margin"
                />
                <span className={percentSuffixClass}>%</span>
              </div>
            </div>
            <div>
              <Label>Default Margin</Label>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.config.defaultMargin}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        defaultMargin: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className={percentFieldClass}
                  placeholder="0"
                />
                <span className={percentSuffixClass}>%</span>
              </div>
            </div>
          </div>

          <div className="max-w-xl">
            <Label>Max Discount Limit</Label>
            <select
              value={data.config.maxDiscountLimit}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    maxDiscountLimit: e.target.value as "Disabled" | "Enabled",
                  },
                }))
              }
              className={fieldClass}
            >
              <option value="Disabled">Disabled</option>
              <option value="Enabled">Enabled</option>
            </select>
          </div>

          <div>
            <Label>Tax</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:max-w-md">
                <select
                  value={data.config.defaultTax}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      config: { ...prev.config, defaultTax: e.target.value },
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="">Select Default Tax</option>
                  {TAX_OPTIONS.filter(Boolean).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={data.config.useItemTax}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        config: {
                          ...prev.config,
                          useItemTax: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Use Item Tax
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={data.config.hideTax}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        config: { ...prev.config, hideTax: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Hide Tax
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-[#E85D75]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                    name="summaryType"
                    checked={data.config.summaryType === opt.id}
                    onChange={() =>
                      setData((prev) => ({
                        ...prev,
                        config: { ...prev.config, summaryType: opt.id },
                      }))
                    }
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Default Discounts
              </h3>
              <button
                type="button"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      defaultDiscounts: [
                        ...prev.config.defaultDiscounts,
                        {
                          id: `disc-${Date.now()}`,
                          name: "",
                          value: "",
                          type: "Percent",
                        },
                      ],
                    },
                  }))
                }
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${accent.bg} text-white ${accent.bgHover}`}
                aria-label="Add default discount"
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
            {data.config.defaultDiscounts.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.05] dark:text-gray-400">
                <span className="mt-0.5 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 10v6M12 7.5h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Click on the + button to add default discounts
              </div>
            ) : (
              <div className="space-y-4">
                {data.config.defaultDiscounts.map((row) => {
                  const nameInvalid = !row.name.trim();
                  const valueInvalid = row.value.trim() === "";
                  return (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <FloatingField
                        label="Name"
                        required
                        invalid={nameInvalid}
                        className="min-w-0 flex-1"
                      >
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                defaultDiscounts:
                                  prev.config.defaultDiscounts.map((d) =>
                                    d.id === row.id
                                      ? { ...d, name: e.target.value }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedInput(nameInvalid)}
                          placeholder="Name"
                        />
                      </FloatingField>
                      <FloatingField label="Type" className="sm:w-40">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                defaultDiscounts:
                                  prev.config.defaultDiscounts.map((d) =>
                                    d.id === row.id
                                      ? {
                                          ...d,
                                          type: e.target.value as
                                            | "Percent"
                                            | "Amount",
                                        }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedSelect()}
                        >
                          <option value="Percent">Percent</option>
                          <option value="Amount">Amount</option>
                        </select>
                      </FloatingField>
                      <FloatingField
                        label="Value"
                        required
                        invalid={valueInvalid}
                        className="sm:w-36"
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.value}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                defaultDiscounts:
                                  prev.config.defaultDiscounts.map((d) =>
                                    d.id === row.id
                                      ? { ...d, value: e.target.value }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedInput(valueInvalid)}
                          placeholder="Value"
                        />
                      </FloatingField>
                      <TrashButton
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            config: {
                              ...prev.config,
                              defaultDiscounts:
                                prev.config.defaultDiscounts.filter(
                                  (d) => d.id !== row.id
                                ),
                            },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Default Additional Charges
              </h3>
              <button
                type="button"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      defaultCharges: [
                        ...prev.config.defaultCharges,
                        {
                          id: `chg-${Date.now()}`,
                          name: "",
                          value: "",
                          type: "Percent",
                          discountApplicable: true,
                        },
                      ],
                    },
                  }))
                }
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${accent.bg} text-white ${accent.bgHover}`}
                aria-label="Add additional charge"
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
            {data.config.defaultCharges.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.05] dark:text-gray-400">
                <span className="mt-0.5 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 10v6M12 7.5h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Click on the + button to add default additional charges
              </div>
            ) : (
              <div className="space-y-4">
                {data.config.defaultCharges.map((row) => {
                  const nameInvalid = !row.name.trim();
                  return (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <FloatingField
                        label="Name"
                        required
                        invalid={nameInvalid}
                        className="min-w-0 flex-1"
                      >
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                defaultCharges: prev.config.defaultCharges.map(
                                  (d) =>
                                    d.id === row.id
                                      ? { ...d, name: e.target.value }
                                      : d
                                ),
                              },
                            }))
                          }
                          className={outlinedInput(nameInvalid)}
                          placeholder="Name"
                        />
                      </FloatingField>
                      <FloatingField label="Type" className="sm:w-40">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                defaultCharges: prev.config.defaultCharges.map(
                                  (d) =>
                                    d.id === row.id
                                      ? {
                                          ...d,
                                          type: e.target.value as
                                            | "Percent"
                                            | "Amount",
                                        }
                                      : d
                                ),
                              },
                            }))
                          }
                          className={outlinedSelect()}
                        >
                          <option value="Percent">Percent</option>
                          <option value="Amount">Amount</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Value" className="sm:w-36">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.value}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                defaultCharges: prev.config.defaultCharges.map(
                                  (d) =>
                                    d.id === row.id
                                      ? { ...d, value: e.target.value }
                                      : d
                                ),
                              },
                            }))
                          }
                          className={outlinedInput()}
                          placeholder="Value"
                        />
                      </FloatingField>
                      <label className="flex shrink-0 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={Boolean(row.discountApplicable)}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                defaultCharges: prev.config.defaultCharges.map(
                                  (d) =>
                                    d.id === row.id
                                      ? {
                                          ...d,
                                          discountApplicable: e.target.checked,
                                        }
                                      : d
                                ),
                              },
                            }))
                          }
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Discount Applicable
                      </label>
                      <TrashButton
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            config: {
                              ...prev.config,
                              defaultCharges: prev.config.defaultCharges.filter(
                                (d) => d.id !== row.id
                              ),
                            },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : tab === "modular" ? (
        <div className="space-y-5">
          <div className="max-w-xl">
            <Label>Modular Calculator Type</Label>
            <select
              value={data.modular.calculatorType}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  modular: {
                    ...prev.modular,
                    calculatorType: e.target.value as
                      | "Box"
                      | "Running"
                      | "Area",
                  },
                }))
              }
              className={fieldClass}
            >
              <option value="Box">Box</option>
              <option value="Running">Running</option>
              <option value="Area">Area</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-3xl">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Label className="mb-0">Fixed Margin</Label>
                <span
                  className={accent.text}
                  title="Fixed margin for modular quotations"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 10v6M12 7.5h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </div>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.modular.fixedMargin}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      modular: {
                        ...prev.modular,
                        fixedMargin: e.target.value,
                      },
                    }))
                  }
                  className={percentFieldClass}
                  placeholder="0"
                />
                <span className={percentSuffixClass}>%</span>
              </div>
            </div>
            <div>
              <Label>Default Margin</Label>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.modular.defaultMargin}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      modular: {
                        ...prev.modular,
                        defaultMargin: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className={percentFieldClass}
                  placeholder="0"
                />
                <span className={percentSuffixClass}>%</span>
              </div>
            </div>
          </div>

          <div className="max-w-xl">
            <Label>Max Discount Limit</Label>
            <select
              value={data.modular.maxDiscountLimit}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  modular: {
                    ...prev.modular,
                    maxDiscountLimit: e.target.value as
                      | "Disabled"
                      | "Enabled",
                  },
                }))
              }
              className={fieldClass}
            >
              <option value="Disabled">Disabled</option>
              <option value="Enabled">Enabled</option>
            </select>
          </div>

          <div>
            <Label>Tax</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:max-w-md">
                <select
                  value={data.modular.defaultTax}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      modular: {
                        ...prev.modular,
                        defaultTax: e.target.value,
                      },
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="">Select Default Tax</option>
                  {TAX_OPTIONS.filter(Boolean).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={data.modular.useItemTax}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        modular: {
                          ...prev.modular,
                          useItemTax: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Use Item Tax
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={data.modular.hideTax}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        modular: {
                          ...prev.modular,
                          hideTax: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Hide Tax
                </label>
              </div>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={data.modular.addInstallationCharge}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  modular: {
                    ...prev.modular,
                    addInstallationCharge: e.target.checked,
                  },
                }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            Add Installation Charge
            <span
              className={accent.text}
              title="Include installation charge in modular quotations"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 10v6M12 7.5h.01"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </label>

          <div className="flex flex-col gap-3 rounded-xl bg-[#E85D75]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                    name="modularSummaryType"
                    checked={data.modular.summaryType === opt.id}
                    onChange={() =>
                      setData((prev) => ({
                        ...prev,
                        modular: { ...prev.modular, summaryType: opt.id },
                      }))
                    }
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Default Discounts
              </h3>
              <button
                type="button"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    modular: {
                      ...prev.modular,
                      defaultDiscounts: [
                        ...prev.modular.defaultDiscounts,
                        {
                          id: `m-disc-${Date.now()}`,
                          name: "",
                          value: "",
                          type: "Percent",
                        },
                      ],
                    },
                  }))
                }
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${accent.bg} text-white ${accent.bgHover}`}
                aria-label="Add modular discount"
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
            {data.modular.defaultDiscounts.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.05] dark:text-gray-400">
                <span className="mt-0.5 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 10v6M12 7.5h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Click on the + button to add default discounts
              </div>
            ) : (
              <div className="space-y-4">
                {data.modular.defaultDiscounts.map((row) => {
                  const nameInvalid = !row.name.trim();
                  const valueInvalid = row.value.trim() === "";
                  return (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <FloatingField
                        label="Name"
                        required
                        invalid={nameInvalid}
                        className="min-w-0 flex-1"
                      >
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              modular: {
                                ...prev.modular,
                                defaultDiscounts:
                                  prev.modular.defaultDiscounts.map((d) =>
                                    d.id === row.id
                                      ? { ...d, name: e.target.value }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedInput(nameInvalid)}
                          placeholder="Name"
                        />
                      </FloatingField>
                      <FloatingField label="Type" className="sm:w-40">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              modular: {
                                ...prev.modular,
                                defaultDiscounts:
                                  prev.modular.defaultDiscounts.map((d) =>
                                    d.id === row.id
                                      ? {
                                          ...d,
                                          type: e.target.value as
                                            | "Percent"
                                            | "Amount",
                                        }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedSelect()}
                        >
                          <option value="Percent">Percent</option>
                          <option value="Amount">Amount</option>
                        </select>
                      </FloatingField>
                      <FloatingField
                        label="Value"
                        required
                        invalid={valueInvalid}
                        className="sm:w-36"
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.value}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              modular: {
                                ...prev.modular,
                                defaultDiscounts:
                                  prev.modular.defaultDiscounts.map((d) =>
                                    d.id === row.id
                                      ? { ...d, value: e.target.value }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedInput(valueInvalid)}
                          placeholder="Value"
                        />
                      </FloatingField>
                      <TrashButton
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            modular: {
                              ...prev.modular,
                              defaultDiscounts:
                                prev.modular.defaultDiscounts.filter(
                                  (d) => d.id !== row.id
                                ),
                            },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Default Additional Charges
              </h3>
              <button
                type="button"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    modular: {
                      ...prev.modular,
                      defaultCharges: [
                        ...prev.modular.defaultCharges,
                        {
                          id: `m-chg-${Date.now()}`,
                          name: "",
                          value: "",
                          type: "Percent",
                          discountApplicable: true,
                        },
                      ],
                    },
                  }))
                }
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${accent.bg} text-white ${accent.bgHover}`}
                aria-label="Add modular charge"
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
            {data.modular.defaultCharges.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.05] dark:text-gray-400">
                <span className="mt-0.5 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 10v6M12 7.5h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Click on the + button to add default additional charges
              </div>
            ) : (
              <div className="space-y-4">
                {data.modular.defaultCharges.map((row) => {
                  const nameInvalid = !row.name.trim();
                  return (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <FloatingField
                        label="Name"
                        required
                        invalid={nameInvalid}
                        className="min-w-0 flex-1"
                      >
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              modular: {
                                ...prev.modular,
                                defaultCharges:
                                  prev.modular.defaultCharges.map((d) =>
                                    d.id === row.id
                                      ? { ...d, name: e.target.value }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedInput(nameInvalid)}
                          placeholder="Name"
                        />
                      </FloatingField>
                      <FloatingField label="Type" className="sm:w-40">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              modular: {
                                ...prev.modular,
                                defaultCharges:
                                  prev.modular.defaultCharges.map((d) =>
                                    d.id === row.id
                                      ? {
                                          ...d,
                                          type: e.target.value as
                                            | "Percent"
                                            | "Amount",
                                        }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedSelect()}
                        >
                          <option value="Percent">Percent</option>
                          <option value="Amount">Amount</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Value" className="sm:w-36">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.value}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              modular: {
                                ...prev.modular,
                                defaultCharges:
                                  prev.modular.defaultCharges.map((d) =>
                                    d.id === row.id
                                      ? { ...d, value: e.target.value }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className={outlinedInput()}
                          placeholder="Value"
                        />
                      </FloatingField>
                      <label className="flex shrink-0 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={Boolean(row.discountApplicable)}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              modular: {
                                ...prev.modular,
                                defaultCharges:
                                  prev.modular.defaultCharges.map((d) =>
                                    d.id === row.id
                                      ? {
                                          ...d,
                                          discountApplicable: e.target.checked,
                                        }
                                      : d
                                  ),
                              },
                            }))
                          }
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Discount Applicable
                      </label>
                      <TrashButton
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            modular: {
                              ...prev.modular,
                              defaultCharges:
                                prev.modular.defaultCharges.filter(
                                  (d) => d.id !== row.id
                                ),
                            },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={data.approval.requireApproval}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    approval: {
                      ...prev.approval,
                      requireApproval: e.target.checked,
                    },
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              Require approval before sending quotation
            </label>
            <div>
              <Label>Minimum amount for approval</Label>
              <input
                type="number"
                min="0"
                value={data.approval.minAmount}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    approval: {
                      ...prev.approval,
                      minAmount: Number(e.target.value) || 0,
                    },
                  }))
                }
                className={fieldClass}
              />
            </div>
            <div>
              <Label>Approver role</Label>
              <select
                value={data.approval.approverRole}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    approval: {
                      ...prev.approval,
                      approverRole: e.target.value,
                    },
                  }))
                }
                className={fieldClass}
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white px-6 pb-6 pt-5 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
              {editingId ? "Edit Template" : "Create New Template"}
            </h3>

            <div className="relative mt-8">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Template name"
                autoFocus
                className="peer h-12 w-full rounded-xl border border-gray-400 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-700 focus:outline-hidden dark:border-gray-600 dark:text-white/90"
              />
              <span className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Template Name<span className="text-red-500">*</span>
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`inline-flex h-11 items-center justify-center rounded-lg ${accent.bg} text-sm font-medium text-white ${accent.bgHover}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveTemplate()}
                disabled={saving || !formName.trim()}
                className={`inline-flex h-11 items-center justify-center rounded-lg border text-sm font-medium transition ${
                  formName.trim()
                    ? `${accent.border} ${accent.text} hover:bg-[#E85D75]/5`
                    : "cursor-not-allowed border-gray-200 text-gray-400"
                } disabled:opacity-70`}
              >
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
