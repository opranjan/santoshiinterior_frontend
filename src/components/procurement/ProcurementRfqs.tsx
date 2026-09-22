"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DatePickerField from "@/components/form/DatePickerField";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  procurementRequestsApi,
  projectsApi,
  rfqApi,
  vendorsApi,
  type RfqDto,
  type VendorDto,
} from "@/services/crmApi";

const PINK = "#E85D75";
const fieldClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#E85D75] dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const PLACES = [
  "Andhra Pradesh",
  "Bihar",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function blankItem() {
  return { name: "", code: "", uom: "", qty: 0, remark: "" };
}

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

export default function ProcurementRfqs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId") || "";
  const [items, setItems] = useState<RfqDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState(todayYmd());
  const [vendorId, setVendorId] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [rfqItems, setRfqItems] = useState<Array<{ name: string; code: string; uom: string; qty: number; remark: string }>>([
    blankItem(),
  ]);
  const [linkedRequestId, setLinkedRequestId] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await rfqApi.list({
        limit: 100,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setItems(data.items || []);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to load RFQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  useEffect(() => {
    projectsApi
      .list({ limit: 200 })
      .then((data) =>
        setProjects(
          (data.items || []).map((row) => {
            const item = row as { id: string; name?: string };
            return { id: item.id, name: item.name || "Untitled project" };
          })
        )
      )
      .catch(() => undefined);
    vendorsApi
      .list({ limit: 100 })
      .then((data) => setVendors(data.items || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null);
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const openGenerate = (prefill?: {
    name?: string;
    projectId?: string;
    expectedDelivery?: string;
    requestId?: string;
    items?: Array<{ name: string; code?: string; uom?: string; qty?: number; remark?: string }>;
  }) => {
    setName(prefill?.name || "");
    setProjectId(prefill?.projectId || "");
    setExpectedDelivery(prefill?.expectedDelivery ? prefill.expectedDelivery.slice(0, 10) : todayYmd());
    setVendorId("");
    setPlaceOfSupply("");
    setFiles([]);
    setLinkedRequestId(prefill?.requestId || "");
    setRfqItems(
      prefill?.items?.length
        ? prefill.items.map((item) => ({
            name: item.name || "",
            code: item.code || "",
            uom: item.uom || "",
            qty: Number(item.qty || 0),
            remark: item.remark || "",
          }))
        : [blankItem()]
    );
    setFormOpen(true);
  };

  useEffect(() => {
    if (!requestId) return;
    procurementRequestsApi
      .get(requestId)
      .then((row) => {
        const selected = searchParams.get("itemIds");
        const ids = selected ? selected.split(",").filter(Boolean) : [];
        const source = row.items || [];
        const picked = ids.length
          ? source.filter((item, index) => ids.includes(item.id || String(index)))
          : source.filter((item) => item.name?.trim());
        openGenerate({
          name: row.name,
          projectId: row.projectId || "",
          expectedDelivery: row.expectedDelivery || "",
          requestId: row.id,
          items: picked,
        });
      })
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load request"));
  }, [requestId]);

  const goNext = async () => {
    if (!name.trim()) {
      toastWarning("Request title is required.");
      return;
    }
    if (!projectId) {
      toastWarning("Project is required.");
      return;
    }
    if (!vendorId) {
      toastWarning("Vendor is required.");
      return;
    }
    if (!expectedDelivery) {
      toastWarning("Delivery date is required.");
      return;
    }
    try {
      setSaving(true);
      const created = await rfqApi.create({
        name: name.trim(),
        projectId,
        expectedDelivery,
        placeOfSupply: placeOfSupply || null,
        requestId: linkedRequestId || null,
        vendorIds: [vendorId],
        items: rfqItems.length ? rfqItems : [blankItem()],
      });
      if (files.length) {
        await rfqApi.uploadFiles(created.id, files);
      }
      setFormOpen(false);
      router.push(`/operations/procurement/rfq/${created.id}?new=1`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to open RFQ");
    } finally {
      setSaving(false);
    }
  };

  const menuRow = useMemo(() => items.find((row) => row.id === menu?.id) || null, [items, menu]);

  const copyFormLink = async (row: RfqDto) => {
    const url = `${window.location.origin}/rfq/${row.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess("Form link copied.");
    } catch {
      toastError("Could not copy link");
    }
    setMenu(null);
  };

  const copyRfq = async (row: RfqDto) => {
    try {
      await rfqApi.copy(row.id);
      toastSuccess("RFQ copied.");
      setMenu(null);
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to copy RFQ");
    }
  };

  const cancelRfq = async (row: RfqDto) => {
    try {
      await rfqApi.cancel(row.id);
      toastSuccess("RFQ cancelled.");
      setMenu(null);
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to cancel RFQ");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Request For Quotation</h2>
        <div className="flex items-center gap-2">
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600"
            >
              ⇆ Filters
            </button>
            {filtersOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                <label className="mb-1 block text-xs text-gray-500">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="ORDERED">Ordered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-10 w-48 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#E85D75]"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
          </div>
          <button
            type="button"
            onClick={() => openGenerate()}
            className="h-10 rounded-lg px-4 text-sm font-medium text-white"
            style={{ backgroundColor: PINK }}
          >
            + Generate RFQ
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white text-gray-500">
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Vendors</th>
              <th className="px-4 py-3 font-medium">Expected Delivery</th>
              <th className="px-4 py-3 font-medium">Item Count</th>
              <th className="px-4 py-3 font-medium">Created Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  Loading RFQs...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No RFQs yet. Generate one to send items to vendors.
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const vendorNames = (row.vendors || [])
                  .map((entry) => entry.vendor?.name)
                  .filter(Boolean) as string[];
                const extra = Math.max(0, vendorNames.length - 1);
                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                    onClick={() => router.push(`/operations/procurement/rfq/${row.id}`)}
                  >
                    <td className="px-4 py-4 text-gray-400">{row.code}</td>
                    <td className="max-w-[220px] truncate px-4 py-4 font-medium text-gray-800 dark:text-white/90">
                      {row.name}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-gray-600">{row.project?.name || "Unknown"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                      {vendorNames[0] || "—"}
                      {extra > 0 ? (
                        <span className="ml-1 text-xs font-medium text-[#2563EB]">+{extra} more</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{formatDate(row.expectedDelivery)}</td>
                    <td className="px-4 py-4 text-gray-600">{row.items?.length || 0}</td>
                    <td className="px-4 py-4 text-gray-600">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const rect = event.currentTarget.getBoundingClientRect();
                          const width = 180;
                          const height = 132;
                          const openUp = window.innerHeight - rect.bottom < height + 16;
                          setMenu({
                            id: row.id,
                            top: openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
                            left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
                          });
                        }}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="RFQ actions"
                      >
                        ⋮
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {menu && menuRow
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: menu.top, left: menu.left }}
              className="fixed z-[100000] w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl"
            >
              {menuRow.status !== "CANCELLED" ? (
                <button
                  type="button"
                  onClick={() => void cancelRfq(menuRow)}
                  className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                >
                  Cancel RFQ
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void copyFormLink(menuRow)}
                className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
              >
                Copy Form Link
              </button>
              <button
                type="button"
                onClick={() => void copyRfq(menuRow)}
                className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
              >
                Copy RFQ
              </button>
            </div>,
            document.body
          )
        : null}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        className="w-full max-w-xl p-6 shadow-xl"
        showCloseButton={false}
        overlayClassName="fixed inset-0 h-full w-full bg-black/35"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Raise RFQ</h3>
        <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Request Title <span className="text-[#E85D75]">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Request Title"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Project <span className="text-[#E85D75]">*</span>
              </label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldClass}>
                <option value="">Select</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Vendor <span className="text-[#E85D75]">*</span>
              </label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={fieldClass}>
                <option value="">Select</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Delivery date <span className="text-[#E85D75]">*</span>
                </label>
                <DatePickerField
                  id="raise-rfq-delivery-date"
                  value={expectedDelivery}
                  onChange={setExpectedDelivery}
                  placeholder="Select date"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Place of supply</label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Place of supply</option>
                  {PLACES.map((place) => (
                    <option key={place} value={place}>
                      {place}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Attach Receipt</p>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#E85D75]"
                >
                  <span className="text-lg leading-none">⊕</span> Add Attachments
                </button>
              </div>
            </div>
            {files.length ? (
              <p className="text-xs text-gray-500">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-10 rounded-lg border border-gray-200 px-5 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void goNext()}
                className="h-10 rounded-lg px-6 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: PINK }}
              >
                {saving ? "Opening..." : "Next"}
              </button>
            </div>
          </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ORDERED") {
    return (
      <span className="inline-flex rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-medium text-[#16A34A]">
        Ordered
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#FCE7EB] px-3 py-1 text-xs font-medium text-[#E85D75]">
      Pending
    </span>
  );
}
