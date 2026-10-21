"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import { formatDate, invoiceTotals, lineTotals, money, parseTaxPct, toYmd } from "@/lib/invoiceMath";
import { normalizeCatalogSettings } from "@/lib/quotationCatalogDefaults";
import {
  invoicesApi,
  quotationCatalogsApi,
  type InvoiceDto,
  type InvoiceItemDto,
} from "@/services/crmApi";

function blankLine(): InvoiceItemDto {
  return { name: "", hsn: "", qty: 1, uom: "NOS", rate: 0, discountPct: 0, taxPct: 0 };
}

type CatalogChoice = {
  id: string;
  label: string;
  name: string;
  hsn: string;
  qty: number;
  uom: string;
  rate: number;
  discountPct: number;
  taxPct: number;
};

export default function InvoiceEditor({ id }: { id: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [template, setTemplate] = useState("Default Invoice Template");
  const [additionalCharge, setAdditionalCharge] = useState(0);
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [lines, setLines] = useState<InvoiceItemDto[]>([]);
  const [catalogPick, setCatalogPick] = useState("");
  const [catalogOptions, setCatalogOptions] = useState<CatalogChoice[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = async () => {
    const row = await invoicesApi.get(id);
    setInvoice(row);
    setProjectName(row.projectName || row.project?.name || "");
    setBillTo(row.billTo || "");
    setShipTo(row.shipTo || "");
    setInvoiceDate(toYmd(row.invoiceDate));
    setTemplate(row.template || "Default Invoice Template");
    setAdditionalCharge(Number(row.additionalCharge || 0));
    setAdditionalDiscount(Number(row.additionalDiscount || 0));
    setLines(row.items?.length ? row.items.map((item) => ({ ...item })) : []);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    quotationCatalogsApi
      .getBundle()
      .then((bundle) => {
        const settings = normalizeCatalogSettings(bundle);
        const options: CatalogChoice[] = [];
        settings.catalogs.forEach((catalog) => {
          (catalog.catalogItems || []).forEach((item) => {
            options.push({
              id: item.id,
              label: `${catalog.name} · ${item.name}`,
              name: item.name,
              hsn: item.hsnCode || catalog.hsnCode || "",
              qty: 1,
              uom: item.uom || "NOS",
              rate: Number(item.price || 0),
              discountPct: item.discountUnit === "%" ? Number(item.discount || 0) : 0,
              taxPct: parseTaxPct(item.tax || catalog.tax),
            });
          });
        });
        setCatalogOptions(options);
      })
      .catch(() => setCatalogOptions([]));
  }, []);

  const totals = useMemo(
    () => invoiceTotals(lines, additionalCharge, additionalDiscount),
    [lines, additionalCharge, additionalDiscount]
  );

  const payload = () => ({
    projectName: projectName.trim(),
    billTo: billTo.trim(),
    shipTo: shipTo.trim(),
    invoiceDate,
    template,
    additionalCharge,
    additionalDiscount,
    items: lines
      .filter((row) => row.name.trim())
      .map((row) => ({
        name: row.name.trim(),
        hsn: row.hsn || "",
        qty: Number(row.qty) || 0,
        uom: row.uom || "NOS",
        rate: Number(row.rate) || 0,
        discountPct: Number(row.discountPct) || 0,
        taxPct: Number(row.taxPct) || 0,
      })),
  });

  const save = async (status?: string) => {
    if (!projectName.trim()) {
      toastWarning("Project name is required.");
      return;
    }
    if (!billTo.trim() || !shipTo.trim()) {
      toastWarning("Bill to and ship to addresses are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await invoicesApi.update(id, {
        ...payload(),
        status: status || invoice?.status || "DRAFT",
      });
      setInvoice(updated);
      toastSuccess(status === "GENERATED" ? "Invoice generated." : "Draft saved.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const addFromCatalog = (value: string) => {
    setCatalogPick(value);
    const item = catalogOptions.find((row) => row.id === value);
    if (!item) return;
    setLines((prev) => [
      ...prev,
      {
        name: item.name,
        hsn: item.hsn,
        qty: item.qty,
        uom: item.uom,
        rate: item.rate,
        discountPct: item.discountPct,
        taxPct: item.taxPct,
      },
    ]);
    setCatalogPick("");
  };

  const updateLine = (index: number, patch: Partial<InvoiceItemDto>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const editMoney = (label: string, current: number, apply: (value: number) => void) => {
    const next = window.prompt(label, String(current || 0));
    if (next == null) return;
    apply(Number(next) || 0);
  };

  if (loading) {
    return <p className="px-1 py-10 text-sm text-[#8a7b68]">Loading invoice…</p>;
  }
  if (!invoice) {
    return (
      <div className="py-10 text-sm text-[#8a7b68]">
        Invoice not found.{" "}
        <Link href="/accounting/invoices" className="text-[#9a7748] underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  const card = "rounded-2xl border border-[#eadfcf] bg-[#fdfbf7] p-4";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/accounting/invoices")}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#6b3e1f] hover:bg-[#f6efe4]"
            aria-label="Back"
          >
            ←
          </button>
          <div>
            <h1
              className="font-serif text-[1.7rem] text-[#1c1610]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Edit Invoice
            </h1>
            <p className="text-sm text-[#8a7b68]">Update invoice details, add items and generate final invoice.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610]"
          >
            <option>Default Invoice Template</option>
          </select>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#eadfcf] bg-white text-[#7a4a24]"
            aria-label="Preview"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save("DRAFT")}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#7a4a24] disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save("GENERATED")}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7a4a24] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className={card}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">Project Name *</p>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm"
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#8a7b68]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em]">Created On</p>
              <p className="mt-1 rounded-lg bg-[#f6efe4] px-2 py-2 text-[#5c472c]">{formatDate(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em]">Invoice Date</p>
              <DatePickerField id="edit-invoice-date" value={invoiceDate} onChange={setInvoiceDate} />
            </div>
          </div>
        </div>
        <div className={card}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">Bill To (Address) *</p>
          <textarea
            value={billTo}
            onChange={(e) => setBillTo(e.target.value)}
            rows={5}
            className="mt-2 w-full resize-none rounded-xl border border-[#eadfcf] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className={card}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">Ship To (Address) *</p>
          <textarea
            value={shipTo}
            onChange={(e) => setShipTo(e.target.value)}
            rows={5}
            className="mt-2 w-full resize-none rounded-xl border border-[#eadfcf] bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Item Count" value={String(totals.itemCount)} />
        <StatCard
          label="Total Additional Charge"
          value={money(additionalCharge)}
          onEdit={() => editMoney("Additional charge", additionalCharge, setAdditionalCharge)}
        />
        <StatCard
          label="Total Additional Discount"
          value={money(additionalDiscount)}
          onEdit={() => editMoney("Additional discount", additionalDiscount, setAdditionalDiscount)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Final Price" value={money(totals.subtotal)} />
        <StatCard label="Total Discount" value={money(totals.totalDiscount)} />
        <StatCard label="Total Tax" value={money(totals.tax)} />
        <StatCard label="Grand Total" value={money(totals.grand)} highlight />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eadfcf] px-4 py-3">
          <h2 className="font-medium text-[#1c1610]">Invoice Items</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={catalogPick}
              onChange={(e) => addFromCatalog(e.target.value)}
              className="h-10 min-w-[220px] rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3 text-sm"
            >
              <option value="">Autofill from Catalog</option>
              {catalogOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, blankLine()])}
              className="inline-flex h-10 items-center rounded-xl bg-[#7a4a24] px-4 text-sm font-semibold text-white"
            >
              + Add Item
            </button>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[#fbf8f3] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
              <tr>
                {["S.No", "Name", "HSN/SAC", "Qty", "UOM", "Rate (₹)", "Disc (%)", "Disc. Price (₹)", "Tax (₹)", "Final Price (₹)", "Action"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-3">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <p className="text-sm text-[#8a7b68]">No items added yet</p>
                    <p className="mt-1 text-xs text-[#b3a594]">Search from catalog and add items to this invoice.</p>
                    <button
                      type="button"
                      onClick={() => setLines([blankLine()])}
                      className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#7a4a24] px-4 text-sm font-semibold text-white"
                    >
                      + Add Your First Item
                    </button>
                  </td>
                </tr>
              ) : (
                lines.map((row, index) => {
                  const calc = lineTotals(row);
                  return (
                    <tr key={row.id || index} className="border-t border-[#eadfcf]/70">
                      <td className="px-3 py-2 text-[#8a7b68]">{index + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={row.name}
                          onChange={(e) => updateLine(index, { name: e.target.value })}
                          className="h-9 w-44 rounded-lg border border-[#eadfcf] px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.hsn || ""}
                          onChange={(e) => updateLine(index, { hsn: e.target.value })}
                          className="h-9 w-24 rounded-lg border border-[#eadfcf] px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.qty}
                          onChange={(e) => updateLine(index, { qty: Number(e.target.value) })}
                          className="h-9 w-16 rounded-lg border border-[#eadfcf] px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.uom || ""}
                          onChange={(e) => updateLine(index, { uom: e.target.value })}
                          className="h-9 w-20 rounded-lg border border-[#eadfcf] px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.rate}
                          onChange={(e) => updateLine(index, { rate: Number(e.target.value) })}
                          className="h-9 w-24 rounded-lg border border-[#eadfcf] px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.discountPct || 0}
                          onChange={(e) => updateLine(index, { discountPct: Number(e.target.value) })}
                          className="h-9 w-16 rounded-lg border border-[#eadfcf] px-2"
                        />
                      </td>
                      <td className="px-3 py-2 text-[#8a7b68]">{money(calc.disc)}</td>
                      <td className="px-3 py-2 text-[#8a7b68]">{money(calc.tax)}</td>
                      <td className="px-3 py-2 font-medium">{money(calc.final)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                          className="text-xs text-rose-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">Santoshi Interiors</p>
                <h3 className="font-serif text-2xl text-[#1c1610]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Invoice {invoice.code}
                </h3>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-[#8a7b68]">
                ✕
              </button>
            </div>
            <p className="mt-4 text-sm text-[#8a7b68]">Project: {projectName}</p>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#9a7748]">Bill To</p>
                <p className="whitespace-pre-wrap text-[#5c472c]">{billTo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#9a7748]">Ship To</p>
                <p className="whitespace-pre-wrap text-[#5c472c]">{shipTo}</p>
              </div>
            </div>
            <table className="mt-5 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase tracking-[0.12em] text-[#8a7b68]">
                  <th className="py-2">Item</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.filter((row) => row.name.trim()).map((row, index) => (
                  <tr key={index} className="border-b border-[#eadfcf]">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2">
                      {row.qty} {row.uom}
                    </td>
                    <td className="py-2">{money(lineTotals(row).final)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-right font-serif text-xl">{money(totals.grand)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  onEdit,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className={`rounded-2xl border border-[#eadfcf] p-4 ${highlight ? "bg-[#f6efe4]" : "bg-[#fdfbf7]"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">{label}</p>
        {onEdit ? (
          <button type="button" onClick={onEdit} className="text-[#9a7748]" aria-label={`Edit ${label}`}>
            ✎
          </button>
        ) : null}
      </div>
      <p className="mt-2 font-serif text-2xl text-[#1c1610]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {value}
      </p>
    </div>
  );
}
