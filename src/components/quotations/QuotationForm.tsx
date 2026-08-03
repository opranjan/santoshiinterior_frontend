"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import {
  customersApi,
  leadsApi,
  quotationsApi,
  storesApi,
} from "@/services/crmApi";
import { ApiError } from "@/lib/api";
import { toIsoDateOrNull } from "@/lib/crmMappers";

type SourceType = "lead" | "client";

type SourceOption = {
  id: string;
  type: SourceType;
  name: string;
  phone: string;
  email: string;
  store: string;
  storeId: string | null;
  projectType: string;
};

type LineItem = {
  id: string;
  description: string;
  area: string;
  qty: number;
  unit: string;
  rate: number;
};

const defaultItems: LineItem[] = [
  {
    id: "1",
    description: "Modular Kitchen (including appliances cutouts)",
    area: "Kitchen",
    qty: 1,
    unit: "LS",
    rate: 350000,
  },
  {
    id: "2",
    description: "Wardrobes – bedrooms",
    area: "Bedrooms",
    qty: 3,
    unit: "Nos",
    rate: 85000,
  },
];

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function QuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillType = (searchParams.get("from") as SourceType | null) || "lead";
  const prefillId = searchParams.get("id") || "";

  const [sources, setSources] = useState<SourceOption[]>([]);
  const [sourceType, setSourceType] = useState<SourceType>(
    prefillType === "client" ? "client" : "lead"
  );
  const [sourceId, setSourceId] = useState(prefillId);
  const [title, setTitle] = useState("");
  const [validTill, setValidTill] = useState("");
  const [discount, setDiscount] = useState(0);
  const [gstPercent, setGstPercent] = useState(18);
  const [notes, setNotes] = useState(
    "Quotation includes material + labour. Site measurements may revise final amount."
  );
  const [items, setItems] = useState<LineItem[]>(defaultItems);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [leads, customers, stores] = await Promise.all([
          leadsApi.list({ limit: 100 }),
          customersApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        const storeName = (id?: string | null) =>
          stores.items.find((s) => s.id === id)?.name || "";

        const leadOptions: SourceOption[] = leads.items.map((l) => ({
          id: l.id,
          type: "lead",
          name: l.clientName,
          phone: l.phone,
          email: l.email || "",
          store: l.store?.name || storeName(l.storeId),
          storeId: l.storeId || null,
          projectType: l.projectType || "Residential",
        }));
        const customerOptions: SourceOption[] = customers.items.map((c) => ({
          id: c.id,
          type: "client",
          name: c.name,
          phone: c.phone,
          email: c.email || "",
          store: c.store?.name || storeName(c.storeId),
          storeId: c.storeId || null,
          projectType: "Residential",
        }));
        setSources([...leadOptions, ...customerOptions]);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to load leads/customers"
        );
      }
    })();
  }, []);

  const options = useMemo(
    () => sources.filter((s) => s.type === sourceType),
    [sources, sourceType]
  );

  const selected = useMemo(
    () => options.find((s) => s.id === sourceId) || null,
    [options, sourceId]
  );

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const discountAmt = Math.min(discount, subtotal);
  const taxable = Math.max(subtotal - discountAmt, 0);
  const gstAmt = (taxable * gstPercent) / 100;
  const grandTotal = taxable + gstAmt;

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: "",
        area: "",
        qty: 1,
        unit: "Nos",
        rate: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  };

  const handleSourceTypeChange = (type: SourceType) => {
    setSourceType(type);
    setSourceId("");
  };

  const handleSubmit = async (
    e: React.FormEvent,
    action: "draft" | "save-share"
  ) => {
    e.preventDefault();
    setError("");
    setSavedMsg("");
    if (!selected) {
      setError("Please select a Lead or Client first.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter quotation title.");
      return;
    }

    setLoading(true);
    try {
      await quotationsApi.create({
        title: title.trim(),
        sourceType: sourceType === "client" ? "CLIENT" : "LEAD",
        leadId: sourceType === "lead" ? selected.id : null,
        customerId: sourceType === "client" ? selected.id : null,
        clientName: selected.name,
        phone: selected.phone || null,
        email: selected.email || null,
        storeId: selected.storeId,
        projectType: selected.projectType || null,
        amount: grandTotal,
        status: action === "draft" ? "DRAFT" : "SENT",
        validTill: toIsoDateOrNull(validTill),
        notes: notes || null,
        items: items
          .filter((i) => i.description.trim())
          .map((i, index) => ({
            description: `${i.description}${i.area ? ` (${i.area})` : ""}`,
            unit: i.unit,
            qty: i.qty,
            rate: i.rate,
            amount: i.qty * i.rate,
            sortOrder: index,
          })),
      });
      setSavedMsg(
        action === "draft"
          ? `Draft quotation saved for ${selected.name}.`
          : `Quotation saved for ${selected.name}.`
      );
      setTimeout(() => router.push("/sales/quotations"), 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={(e) => handleSubmit(e, "draft")}>
      <ComponentCard
        title="Link to Lead or Client"
        desc="Quotation must be created against an existing Lead or Customer."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Label>Create For</Label>
            <div className="flex gap-2">
              {(["lead", "client"] as SourceType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSourceTypeChange(type)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition ${
                    sourceType === type
                      ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {type === "lead" ? "From Lead" : "From Client"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{sourceType === "lead" ? "Select Lead" : "Select Client"}</Label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select...</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.phone}
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <div className="md:col-span-2 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-700">
              <p className="font-medium text-gray-800 dark:text-white/90">
                {selected.name}
              </p>
              <p className="text-gray-500">
                {selected.phone} · {selected.email || "No email"} · {selected.store}
              </p>
            </div>
          )}
        </div>
      </ComponentCard>

      <ComponentCard title="Quotation Details" desc="Title, validity and line items.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 3 BHK Full Interiors"
            />
          </div>
          <div>
            <Label>Valid Till</Label>
            <Input
              type="date"
              value={validTill}
              onChange={(e) => setValidTill(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-6 dark:border-gray-700"
            >
              <div className="md:col-span-2">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, { description: e.target.value })
                  }
                />
              </div>
              <Input
                placeholder="Area"
                value={item.area}
                onChange={(e) => updateItem(item.id, { area: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Qty"
                value={item.qty}
                onChange={(e) =>
                  updateItem(item.id, { qty: Number(e.target.value) || 0 })
                }
              />
              <Input
                type="number"
                placeholder="Rate"
                value={item.rate}
                onChange={(e) =>
                  updateItem(item.id, { rate: Number(e.target.value) || 0 })
                }
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            + Add Item
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label>Discount (₹)</Label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>GST %</Label>
            <Input
              type="number"
              value={gstPercent}
              onChange={(e) => setGstPercent(Number(e.target.value) || 0)}
            />
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-white/[0.03]">
            <p>Subtotal: {formatINR(subtotal)}</p>
            <p>GST: {formatINR(gstAmt)}</p>
            <p className="font-semibold">Total: {formatINR(grandTotal)}</p>
          </div>
        </div>

        <div className="mt-5">
          <Label>Notes</Label>
          <TextArea rows={3} value={notes} onChange={setNotes} />
        </div>
      </ComponentCard>

      {(error || savedMsg) && (
        <p className={`text-sm ${error ? "text-error-500" : "text-success-600"}`}>
          {error || savedMsg}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving..." : "Save Draft"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => {
            void handleSubmit(
              { preventDefault() {} } as React.FormEvent,
              "save-share"
            );
          }}
        >
          Save &amp; Mark Sent
        </Button>
        <Link href="/sales/quotations">
          <Button type="button" size="sm" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
