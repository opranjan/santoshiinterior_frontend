"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DatePickerField from "@/components/form/DatePickerField";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import { designAssetUrl } from "@/lib/designAssets";
import {
  rfqApi,
  vendorsApi,
  type RfqDto,
  type RfqVendorRowDto,
  type VendorDto,
} from "@/services/crmApi";

const PINK = "#E85D75";
const fieldClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#E85D75]";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    d.getMonth()
  ];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

function money(value?: number | null) {
  const amount = Number(value || 0);
  return `₹ ${amount.toLocaleString("en-IN")}`;
}

export default function RfqDetail({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<RfqDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"vendors" | "compare">("vendors");
  const [headerMenu, setHeaderMenu] = useState<{ top: number; left: number } | null>(null);
  const [vendorMenu, setVendorMenu] = useState<{ vendorId: string; top: number; left: number } | null>(null);
  const [allVendors, setAllVendors] = useState<VendorDto[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addIds, setAddIds] = useState<string[]>([]);
  const [fillOpen, setFillOpen] = useState<RfqVendorRowDto | null>(null);
  const [fillDate, setFillDate] = useState("");
  const [fillRemark, setFillRemark] = useState("");
  const [fillRates, setFillRates] = useState<Record<string, string>>({});
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const vendorMenuRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const data = await rfqApi.get(id);
    setRow(data);
    setSelectedVendors((data.vendors || []).map((entry) => entry.vendorId));
    return data;
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load RFQ"))
      .finally(() => setLoading(false));
    vendorsApi
      .list({ limit: 100 })
      .then((data) => setAllVendors(data.items || []))
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) setHeaderMenu(null);
      if (vendorMenuRef.current && !vendorMenuRef.current.contains(event.target as Node)) setVendorMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const copyLink = async () => {
    if (!row) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/rfq/${row.publicToken}`);
      toastSuccess("Form link copied.");
    } catch {
      toastError("Could not copy link");
    }
  };

  const cancelRfq = async () => {
    try {
      await rfqApi.cancel(id);
      toastSuccess("RFQ cancelled.");
      router.push("/operations/procurement/rfq");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to cancel RFQ");
    }
  };

  const removeVendor = async (vendorId: string) => {
    try {
      const updated = await rfqApi.removeVendor(id, vendorId);
      setRow(updated);
      setVendorMenu(null);
      toastSuccess("Vendor removed.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to remove vendor");
    }
  };

  const addVendors = async () => {
    if (!addIds.length) {
      toastWarning("Select at least one vendor.");
      return;
    }
    try {
      const updated = await rfqApi.addVendors(id, addIds);
      setRow(updated);
      setSelectedVendors((updated.vendors || []).map((entry) => entry.vendorId));
      setAddOpen(false);
      toastSuccess("Vendors added.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to add vendors");
    }
  };

  const openFill = (entry: RfqVendorRowDto) => {
    setFillOpen(entry);
    setFillDate(entry.deliveryDate ? entry.deliveryDate.slice(0, 10) : "");
    setFillRemark(entry.vendorRemark || "");
    const rates: Record<string, string> = {};
    (entry.bids || []).forEach((bid) => {
      rates[bid.itemId] = String(bid.rate ?? "");
    });
    setFillRates(rates);
    setVendorMenu(null);
  };

  const saveFill = async () => {
    if (!fillOpen) return;
    try {
      const updated = await rfqApi.fillVendor(id, fillOpen.vendorId, {
        deliveryDate: fillDate || null,
        vendorRemark: fillRemark,
        bids: (row?.items || [])
          .filter((item) => item.id)
          .map((item) => ({
            itemId: item.id,
            rate: Number(fillRates[item.id as string] || 0),
          })),
      });
      setRow(updated);
      setFillOpen(null);
      toastSuccess("Vendor response saved.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to save vendor fill");
    }
  };

  const vendors = row?.vendors || [];
  const compareVendors = vendors.filter((entry) => selectedVendors.includes(entry.vendorId));
  const submissions = vendors.length;
  const itemsCompared = (row?.items || []).length;
  const totalBid = vendors.reduce((sum, entry) => sum + Number(entry.totalBidding || 0), 0);
  const existingIds = new Set(vendors.map((entry) => entry.vendorId));
  const addable = allVendors.filter((vendor) => !existingIds.has(vendor.id));

  if (loading) return <p className="text-sm text-gray-500">Loading RFQ...</p>;
  if (!row) return <p className="text-sm text-gray-500">RFQ not found</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/operations/procurement/rfq" className="text-lg text-gray-400">
            ‹
          </Link>
          <h2 className="text-lg font-semibold text-gray-800">{row.code}</h2>
          <button
            type="button"
            onClick={() => setTab("vendors")}
            className={`inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium ${
              tab === "vendors" ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-gray-500"
            }`}
          >
            ▤ Vendor List
          </button>
          <button
            type="button"
            onClick={() => setTab("compare")}
            className={`inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium ${
              tab === "compare" ? "text-[#E85D75]" : "text-gray-500"
            }`}
          >
            ↗ Item Bidding Comparison
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex h-9 items-center rounded-full border border-[#F4C4CC] px-3 text-sm font-medium text-[#E85D75]"
          >
            ⤿ Copy Form Link
          </button>
          <button
            type="button"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setHeaderMenu({ top: rect.bottom + 4, left: rect.right - 180 });
            }}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
            aria-label="RFQ more"
          >
            ⋮
          </button>
        </div>
      </div>

      {tab === "vendors" ? (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-gray-500">Project Name : </span>
                <span className="font-medium">{row.project?.name || "Unknown"}</span>
              </p>
              <p>
                <span className="text-gray-500">Request Title : </span>
                <span className="font-medium">{row.name}</span>
              </p>
              <p>
                <span className="text-gray-500">Expected Delivery Date : </span>
                {formatDate(row.expectedDelivery)}
              </p>
              <p>
                <span className="text-gray-500">Status : </span>
                <span className={row.status === "PENDING" ? "text-[#E85D75]" : "text-[#16A34A]"}>
                  {row.status === "PENDING" ? "Pending" : row.status === "ORDERED" ? "Ordered" : "Cancelled"}
                </span>
              </p>
              <p>
                <span className="text-gray-500">Created Date : </span>
                {formatDate(row.createdAt)}
              </p>
              <p>
                <span className="text-gray-500">Created By : </span>
                {row.createdBy?.name || "Procurement"}
              </p>
              <p className="sm:col-span-2">
                <span className="text-gray-500">Place of Supply : </span>
                {row.placeOfSupply || "—"}
              </p>
              <p className="sm:col-span-2">
                <span className="text-gray-500">Remark : </span>
                {row.remark || row.name}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">Attachments:</span>
            {(row.files || []).length === 0 ? (
              <span className="text-gray-400">—</span>
            ) : (
              (row.files || []).map((file) => (
                <a
                  key={file.id}
                  href={designAssetUrl(file.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                >
                  🗎 {file.fileName}
                </a>
              ))
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor Name</th>
                  <th className="px-4 py-3 font-medium">Delivery Date</th>
                  <th className="px-4 py-3 font-medium">Response Status</th>
                  <th className="px-4 py-3 font-medium">Last Response Date</th>
                  <th className="px-4 py-3 font-medium">Total Biding</th>
                  <th className="px-4 py-3 font-medium">Vendor Remark</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((entry) => (
                  <tr key={entry.vendorId} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{entry.vendor?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.deliveryDate ? formatDate(entry.deliveryDate) : "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {entry.responseStatus === "SUBMITTED" ? "Submitted" : "Pending"}(v{entry.version || 1})
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {entry.lastResponseDate ? formatDate(entry.lastResponseDate) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{entry.totalBidding || 0}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.vendorRemark || "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setVendorMenu({
                            vendorId: entry.vendorId,
                            top: rect.bottom + 4,
                            left: rect.right - 160,
                          });
                        }}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                      >
                        ⋮
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi title="Total Bidding amount" value={money(totalBid)} tone="blue" />
            <Kpi title="Total Submissions" value={`${submissions} Response`} tone="pink" />
            <Kpi title="Items Compared" value={`${itemsCompared} item`} tone="sky" />
            <Kpi title="PO Raised" value="0 items" tone="green" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Filter vendors:</span>
              <select
                value={selectedVendors[0] || ""}
                onChange={(e) => setSelectedVendors(e.target.value ? [e.target.value] : vendors.map((v) => v.vendorId))}
                className="h-9 rounded-full border border-gray-200 px-3"
              >
                <option value="">All</option>
                {vendors.map((entry) => (
                  <option key={entry.vendorId} value={entry.vendorId}>
                    {entry.vendor?.name}
                  </option>
                ))}
              </select>
              <span className="inline-flex h-6 items-center rounded-full bg-[#FCE7EB] px-2 text-xs font-medium text-[#E85D75]">
                {compareVendors.length} selected
              </span>
            </div>
            <p className="text-xs text-gray-500">
              <span className="mr-3">● Lowest Bid</span>
              <span className="text-orange-500">● Second Lowest Bid</span>
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">S. No.</th>
                  <th className="px-4 py-3 font-medium">Item name</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  {compareVendors.map((entry) => (
                    <th key={entry.vendorId} className="px-4 py-3 font-medium">
                      {entry.vendor?.name} (v{entry.version || 1})
                    </th>
                  ))}
                </tr>
                <tr className="border-t border-gray-100 text-gray-700">
                  <th colSpan={3} className="px-4 py-2 font-medium">
                    Total Bidding Amount
                  </th>
                  {compareVendors.map((entry) => (
                    <th key={entry.vendorId} className="px-4 py-2 font-medium">
                      {entry.totalBidding ? money(entry.totalBidding) : "-"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(row.items || []).map((item, index) => {
                  const rates = compareVendors.map((entry) => {
                    const bid = (entry.bids || []).find((rowBid) => rowBid.itemId === item.id);
                    return Number(bid?.rate || 0);
                  });
                  const positive = rates.filter((rate) => rate > 0).sort((a, b) => a - b);
                  const lowest = positive[0];
                  const second = positive.find((rate) => rate > lowest);
                  return (
                    <tr key={item.id || index} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-500">{index + 1}.</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.qty ?? 0} {item.uom || ""}
                      </td>
                      {compareVendors.map((entry, vendorIndex) => {
                        const rate = rates[vendorIndex];
                        const color =
                          rate > 0 && rate === lowest
                            ? "text-green-600"
                            : rate > 0 && rate === second
                            ? "text-orange-500"
                            : "text-gray-500";
                        return (
                          <td key={entry.vendorId} className={`px-4 py-3 ${color}`}>
                            {rate > 0 ? money(rate) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {headerMenu
        ? createPortal(
            <div
              ref={headerMenuRef}
              style={{ top: headerMenu.top, left: headerMenu.left }}
              className="fixed z-[100000] w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl"
            >
              <button type="button" onClick={() => void cancelRfq()} className="block w-full px-3 py-2 text-left hover:bg-gray-50">
                Cancel RFQ
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeaderMenu(null);
                  setAddIds([]);
                  setAddOpen(true);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                Add New Vendors
              </button>
            </div>,
            document.body
          )
        : null}

      {vendorMenu
        ? createPortal(
            <div
              ref={vendorMenuRef}
              style={{ top: vendorMenu.top, left: vendorMenu.left }}
              className="fixed z-[100000] w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl"
            >
              <button
                type="button"
                onClick={() => void removeVendor(vendorMenu.vendorId)}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                Remove Vendor
              </button>
              <button
                type="button"
                onClick={() => {
                  const entry = vendors.find((item) => item.vendorId === vendorMenu.vendorId);
                  if (entry) openFill(entry);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                Fill for vendor
              </button>
            </div>,
            document.body
          )
        : null}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} className="w-full max-w-md p-6" showCloseButton={false}>
        <h3 className="mb-3 text-lg font-semibold">Add New Vendors</h3>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 p-2">
          {addable.length === 0 ? (
            <p className="px-2 py-3 text-sm text-gray-400">No more vendors to add</p>
          ) : (
            addable.map((vendor) => (
              <label key={vendor.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={addIds.includes(vendor.id)}
                  onChange={(e) =>
                    setAddIds((prev) => (e.target.checked ? [...prev, vendor.id] : prev.filter((id) => id !== vendor.id)))
                  }
                />
                {vendor.name}
              </label>
            ))
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setAddOpen(false)} className="h-10 rounded-lg border px-4 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void addVendors()}
            className="h-10 rounded-lg px-4 text-sm text-white"
            style={{ backgroundColor: PINK }}
          >
            Add
          </button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(fillOpen)} onClose={() => setFillOpen(null)} className="w-full max-w-lg p-6" showCloseButton={false}>
        <h3 className="mb-3 text-lg font-semibold">Fill for {fillOpen?.vendor?.name}</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Delivery Date</label>
            <DatePickerField id="fill-vendor-delivery" value={fillDate} onChange={setFillDate} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Vendor Remark</label>
            <input value={fillRemark} onChange={(e) => setFillRemark(e.target.value)} className={fieldClass} />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Rate</th>
                </tr>
              </thead>
              <tbody>
                {(row.items || []).map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.qty ?? 0}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={fillRates[item.id || ""] || ""}
                        onChange={(e) => setFillRates((prev) => ({ ...prev, [item.id || ""]: e.target.value }))}
                        className="h-9 w-24 rounded border border-gray-200 px-2"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setFillOpen(null)} className="h-10 rounded-lg border px-4 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveFill()}
            className="h-10 rounded-lg px-4 text-sm text-white"
            style={{ backgroundColor: PINK }}
          >
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Kpi({ title, value, tone }: { title: string; value: string; tone: "blue" | "pink" | "sky" | "green" }) {
  const bg =
    tone === "blue"
      ? "from-[#DBEAFE] to-white"
      : tone === "pink"
      ? "from-[#FCE7F3] to-white"
      : tone === "sky"
      ? "from-[#E0F2FE] to-white"
      : "from-[#DCFCE7] to-white";
  return (
    <div className={`rounded-xl border border-gray-100 bg-gradient-to-b ${bg} p-4`}>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-lg font-semibold text-gray-800">{value}</p>
    </div>
  );
}
