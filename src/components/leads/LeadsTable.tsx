"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { leadsApi, type LeadDto } from "@/services/crmApi";
import { enumToLabel, formatDate, labelToEnum } from "@/lib/mappers";

type LeadStatus =
  | "Created"
  | "New"
  | "Contacted"
  | "Site Visit"
  | "Quotation"
  | "Negotiation"
  | "Won"
  | "Lost";

type FollowUpType =
  | "Call"
  | "WhatsApp"
  | "Email"
  | "Site Visit"
  | "Meeting"
  | "Other";

type FollowUpEntry = {
  id: string;
  date: string;
  type: FollowUpType;
  note: string;
  by: string;
  nextDate: string;
  nextTime?: string;
};

type Lead = {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  store: string;
  projectName: string;
  projectType: string;
  scope: string;
  budget: string;
  source: string;
  status: LeadStatus;
  salesOwner: string;
  assignedTo: string;
  description: string;
  latestRemark: string;
  tentativeStart: string;
  financialYear: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
  followUps: FollowUpEntry[];
};

const salesTeam = [
  "Unassigned",
  "Mukesh singh",
  "Rahul Sharma",
  "Priya Mehta",
  "Amit Verma",
  "Sneha Patel",
  "Vikram Singh",
  "Riya",
  "Diksha",
  "Shivani Gupta",
];

const followUpTypes: FollowUpType[] = [
  "Call",
  "WhatsApp",
  "Email",
  "Site Visit",
  "Meeting",
  "Other",
];

const avatarColors = [
  "bg-error-500 text-white",
  "bg-pink-500 text-white",
  "bg-brand-500 text-white",
  "bg-warning-500 text-white",
  "bg-success-500 text-white",
  "bg-blue-light-500 text-white",
];

