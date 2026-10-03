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
import { useAuth } from "@/context/AuthContext";
import { isVendorUser } from "@/lib/permissions";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
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
  const { user } = useAuth();
  const vendorView = isVendorUser(user);
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId") || "";
  const [items, setItems] = useState<RfqDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
      const target = event.target as Node | HTMLElement;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !(target instanceof Element && target.closest("[data-rfq-actions]"))
      ) {
        setMenu(null);
      }
    };
    const onScroll = () => setMenu(null);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
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
  const stats = useMemo(
    () => ({
      pending: items.filter((row) => row.status === "PENDING").length,
      ordered: items.filter((row) => row.status === "ORDERED").length,
      cancelled: items.filter((row) => row.status === "CANCELLED").length,
    }),
    [items]
  );
  const activeFilters = [search, statusFilter].filter(Boolean).length;

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
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            Procurement
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Request for quotation
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Send items to vendors, collect bids, and compare responses.
          </p>
        </div>
        {vendorView ? null : (
          <button
            type="button"
            onClick={() => openGenerate()}
            className="inline-flex h-11 w-fit shrink-0 items-center self-start rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] hover:bg-black dark:bg-[#e8d5b5] dark:text-[#1c1610] lg:self-auto"
          >
            + Generate RFQ
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-y divide-[#eadfcf] sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-[#3a342c]">
          <StatTile label="On this list" value={loading ? "—" : String(items.length)} />
          <StatTile label="Pending" value={loading ? "—" : String(stats.pending)} accent />
          <StatTile label="Ordered" value={loading ? "—" : String(stats.ordered)} />
          <StatTile label="Cancelled" value={loading ? "—" : String(stats.cancelled)} />
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, name, or project"
              className={`${fieldClass} pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${fieldClass} lg:max-w-[200px]`}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ORDERED">Ordered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {activeFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
              }}
              className="h-11 shrink-0 rounded-xl px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748] hover:bg-white dark:hover:bg-white/10"
            >
              Reset · {activeFilters}
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Name</th>
                <th className="px-4 py-3.5">Project</th>
                <th className="px-4 py-3.5">Vendors</th>
                <th className="px-4 py-3.5">Expected</th>
                <th className="px-4 py-3.5">Items</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                    Loading RFQs…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p
                      className="font-serif text-xl text-[#1c1610] dark:text-[#f4efe6]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      No RFQs yet
                    </p>
                    <p className="mt-1 text-sm text-[#8a7b68]">
                      Generate an RFQ to send items to vendors for bidding.
                    </p>
                    {vendorView ? null : (
                      <button
                        type="button"
                        onClick={() => openGenerate()}
                        className="mt-4 h-10 rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
                      >
                        + Generate RFQ
                      </button>
                    )}
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
                      className="cursor-pointer border-b border-[#f0e8db] last:border-0 hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                      onClick={() => router.push(`/operations/procurement/rfq/${row.id}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#9a7748]">{row.code}</td>
                      <td className="max-w-[220px] truncate px-4 py-3.5 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                        {row.name}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 text-[#6b645b]">
                        {row.project?.name || "Unknown"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[#1c1610] dark:text-[#f3ece2]">
                        {vendorNames[0] || "—"}
                        {extra > 0 ? (
                          <span className="ml-1 text-xs font-semibold text-[#9a7748]">+{extra} more</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-[#6b645b]">{formatDate(row.expectedDelivery)}</td>
                      <td className="px-4 py-3.5 text-[#6b645b]">{row.items?.length || 0}</td>
                      <td className="px-4 py-3.5 text-[#6b645b]">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          data-rfq-actions
                          onClick={(event) => {
                            if (menu?.id === row.id) {
                              setMenu(null);
                              return;
                            }
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
                          className="rounded-lg p-1.5 text-[#8a7b68] hover:bg-[#eadfcf] hover:text-[#1c1610] dark:hover:bg-[#2a251f] dark:hover:text-[#e8d5b5]"
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
      </div>

      {menu && menuRow
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: menu.top, left: menu.left }}
              className="fixed z-[100000] w-[180px] overflow-hidden rounded-xl border border-[#eadfcf] bg-white py-1 text-sm shadow-xl dark:border-[#3a342c] dark:bg-[#161411]"
            >
              {menuRow.status !== "CANCELLED" ? (
                <button
                  type="button"
                  onClick={() => void cancelRfq(menuRow)}
                  className="block w-full px-3 py-2 text-left text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f3ece2] dark:hover:bg-white/5"
                >
                  Cancel RFQ
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void copyFormLink(menuRow)}
                className="block w-full px-3 py-2 text-left text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f3ece2] dark:hover:bg-white/5"
              >
                Copy form link
              </button>
              <button
                type="button"
                onClick={() => void copyRfq(menuRow)}
                className="block w-full px-3 py-2 text-left text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f3ece2] dark:hover:bg-white/5"
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
        className="w-full max-w-xl overflow-hidden border border-[#eadfcf] bg-[#fdfbf7] p-0 shadow-xl dark:border-[#3a342c] dark:bg-[#161411]"
        showCloseButton={false}
        overlayClassName="fixed inset-0 h-full w-full bg-black/40"
      >
        <div className="border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c] dark:bg-[#1c1914]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">New</p>
          <h3
            className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Generate RFQ
          </h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
              Request title <span className="text-[#c4a574]">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Request title"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
              Project <span className="text-[#c4a574]">*</span>
            </label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldClass}>
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
              Vendor <span className="text-[#c4a574]">*</span>
            </label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={fieldClass}>
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                Delivery date <span className="text-[#c4a574]">*</span>
              </label>
              <DatePickerField
                id="raise-rfq-delivery-date"
                value={expectedDelivery}
                onChange={setExpectedDelivery}
                placeholder="Select date"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                Place of supply
              </label>
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
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-[#c4a574]/70 bg-white px-3 text-sm font-medium text-[#9a7748] hover:bg-[#fbf8f3] dark:bg-[#1a1714]"
            >
              + Add attachments
            </button>
            {files.length ? (
              <p className="mt-1.5 text-xs text-[#8a7b68]">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eadfcf] px-6 py-4 dark:border-[#3a342c]">
          <button
            type="button"
            onClick={() => setFormOpen(false)}
            className="h-11 rounded-xl border border-[#eadfcf] px-5 text-sm font-medium text-[#6b645b] dark:border-[#3a342c]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void goNext()}
            className="h-11 rounded-xl bg-[#1c1610] px-6 text-sm font-semibold text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
          >
            {saving ? "Opening..." : "Next"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">{label}</p>
      <p
        className={`mt-1 font-serif text-2xl ${accent ? "text-[#9a7748]" : "text-[#1c1610] dark:text-[#f3ece2]"}`}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ORDERED") {
    return (
      <span className="inline-flex rounded-full bg-[#1c1610] px-2.5 py-1 text-[11px] font-semibold text-[#e8d5b5]">
        Ordered
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex rounded-full bg-[#f4f1eb] px-2.5 py-1 text-[11px] font-semibold text-[#8a7b68] dark:bg-white/5">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#f6efe4] px-2.5 py-1 text-[11px] font-semibold text-[#9a7748] dark:bg-[#c4a574]/15 dark:text-[#e8d5b5]">
      Pending
    </span>
  );
}
