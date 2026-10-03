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

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

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

  if (loading) return <p className="text-sm text-[#8a7b68]">Loading RFQ...</p>;
  if (!row) return <p className="text-sm text-[#8a7b68]">RFQ not found</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/operations/procurement/rfq"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
          >
            <span aria-hidden>←</span>
            All RFQs
          </Link>
          <h1
            className="font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {row.code}
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">{row.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748] dark:border-[#3a342c] dark:bg-[#1a1714]"
          >
            Copy form link
          </button>
          <button
            type="button"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setHeaderMenu({ top: rect.bottom + 4, left: rect.right - 180 });
            }}
            className="rounded-lg p-1.5 text-[#8a7b68] hover:bg-[#eadfcf] hover:text-[#1c1610]"
            aria-label="RFQ more"
          >
            ⋮
          </button>
        </div>
      </div>

      <div className="inline-flex overflow-hidden rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
        <button
          type="button"
          onClick={() => setTab("vendors")}
          className={`h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
            tab === "vendors"
              ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              : "bg-[#fdfbf7] text-[#8a7b68] dark:bg-[#1a1714]"
          }`}
        >
          Vendor list
        </button>
        <button
          type="button"
          onClick={() => setTab("compare")}
          className={`h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
            tab === "compare"
              ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              : "bg-[#fdfbf7] text-[#8a7b68] dark:bg-[#1a1714]"
          }`}
        >
          Bid comparison
        </button>
      </div>

      {tab === "vendors" ? (
        <>
          <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#161411] dark:text-[#f3ece2]">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-[#8a7b68]">Project name : </span>
                <span className="font-medium">{row.project?.name || "Unknown"}</span>
              </p>
              <p>
                <span className="text-[#8a7b68]">Request title : </span>
                <span className="font-medium">{row.name}</span>
              </p>
              <p>
                <span className="text-[#8a7b68]">Expected delivery : </span>
                {formatDate(row.expectedDelivery)}
              </p>
              <p>
                <span className="text-[#8a7b68]">Status : </span>
                <span className={row.status === "PENDING" ? "text-[#9a7748]" : "text-[#1c1610] dark:text-[#e8d5b5]"}>
                  {row.status === "PENDING" ? "Pending" : row.status === "ORDERED" ? "Ordered" : "Cancelled"}
                </span>
              </p>
              <p>
                <span className="text-[#8a7b68]">Created date : </span>
                {formatDate(row.createdAt)}
              </p>
              <p>
                <span className="text-[#8a7b68]">Created by : </span>
                {row.createdBy?.name || "Procurement"}
              </p>
              <p className="sm:col-span-2">
                <span className="text-[#8a7b68]">Place of supply : </span>
                {row.placeOfSupply || "—"}
              </p>
              <p className="sm:col-span-2">
                <span className="text-[#8a7b68]">Remark : </span>
                {row.remark || row.name}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#8a7b68]">Attachments:</span>
            {(row.files || []).length === 0 ? (
              <span className="text-[#b3a594]">—</span>
            ) : (
              (row.files || []).map((file) => (
                <a
                  key={file.id}
                  href={designAssetUrl(file.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#eadfcf] bg-white px-2 py-1 text-xs text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                >
                  {file.fileName}
                </a>
              ))
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:bg-[#1c1914]">
                <tr>
                  <th className="px-4 py-3.5">Vendor name</th>
                  <th className="px-4 py-3.5">Delivery date</th>
                  <th className="px-4 py-3.5">Response</th>
                  <th className="px-4 py-3.5">Last response</th>
                  <th className="px-4 py-3.5">Total bidding</th>
                  <th className="px-4 py-3.5">Vendor remark</th>
                  <th className="px-4 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((entry) => (
                  <tr key={entry.vendorId} className="border-t border-[#f0e8db] dark:border-[#3a342c]">
                    <td className="px-4 py-3 font-medium text-[#1c1610] dark:text-[#f3ece2]">{entry.vendor?.name || "—"}</td>
                    <td className="px-4 py-3 text-[#8a7b68]">{entry.deliveryDate ? formatDate(entry.deliveryDate) : "-"}</td>
                    <td className="px-4 py-3 text-[#6b645b]">
                      {entry.responseStatus === "SUBMITTED" ? "Submitted" : "Pending"}(v{entry.version || 1})
                    </td>
                    <td className="px-4 py-3 text-[#8a7b68]">
                      {entry.lastResponseDate ? formatDate(entry.lastResponseDate) : "-"}
                    </td>
                    <td className="px-4 py-3 text-[#6b645b]">{entry.totalBidding || 0}</td>
                    <td className="px-4 py-3 text-[#8a7b68]">{entry.vendorRemark || "-"}</td>
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
                        className="rounded-lg p-1.5 text-[#8a7b68] hover:bg-[#eadfcf] hover:text-[#1c1610]"
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
            <Kpi title="Total bidding amount" value={money(totalBid)} />
            <Kpi title="Total submissions" value={`${submissions} response${submissions === 1 ? "" : "s"}`} accent />
            <Kpi title="Items compared" value={`${itemsCompared} item${itemsCompared === 1 ? "" : "s"}`} />
            <Kpi title="PO raised" value="0 items" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#8a7b68]">Filter vendors:</span>
              <select
                value={selectedVendors[0] || ""}
                onChange={(e) => setSelectedVendors(e.target.value ? [e.target.value] : vendors.map((v) => v.vendorId))}
                className="h-9 rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              >
                <option value="">All</option>
                {vendors.map((entry) => (
                  <option key={entry.vendorId} value={entry.vendorId}>
                    {entry.vendor?.name}
                  </option>
                ))}
              </select>
              <span className="inline-flex h-6 items-center rounded-full bg-[#f6efe4] px-2 text-xs font-medium text-[#9a7748]">
                {compareVendors.length} selected
              </span>
            </div>
            <p className="text-xs text-[#8a7b68]">
              <span className="mr-3 text-[#1c1610] dark:text-[#e8d5b5]">● Lowest bid</span>
              <span className="text-[#9a7748]">● Second lowest</span>
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:bg-[#1c1914]">
                <tr>
                  <th className="px-4 py-3.5">S. no.</th>
                  <th className="px-4 py-3.5">Item name</th>
                  <th className="px-4 py-3.5">Qty</th>
                  {compareVendors.map((entry) => (
                    <th key={entry.vendorId} className="px-4 py-3.5">
                      {entry.vendor?.name} (v{entry.version || 1})
                    </th>
                  ))}
                </tr>
                <tr className="border-t border-[#f0e8db] text-[#1c1610] dark:border-[#3a342c] dark:text-[#f3ece2]">
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
                    <tr key={item.id || index} className="border-t border-[#f0e8db] dark:border-[#3a342c]">
                      <td className="px-4 py-3 text-[#8a7b68]">{index + 1}.</td>
                      <td className="px-4 py-3 font-medium text-[#1c1610] dark:text-[#f3ece2]">{item.name || "—"}</td>
                      <td className="px-4 py-3 text-[#6b645b]">
                        {item.qty ?? 0} {item.uom || ""}
                      </td>
                      {compareVendors.map((entry, vendorIndex) => {
                        const rate = rates[vendorIndex];
                        const color =
                          rate > 0 && rate === lowest
                            ? "text-[#1c1610] dark:text-[#e8d5b5]"
                            : rate > 0 && rate === second
                            ? "text-[#9a7748]"
                            : "text-[#8a7b68]";
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
              className="fixed z-[100000] w-44 overflow-hidden rounded-xl border border-[#eadfcf] bg-white py-1 text-sm shadow-xl dark:border-[#3a342c] dark:bg-[#161411]"
            >
              <button type="button" onClick={() => void cancelRfq()} className="block w-full px-3 py-2 text-left text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f3ece2] dark:hover:bg-white/5">
                Cancel RFQ
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeaderMenu(null);
                  setAddIds([]);
                  setAddOpen(true);
                }}
                className="block w-full px-3 py-2 text-left text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f3ece2] dark:hover:bg-white/5"
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
              className="fixed z-[100000] w-40 overflow-hidden rounded-xl border border-[#eadfcf] bg-white py-1 text-sm shadow-xl dark:border-[#3a342c] dark:bg-[#161411]"
            >
              <button
                type="button"
                onClick={() => void removeVendor(vendorMenu.vendorId)}
                className="block w-full px-3 py-2 text-left text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f3ece2] dark:hover:bg-white/5"
              >
                Remove Vendor
              </button>
              <button
                type="button"
                onClick={() => {
                  const entry = vendors.find((item) => item.vendorId === vendorMenu.vendorId);
                  if (entry) openFill(entry);
                }}
                className="block w-full px-3 py-2 text-left text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f3ece2] dark:hover:bg-white/5"
              >
                Fill for vendor
              </button>
            </div>,
            document.body
          )
        : null}

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        className="w-full max-w-md overflow-hidden border border-[#eadfcf] bg-[#fdfbf7] p-0 dark:border-[#3a342c] dark:bg-[#161411]"
        showCloseButton={false}
      >
        <div className="border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c]">
          <h3
            className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Add vendors
          </h3>
        </div>
        <div className="px-6 py-4">
        <div className="max-h-56 overflow-y-auto rounded-xl border border-[#eadfcf] p-2 dark:border-[#3a342c]">
          {addable.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[#8a7b68]">No more vendors to add</p>
          ) : (
            addable.map((vendor) => (
              <label key={vendor.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[#fbf8f3] dark:hover:bg-white/5">
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
          <button type="button" onClick={() => setAddOpen(false)} className="h-10 rounded-xl border border-[#eadfcf] px-4 text-sm dark:border-[#3a342c]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void addVendors()}
            className="h-10 rounded-xl bg-[#1c1610] px-4 text-sm font-medium text-[#e8d5b5]"
          >
            Add
          </button>
        </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(fillOpen)}
        onClose={() => setFillOpen(null)}
        className="w-full max-w-lg overflow-hidden border border-[#eadfcf] bg-[#fdfbf7] p-0 dark:border-[#3a342c] dark:bg-[#161411]"
        showCloseButton={false}
      >
        <div className="border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c]">
          <h3
            className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Fill for {fillOpen?.vendor?.name}
          </h3>
        </div>
        <div className="space-y-3 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Delivery date</label>
            <DatePickerField id="fill-vendor-delivery" value={fillDate} onChange={setFillDate} />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Vendor remark</label>
            <input value={fillRemark} onChange={(e) => setFillRemark(e.target.value)} className={fieldClass} />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
            <table className="w-full text-sm">
              <thead className="bg-[#fbf8f3] text-[#8a7b68] dark:bg-[#1c1914]">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Rate</th>
                </tr>
              </thead>
              <tbody>
                {(row.items || []).map((item) => (
                  <tr key={item.id} className="border-t border-[#f0e8db] dark:border-[#3a342c]">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.qty ?? 0}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={fillRates[item.id || ""] || ""}
                        onChange={(e) => setFillRates((prev) => ({ ...prev, [item.id || ""]: e.target.value }))}
                        className="h-9 w-24 rounded-lg border border-[#eadfcf] bg-[#fdfbf7] px-2 dark:border-[#3a342c] dark:bg-[#1a1714]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => setFillOpen(null)} className="h-10 rounded-xl border border-[#eadfcf] px-4 text-sm dark:border-[#3a342c]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveFill()}
            className="h-10 rounded-xl bg-[#1c1610] px-4 text-sm font-medium text-[#e8d5b5]"
          >
            Save
          </button>
        </div>
        </div>
      </Modal>
    </div>
  );
}

function Kpi({ title, value, accent }: { title: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 dark:border-[#3a342c] dark:bg-[#161411]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">{title}</p>
      <p
        className={`mt-2 font-serif text-lg ${accent ? "text-[#9a7748]" : "text-[#1c1610] dark:text-[#f3ece2]"}`}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {value}
      </p>
    </div>
  );
}