const initialLeads: Lead[] = [
  {
    id: "LD-751",
    clientName: "Ravi Mvr",
    phone: "+919643469755",
    email: "",
    store: "Main Branch",
    projectName: "Project - 4683",
    projectType: "Residential",
    scope: "Full Home Interiors",
    budget: "₹10 – 25 Lakh",
    source: "Instagram",
    status: "Created",
    salesOwner: "Riya",
    assignedTo: "Mukesh singh",
    description: "Full home interiors for 3BHK",
    latestRemark: "[Ms] Lead Created (26-Jul-26)",
    tentativeStart: "2026-08-15",
    financialYear: "2026-27",
    tags: "hot, residential",
    createdAt: "2026-07-26T19:21:00",
    updatedAt: "2026-07-26T13:51:00",
    followUps: [],
  },
  {
    id: "LD-750",
    clientName: "Piyush",
    phone: "+919876543210",
    email: "",
    store: "North Store",
    projectName: "Project - 7533",
    projectType: "Residential",
    scope: "Modular Kitchen",
    budget: "₹5 – 10 Lakh",
    source: "Referral",
    status: "Created",
    salesOwner: "Diksha",
    assignedTo: "Shivani Gupta",
    description: "",
    latestRemark: "[Sg] Follow-up scheduled (26-Jul-26)",
    tentativeStart: "2026-08-01",
    financialYear: "2026-27",
    tags: "kitchen",
    createdAt: "2026-07-26T18:10:00",
    updatedAt: "2026-07-26T13:50:00",
    followUps: [
      {
        id: "FU-7501",
        date: "2026-07-26",
        type: "Call",
        note: "Client asked for modular kitchen quote.",
        by: "Shivani Gupta",
        nextDate: "2026-07-19",
        nextTime: "5:30 PM",
      },
    ],
  },
  {
    id: "LD-747",
    clientName: "Neha",
    phone: "+918765432109",
    email: "neha@email.com",
    store: "Main Branch",
    projectName: "Project - 4120",
    projectType: "Commercial",
    scope: "Office Fit-out",
    budget: "₹25 – 50 Lakh",
    source: "Website",
    status: "Contacted",
    salesOwner: "Riya",
    assignedTo: "Mukesh singh",
    description: "50-seater office cabin + reception",
    latestRemark: "[Ms] Lead Created (26-Jul-26)",
    tentativeStart: "2026-09-01",
    financialYear: "2026-27",
    tags: "office, commercial",
    createdAt: "2026-07-26T16:05:00",
    updatedAt: "2026-07-26T12:40:00",
    followUps: [],
  },
  {
    id: "LD-746",
    clientName: "Mahan K",
    phone: "+917654321098",
    email: "",
    store: "South Store",
    projectName: "Project - 3901",
    projectType: "Renovation",
    scope: "Living Room",
    budget: "Under ₹5 Lakh",
    source: "Walk-in",
    status: "New",
    salesOwner: "Amit Verma",
    assignedTo: "Amit Verma",
    description: "Living room false ceiling + TV unit",
    latestRemark: "[Av] Lead Created (25-Jul-26)",
    tentativeStart: "",
    financialYear: "2026-27",
    tags: "",
    createdAt: "2026-07-25T11:20:00",
    updatedAt: "2026-07-25T11:20:00",
    followUps: [],
  },
  {
    id: "LD-1002",
    clientName: "Rajesh Malhotra",
    phone: "+919811122334",
    email: "rajesh@email.com",
    store: "North Store",
    projectName: "Villa Interiors - Bhopal",
    projectType: "Residential",
    scope: "Full Home Interiors",
    budget: "₹25 – 50 Lakh",
    source: "Referral",
    status: "Site Visit",
    salesOwner: "Priya Mehta",
    assignedTo: "Priya Mehta",
    description: "4BHK villa modular kitchen priority",
    latestRemark: "[Pm] Site visit done (28-Jul-26)",
    tentativeStart: "2026-08-10",
    financialYear: "2026-27",
    tags: "villa, hot",
    createdAt: "2026-07-25T10:00:00",
    updatedAt: "2026-07-28T15:30:00",
    followUps: [
      {
        id: "FU-2001",
        date: "2026-07-26",
        type: "Call",
        note: "Discussed 4BHK layout preferences.",
        by: "Priya Mehta",
        nextDate: "2026-07-28",
      },
      {
        id: "FU-2002",
        date: "2026-07-28",
        type: "Site Visit",
        note: "Visited site. Measurements taken.",
        by: "Priya Mehta",
        nextDate: "2026-07-31",
        nextTime: "11:00 AM",
      },
    ],
  },
  {
    id: "LD-1003",
    clientName: "TechNest Pvt Ltd",
    phone: "+919123456789",
    email: "ops@technest.in",
    store: "Main Branch",
    projectName: "TechNest Office Fit-out",
    projectType: "Office",
    scope: "Office Fit-out",
    budget: "Above ₹50 Lakh",
    source: "Website",
    status: "Quotation",
    salesOwner: "Rahul Sharma",
    assignedTo: "Rahul Sharma",
    description: "50-seater office with cabin partition",
    latestRemark: "[Rs] Quotation sent (28-Jul-26)",
    tentativeStart: "2026-09-15",
    financialYear: "2026-27",
    tags: "b2b, office",
    createdAt: "2026-07-20T09:00:00",
    updatedAt: "2026-07-28T17:00:00",
    followUps: [
      {
        id: "FU-3001",
        date: "2026-07-22",
        type: "Meeting",
        note: "Met with MD. Cabin partition + reception needed.",
        by: "Rahul Sharma",
        nextDate: "2026-08-02",
        nextTime: "3:00 PM",
      },
    ],
  },
];

const statusColor: Record<
  LeadStatus,
  "primary" | "info" | "warning" | "success" | "error" | "light"
> = {
  Created: "light",
  New: "primary",
  Contacted: "info",
  "Site Visit": "warning",
  Quotation: "info",
  Negotiation: "warning",
  Won: "success",
  Lost: "error",
};

