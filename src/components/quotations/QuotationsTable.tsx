"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import QuotationPreviewModal, {
  openQuotationPrintWindow,
} from "./QuotationPreviewModal";
import { quotationsApi, storesApi } from "@/services/crmApi";
import { labelToEnum } from "@/lib/mappers";
import { mapQuotation } from "@/lib/crmMappers";

export type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Accepted"
  | "Rejected"
  | "Revised"
  | "Expired";

export type QuotationSourceType = "Lead" | "Client";

export type Quotation = {
  id: string;
  title: string;
  sourceType: QuotationSourceType;
  sourceId: string;
  clientName: string;
  phone: string;
  email: string;
  store: string;
  projectType: string;
  amount: number;
  status: QuotationStatus;
  validTill: string;
  createdAt: string;
  createdBy: string;
  version: number;
};

const statusColor: Record<
  QuotationStatus,
  "primary" | "info" | "warning" | "success" | "error" | "light"
> = {
  Draft: "light",
  Sent: "info",
  Viewed: "primary",
  Accepted: "success",
  Rejected: "error",
  Revised: "warning",
  Expired: "error",
};

const initialQuotations: Quotation[] = [
  {
    id: "QT-2401",
    title: "3 BHK Full Interiors",
    sourceType: "Lead",
    sourceId: "LD-1002",
    clientName: "Rajesh Malhotra",
    phone: "9811122334",
    email: "rajesh.m@email.com",
    store: "North Store",
    projectType: "Residential",
    amount: 1850000,
    status: "Sent",
    validTill: "2026-08-15",
    createdAt: "2026-07-28",
    createdBy: "Priya Mehta",
    version: 1,
  },
  {
    id: "QT-2402",
    title: "Office Interior Fit-out",
    sourceType: "Lead",
    sourceId: "LD-1003",
    clientName: "TechNest Pvt Ltd",
    phone: "9123456789",
    email: "projects@technest.com",
    store: "Main Branch",
    projectType: "Office",
    amount: 6200000,
    status: "Viewed",
    validTill: "2026-08-20",
    createdAt: "2026-07-26",
    createdBy: "Rahul Sharma",
    version: 2,
  },
  {
    id: "QT-2403",
    title: "2 BHK Renovation Package",
    sourceType: "Client",
    sourceId: "CL-501",
    clientName: "Meera Joshi",
    phone: "9988766554",
    email: "meera.j@email.com",
    store: "South Store",
    projectType: "Renovation",
    amount: 780000,
    status: "Draft",
    validTill: "2026-08-10",
    createdAt: "2026-07-29",
    createdBy: "Amit Verma",
    version: 1,
  },
  {
    id: "QT-2404",
    title: "Living + Kitchen Makeover",
    sourceType: "Client",
    sourceId: "CL-512",
    clientName: "Neha & Rohan Desai",
    phone: "9090980808",
    email: "desai.home@email.com",
    store: "Main Branch",
    projectType: "Residential",
    amount: 1250000,
    status: "Accepted",
    validTill: "2026-07-25",
    createdAt: "2026-07-12",
    createdBy: "Vikram Singh",
    version: 1,
  },
  {
    id: "QT-2405",
    title: "Showroom Interior Design",
    sourceType: "Lead",
    sourceId: "LD-1005",
    clientName: "Suresh Agarwal",
    phone: "9765432109",
    email: "suresh.a@email.com",
    store: "North Store",
    projectType: "Commercial",
    amount: 3100000,
    status: "Rejected",
    validTill: "2026-07-20",
    createdAt: "2026-07-08",
    createdBy: "Sneha Patel",
    version: 1,
  },
];

const stores = ["All Stores", "Main Branch", "North Store", "South Store"];
const statuses: Array<"All Status" | QuotationStatus> = [
  "All Status",
  "Draft",
  "Sent",
  "Viewed",
  "Accepted",
  "Rejected",
  "Revised",
  "Expired",
];

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

type ShareTarget = Quotation | null;

export default function QuotationsTable() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [storeNames, setStoreNames] = useState<string[]>(["All Stores"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [statusFilter, setStatusFilter] = useState<"All Status" | QuotationStatus>(
    "All Status"
  );
  const [sourceFilter, setSourceFilter] = useState<"All" | "Lead" | "Client">(
    "All"
  );
  const [shareTarget, setShareTarget] = useState<ShareTarget>(null);
  const [previewTarget, setPreviewTarget] = useState<ShareTarget>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [quoteData, storeData] = await Promise.all([
          quotationsApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreNames(["All Stores", ...storeData.items.map((s) => s.name)]);
        setQuotations(
          quoteData.items.map(
            (item) => mapQuotation(item as Record<string, unknown>) as Quotation
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load quotations"
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

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        q.id.toLowerCase().includes(term) ||
        q.clientName.toLowerCase().includes(term) ||
        q.phone.includes(term.replace(/\s/g, "")) ||
        q.sourceId.toLowerCase().includes(term) ||
        q.title.toLowerCase().includes(term);

      const matchesStore =
        storeFilter === "All Stores" || q.store === storeFilter;
      const matchesStatus =
        statusFilter === "All Status" || q.status === statusFilter;
      const matchesSource =
        sourceFilter === "All" || q.sourceType === sourceFilter;

      return matchesSearch && matchesStore && matchesStatus && matchesSource;
    });
  }, [quotations, search, storeFilter, statusFilter, sourceFilter]);

  const updateStatus = async (id: string, status: QuotationStatus) => {
    const prev = quotations;
    setQuotations((current) =>
      current.map((q) => (q.id === id ? { ...q, status } : q))
    );
    try {
      await quotationsApi.update(id, { status: labelToEnum(status) });
    } catch {
      setQuotations(prev);
    }
  };

  const markAsSent = (q: Quotation) => {
    updateStatus(q.id, q.status === "Draft" ? "Sent" : q.status);
    setShareTarget(q);
  };

  const shareLink = (q: Quotation) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/sales/quotations/${q.id}`;

  const shareWhatsApp = (q: Quotation) => {
    const message = encodeURIComponent(
      `Namaste ${q.clientName},\n\nPlease find your quotation from Santoshi Interior.\n\nQuotation: ${q.id}\nProject: ${q.title}\nAmount: ${formatINR(q.amount)}\nValid till: ${q.validTill}\n\nView / Download: ${shareLink(q)}\n\nThank you,\nSantoshi Interior`
    );
    window.open(`https://wa.me/91${q.phone}?text=${message}`, "_blank");
    if (q.status === "Draft") updateStatus(q.id, "Sent");
    setShareTarget(null);
  };

  const shareEmail = (q: Quotation) => {
    const subject = encodeURIComponent(
      `Santoshi Interior Quotation ${q.id} – ${q.title}`
    );
    const body = encodeURIComponent(
      `Dear ${q.clientName},\n\nPlease find your interior design quotation details below:\n\nQuotation No: ${q.id}\nProject: ${q.title}\nAmount: ${formatINR(q.amount)}\nValid Till: ${q.validTill}\n\nView quotation: ${shareLink(q)}\n\nRegards,\nSantoshi Interior Team`
    );
    window.open(`mailto:${q.email}?subject=${subject}&body=${body}`, "_blank");
    if (q.status === "Draft") updateStatus(q.id, "Sent");
    setShareTarget(null);
  };

  const copyLink = async (q: Quotation) => {
    try {
      await navigator.clipboard.writeText(shareLink(q));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (q.status === "Draft") updateStatus(q.id, "Sent");
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500">Loading quotations...</div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Quotations
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create from Lead / Client · Share · Track acceptance
          </p>
        </div>
        <Link href="/sales/quotations/new">
          <Button size="sm">+ Create Quotation</Button>
        </Link>
      </div>

      {/* Quick workflow tips */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            step: "1",
            title: "Create",
            desc: "From a Lead or existing Client with scope & line items",
          },
          {
            step: "2",
            title: "Share",
            desc: "Send via WhatsApp, Email, or shareable link / PDF",
          },
          {
            step: "3",
            title: "Convert",
            desc: "On Accept → move to Deal / Project & collect payment",
          },
        ].map((item) => (
          <div
            key={item.step}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <span className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {item.step}
            </span>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {item.title}
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          type="text"
          placeholder="Search QT ID, client, lead/client ID..."
          defaultValue={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className={selectClass}
        >
          {storeNames.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "All Status" | QuotationStatus)
          }
          className={selectClass}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) =>
            setSourceFilter(e.target.value as "All" | "Lead" | "Client")
          }
          className={selectClass}
        >
          <option value="All">All Sources</option>
          <option value="Lead">From Lead</option>
          <option value="Client">From Client</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1300px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {[
                    "Quotation",
                    "Client / Source",
                    "Store",
                    "Project",
                    "Amount",
                    "Valid Till",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="px-4 py-3 text-start">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {q.id}
                      </span>
                      <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                        v{q.version} · {q.createdAt} · {q.createdBy}
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {q.clientName}
                      </span>
                      <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                        {q.phone}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1">
                        <Badge size="sm" color={q.sourceType === "Lead" ? "warning" : "info"}>
                          {q.sourceType}
                        </Badge>
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {q.sourceId}
                        </span>
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {q.store}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start">
                      <span className="block text-gray-800 text-theme-sm dark:text-white/90">
                        {q.title}
                      </span>
                      <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                        {q.projectType}
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {formatINR(q.amount)}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {q.validTill}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start">
                      <div className="flex flex-col gap-2">
                        <Badge size="sm" color={statusColor[q.status]}>
                          {q.status}
                        </Badge>
                        <select
                          value={q.status}
                          onChange={(e) =>
                            updateStatus(q.id, e.target.value as QuotationStatus)
                          }
                          className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                          {(
                            [
                              "Draft",
                              "Sent",
                              "Viewed",
                              "Accepted",
                              "Rejected",
                              "Revised",
                              "Expired",
                            ] as QuotationStatus[]
                          ).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewTarget(q)}
                          className="text-left text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => markAsSent(q)}
                          className="text-left text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                        >
                          Share
                        </button>
                        <button
                          type="button"
                          onClick={() => openQuotationPrintWindow(q)}
                          className="text-left text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                        >
                          PDF / Print
                        </button>
                        <Link
                          href={`/sales/quotations/new?from=${q.sourceType.toLowerCase()}&id=${q.sourceId}`}
                          className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                        >
                          Revise
                        </Link>
                        {q.status === "Accepted" && (
                          <Link
                            href="/sales/deals"
                            className="text-sm font-medium text-success-600 hover:text-success-700"
                          >
                            Convert to Deal
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                      No quotations found. Create one from a Lead or Client.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Share modal */}
      {shareTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Share Quotation
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {shareTarget.id} · {shareTarget.clientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareTarget(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{shareTarget.title}</strong>
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatINR(shareTarget.amount)} · Valid till {shareTarget.validTill}
              </p>
              <p className="mt-1 text-theme-xs text-gray-400">
                Linked {shareTarget.sourceType}: {shareTarget.sourceId}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => shareWhatsApp(shareTarget)}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:hover:bg-brand-500/10"
              >
                <span className="text-xl">💬</span>
                <span>
                  <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                    WhatsApp
                  </span>
                  <span className="block text-theme-xs text-gray-500">
                    Send quote message to +91 {shareTarget.phone}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => shareEmail(shareTarget)}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:hover:bg-brand-500/10"
              >
                <span className="text-xl">✉️</span>
                <span>
                  <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                    Email
                  </span>
                  <span className="block text-theme-xs text-gray-500">
                    Open mail to {shareTarget.email || "client email"}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => copyLink(shareTarget)}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:hover:bg-brand-500/10"
              >
                <span className="text-xl">🔗</span>
                <span>
                  <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                    {copied ? "Link copied!" : "Copy share link"}
                  </span>
                  <span className="block text-theme-xs text-gray-500">
                    Client can open quotation online
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareTarget(null);
                  setPreviewTarget(shareTarget);
                }}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:hover:bg-brand-500/10"
              >
                <span className="text-xl">📄</span>
                <span>
                  <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                    Preview &amp; PDF
                  </span>
                  <span className="block text-theme-xs text-gray-500">
                    Professional quotation document
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShareTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {previewTarget && (
        <QuotationPreviewModal
          quotation={previewTarget}
          onClose={() => setPreviewTarget(null)}
          onShare={() => {
            setShareTarget(previewTarget);
            setPreviewTarget(null);
          }}
        />
      )}
    </div>
  );
}