const followUpTypeIcon: Record<FollowUpType, string> = {
  Call: "📞",
  WhatsApp: "💬",
  Email: "✉️",
  "Site Visit": "🏠",
  Meeting: "🤝",
  Other: "📋",
};

const statuses: Array<"All Status" | LeadStatus> = [
  "All Status",
  "Created",
  "New",
  "Contacted",
  "Site Visit",
  "Quotation",
  "Negotiation",
  "Won",
  "Lost",
];

const sortOptions = [
  { value: "updated-desc", label: "Last Updated" },
  { value: "created-desc", label: "Newest First" },
  { value: "created-asc", label: "Oldest First" },
  { value: "name-asc", label: "Client Name A–Z" },
];

const selectClass =
  "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function getInitials(name: string) {
  if (!name || name === "Unassigned") return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % avatarColors.length;
  return avatarColors[hash];
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  const time = d.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day}-${mon}-${year} ${time}`;
}

function relativeTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatShortFollowUp(date: string, time?: string) {
  if (!date || date === "-") return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const day = d.getDate();
  const mon = d.toLocaleString("en-GB", { month: "short" });
  return time ? `${day} ${mon}, ${time}` : `${day} ${mon}`;
}

function isOverdue(dateStr: string) {
  if (!dateStr || dateStr === "-") return false;
  return new Date(dateStr) < new Date(new Date().toISOString().slice(0, 10));
}

const columns = [
  "ID",
  "Client Name",
  "Status",
  "Phone",
  "Email",
  "Follow Up",
  "Project Name",
  "Assigned To",
  "Sales Owner",
  "Budget",
  "Scope",
  "Project Type",
  "Source",
  "Store",
  "Description",
  "Latest Remark",
  "Tentative Start",
  "FY",
  "Created Date",
  "Last Update",
  "Actions",
] as const;

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await leadsApi.list({ limit: 100 });
        if (cancelled) return;
        setLeads(
          data.items.map((dto: LeadDto): Lead => ({
            id: dto.id,
            clientName: dto.clientName,
            phone: dto.phone,
            email: dto.email || "",
            store: dto.store?.name || "",
            projectName: dto.projectName || "",
            projectType: dto.projectType || "",
            scope: dto.scope || "",
            budget: dto.budget || "",
            source: dto.source || "",
            status: (enumToLabel(dto.status) || "New") as LeadStatus,
            salesOwner: dto.salesOwner?.name || "Unassigned",
            assignedTo: dto.assignedTo?.name || "Unassigned",
            description: dto.description || "",
            latestRemark: dto.latestRemark || "",
            tentativeStart: formatDate(dto.tentativeStart),
            financialYear: dto.financialYear || "",
            tags: dto.tags || "",
            createdAt: dto.createdAt,
            updatedAt: dto.updatedAt,
            followUps: (dto.followUps || []).map((f) => ({
              id: f.id,
              date: formatDate(f.date),
              type: (enumToLabel(f.type) || "Call") as FollowUpType,
              note: f.note || "",
              by: f.by?.name || "",
              nextDate: formatDate(f.nextDate),
              nextTime: f.nextTime || "",
            })),
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load leads");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All Status" | LeadStatus>(
    "All Status"
  );
  const [otherFilter, setOtherFilter] = useState("none");
  const [sortBy, setSortBy] = useState("updated-desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [followUpLeadId, setFollowUpLeadId] = useState<string | null>(null);
  const [fuType, setFuType] = useState<FollowUpType>("Call");
  const [fuNote, setFuNote] = useState("");
  const [fuNextDate, setFuNextDate] = useState("");
  const [historyLeadId, setHistoryLeadId] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    let list = leads.filter((lead) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lead.id.toLowerCase().includes(q) ||
        lead.clientName.toLowerCase().includes(q) ||
        lead.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        lead.projectName.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.tags.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All Status" || lead.status === statusFilter;

      let matchesOther = true;
      if (otherFilter === "unassigned") {
        matchesOther = lead.assignedTo === "Unassigned";
      } else if (otherFilter === "overdue") {
        const next = lead.followUps[lead.followUps.length - 1]?.nextDate;
        matchesOther = !!next && isOverdue(next);
      } else if (otherFilter === "no-email") {
        matchesOther = !lead.email;
      } else if (otherFilter === "has-budget") {
        matchesOther = !!lead.budget;
      }

      return matchesSearch && matchesStatus && matchesOther;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "created-desc":
          return b.createdAt.localeCompare(a.createdAt);
        case "created-asc":
          return a.createdAt.localeCompare(b.createdAt);
        case "name-asc":
          return a.clientName.localeCompare(b.clientName);
        case "updated-desc":
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });

    return list;
  }, [leads, search, statusFilter, otherFilter, sortBy]);

  const leadsValueLabel = "₹ 0";

  const allVisibleSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((l) => selected.includes(l.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) =>
        prev.filter((id) => !filteredLeads.some((l) => l.id === id))
      );
    } else {
      setSelected((prev) => [
        ...new Set([...prev, ...filteredLeads.map((l) => l.id)]),
      ]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      // ignore
    }
  };

  const handleAssign = (leadId: string, assignee: string) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, assignedTo: assignee } : lead
      )
    );
  };

  const handleStatusChange = (leadId: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status,
              updatedAt: new Date().toISOString(),
              latestRemark: `[${getInitials(lead.assignedTo)}] Status → ${status} (${formatDateTime(new Date().toISOString()).split(" ")[0]})`,
            }
          : lead
      )
    );
  };

  const openFollowUpModal = (leadId: string) => {
    setFollowUpLeadId(leadId);
    setFuType("Call");
    setFuNote("");
    setFuNextDate("");
  };

  const saveFollowUp = async () => {
    if (!followUpLeadId || !fuNote.trim()) return;
    const lead = leads.find((l) => l.id === followUpLeadId);
    try {
      const created = await leadsApi.addFollowUp(followUpLeadId, {
        type: labelToEnum(fuType),
        note: fuNote.trim(),
        nextDate: fuNextDate || null,
      });
      const entry: FollowUpEntry = {
        id: (created as { id?: string })?.id || `FU-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: fuType,
        note: fuNote.trim(),
        by: lead?.assignedTo || "—",
        nextDate: fuNextDate || "-",
      };
      setLeads((prev) =>
        prev.map((l) =>
          l.id === followUpLeadId
            ? {
                ...l,
                followUps: [...l.followUps, entry],
                updatedAt: new Date().toISOString(),
                latestRemark: fuNote.trim(),
              }
            : l
        )
      );
      setFollowUpLeadId(null);
    } catch {
      // keep modal open on failure
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All Status");
    setOtherFilter("none");
    setSortBy("updated-desc");
  };

  const historyLead = historyLeadId
    ? leads.find((l) => l.id === historyLeadId)
    : null;

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-4 text-sm text-gray-500">Loading leads...</div>
      )}
    <div className="space-y-4">
      {/* Stats + actions */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Leads Count
            </p>
            <p className="text-xl font-semibold text-brand-500 dark:text-brand-400">
              {filteredLeads.length}
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Leads Value
            </p>
            <p className="text-xl font-semibold text-brand-500 dark:text-brand-400">
              {leadsValueLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M21 21l-4.3-4.3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <Link href="/sales/leads/new">
            <Button size="sm">+ New Lead</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/[0.05] dark:bg-white/[0.03] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-400">
              Lead Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "All Status" | LeadStatus)
              }
              className={selectClass}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                  {s !== "All Status"
                    ? ` +${leads.filter((l) => l.status === s).length}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-400">
              Filter By
            </label>
            <select
              value={otherFilter}
              onChange={(e) => setOtherFilter(e.target.value)}
              className={selectClass}
            >
              <option value="none">Select Other Filters</option>
              <option value="unassigned">Unassigned</option>
              <option value="overdue">Overdue Follow-ups</option>
              <option value="no-email">Missing Email</option>
              <option value="has-budget">Has Budget</option>
            </select>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            title="Reset filters"
            className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-400">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={selectClass}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[2200px]">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="w-12 px-3 py-3 text-start"
                  >
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                      aria-label="Select all"
                    />
                  </TableCell>
                  {columns.map((heading) => (
                    <TableCell
                      key={heading}
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap"
                    >
                      {heading}
                      {heading === "Latest Remark" ? " ✎" : ""}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filteredLeads.map((lead) => {
                  const nextFu = lead.followUps[lead.followUps.length - 1];
                  const overdue = nextFu ? isOverdue(nextFu.nextDate) : false;
                  const isSelected = selected.includes(lead.id);

                  return (
                    <TableRow
                      key={lead.id}
                      className={
                        overdue || isSelected
                          ? "bg-error-50/60 dark:bg-error-500/5"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      }
                    >
                      <TableCell className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`Select ${lead.id}`}
                        />
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        <div className="group flex items-center gap-1.5">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {lead.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyId(lead.id)}
                            className="text-gray-300 opacity-0 transition group-hover:opacity-100 hover:text-brand-500"
                            title="Copy ID"
                          >
                            {copiedId === lead.id ? "✓" : "⧉"}
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/10">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M21 12c0 4.4-4 8-9 8-1.1 0-2.1-.2-3.1-.5L3 21l1.7-4.2C3.6 15.5 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {lead.clientName}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="inline-flex w-fit items-center gap-1 rounded-full border border-success-200 bg-success-50 px-2 py-0.5 dark:border-success-500/30 dark:bg-success-500/10">
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  lead.id,
                                  e.target.value as LeadStatus
                                )
                              }
                              className="bg-transparent text-xs font-medium text-success-700 focus:outline-hidden dark:text-success-400"
                            >
                              {(
                                [
                                  "Created",
                                  "New",
                                  "Contacted",
                                  "Site Visit",
                                  "Quotation",
                                  "Negotiation",
                                  "Won",
                                  "Lost",
                                ] as LeadStatus[]
                              ).map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                          <span className="flex items-center gap-1 text-theme-xs text-gray-400">
                            <span>⏱</span>
                            {relativeTime(lead.updatedAt)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-700 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.phone || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                        {lead.email || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        {nextFu && nextFu.nextDate !== "-" ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => setHistoryLeadId(lead.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                            >
                              {lead.followUps.length}{" "}
                              {nextFu.type.toLowerCase()}
                            </button>
                            <p
                              className={`mt-1 text-theme-xs ${
                                overdue
                                  ? "text-error-500"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {formatShortFollowUp(
                                nextFu.nextDate,
                                nextFu.nextTime
                              )}
                              {overdue ? " • overdue" : ""}
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openFollowUpModal(lead.id)}
                            className="rounded-lg border border-dashed border-brand-300 px-2.5 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-50 dark:border-brand-500/40 dark:hover:bg-brand-500/10"
                          >
                            + Add follow-up
                          </button>
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📄</span>
                          <span className="text-gray-800 text-theme-sm dark:text-white/90">
                            {lead.projectName || "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start">
                        <div className="flex items-center gap-2" title={lead.assignedTo}>
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${avatarClass(lead.assignedTo)}`}
                          >
                            {getInitials(lead.assignedTo)}
                          </span>
                          <select
                            value={lead.assignedTo}
                            onChange={(e) =>
                              handleAssign(lead.id, e.target.value)
                            }
                            className="h-8 max-w-[120px] rounded-md border border-transparent bg-transparent text-xs text-gray-600 hover:border-gray-200 focus:border-brand-300 focus:outline-hidden dark:text-gray-300"
                          >
                            {salesTeam.map((member) => (
                              <option key={member} value={member}>
                                {member}
                              </option>
                            ))}
                          </select>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.salesOwner || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.budget || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.scope || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.projectType || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.source || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.store || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400 max-w-[220px]">
                        <span className="line-clamp-2">
                          {lead.description || "—"}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400 max-w-[240px]">
                        <span className="line-clamp-2">
                          {lead.latestRemark || "—"}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.tentativeStart || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300 whitespace-nowrap">
                        {lead.financialYear || "—"}
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        <span className="block text-gray-700 text-theme-sm dark:text-gray-300">
                          {formatDateTime(lead.createdAt)}
                        </span>
                        <span className="block text-theme-xs text-gray-400">
                          {relativeTime(lead.createdAt)}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        <span className="block text-gray-700 text-theme-sm dark:text-gray-300">
                          {formatDateTime(lead.updatedAt)}
                        </span>
                        <span className="block text-theme-xs text-gray-400">
                          {relativeTime(lead.updatedAt)}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openFollowUpModal(lead.id)}
                            className="text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            Follow Up
                          </button>
                          {lead.followUps.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setHistoryLeadId(lead.id)}
                              className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                            >
                              History
                            </button>
                          )}
                          <Link
                            href={`/sales/quotations/new?from=lead&id=${lead.id}`}
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                          >
                            Quote
                          </Link>
                          <Link
                            href="/sales/leads/new"
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                          >
                            Edit
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                      No leads match your filters. Try clearing search or add a
                      new lead.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Follow-up Modal */}
      {followUpLeadId && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Log Follow-up —{" "}
                {leads.find((l) => l.id === followUpLeadId)?.clientName}
              </h3>
              <button
                type="button"
                onClick={() => setFollowUpLeadId(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Follow-up Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {followUpTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFuType(type)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        fuType === type
                          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {followUpTypeIcon[type]} {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Notes / Outcome <span className="text-error-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={fuNote}
                  onChange={(e) => setFuNote(e.target.value)}
                  placeholder="What was discussed? Client response? Next steps..."
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={fuNextDate}
                  onChange={(e) => setFuNextDate(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFollowUpLeadId(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveFollowUp}
                disabled={!fuNote.trim()}
              >
                Save Follow-up
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up History Drawer */}
      {historyLead && (
        <div className="fixed inset-0 z-[99999] flex justify-end bg-black/40">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Follow-up History
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {historyLead.clientName} · {historyLead.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryLeadId(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <div>
                <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                  Phone
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {historyLead.phone}
                </span>
              </div>
              <div>
                <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                  Status
                </span>
                <Badge size="sm" color={statusColor[historyLead.status]}>
                  {historyLead.status}
                </Badge>
              </div>
              <div>
                <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                  Assigned To
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {historyLead.assignedTo}
                </span>
              </div>
              <div>
                <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                  Project
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {historyLead.projectName}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setHistoryLeadId(null);
                openFollowUpModal(historyLead.id);
              }}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 py-2.5 text-sm font-medium text-brand-500 transition hover:bg-brand-50 dark:border-brand-500/40 dark:hover:bg-brand-500/10"
            >
              + Add Follow-up
            </button>

            {historyLead.followUps.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                No follow-ups logged yet.
              </p>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute bottom-2 left-4 top-2 w-px bg-gray-200 dark:bg-gray-700" />
                {[...historyLead.followUps].reverse().map((fu) => (
                  <div key={fu.id} className="relative flex gap-4 pb-6">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-base dark:border-gray-900 dark:bg-gray-800">
                      {followUpTypeIcon[fu.type]}
                    </div>
                    <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Badge size="sm" color="light">
                          {fu.type}
                        </Badge>
                        <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                          {fu.date}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {fu.note}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-theme-xs text-gray-400 dark:text-gray-500">
                        <span>By: {fu.by}</span>
                        {fu.nextDate !== "-" && (
                          <span>Next: {fu.nextDate}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
