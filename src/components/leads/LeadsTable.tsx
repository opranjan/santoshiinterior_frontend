"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  leadsApi,
  messagingApi,
  storesApi,
  telephonyApi,
  type LeadDto,
  type LeadAssigneeUserDto,
} from "@/services/crmApi";
import { ApiError } from "@/lib/api";
import { enumToLabel, formatDate, labelToEnum } from "@/lib/mappers";
import { getLeadProjectName } from "@/lib/leadProjectLabel";
import LeadsEmptyState from "@/components/leads/LeadsEmptyState";
import LeadExplorerModal from "@/components/leads/LeadExplorerModal";
import BulkLeadActionsModal, {
  type AssigneeOption,
  type BulkLeadAction,
} from "@/components/leads/BulkLeadActionsModal";
import ConvertLeadToProjectModal from "@/components/leads/ConvertLeadToProjectModal";
import LeadColumnFilterMenu from "@/components/leads/LeadColumnFilterMenu";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";
import DatePickerField from "@/components/form/DatePickerField";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";

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
  salesOwnerId: string | null;
  assignedTo: string;
  assignedToId: string | null;
  description: string;
  latestRemark: string;
  tentativeStart: string;
  financialYear: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
  followUps: FollowUpEntry[];
  quotationCount: number;
  latestQuotationId: string | null;
  convertedProjectId: string | null;
  convertedProjectName: string | null;
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

const followUpTypes: FollowUpType[] = ["Call", "WhatsApp", "Site Visit"];

type WaTemplateId = "start_chat" | "start_chat_ut" | "followup" | "interior_lead_followup";

const WA_FOLLOWUP_TEMPLATES: Array<{
  id: WaTemplateId;
  label: string;
  params: 0 | 1 | 2;
  body: string | null;
}> = [
  {
    id: "start_chat_ut",
    label: "start_chat_ut — Utility follow-up",
    params: 1,
    body: `Hi {{1}}\n\nThank you for contacting Santoshi Interiors.\n\nWe’re following up regarding your previous enquiry. If you still need assistance, simply reply to this message and our team will be happy to help.\n\nRegards,\nSantoshi Interiors`,
  },
  {
    id: "followup",
    label: "followup — Enquiry follow-up",
    params: 1,
    body: `Hi {{1}}, just following up on your enquiry with Santoshi Interiors.\nAre you still looking for interior design services? We’d be happy to assist you.`,
  },
  {
    id: "start_chat",
    label: "start_chat — Hi",
    params: 0,
    body: null,
  },
  {
    id: "interior_lead_followup",
    label: "interior_lead_followup — Lead follow-up",
    params: 2,
    body: `Hi {{1}},\n\nThank you for your interest in Santoshi Interior.\n\nWe received your requirement for {{2}} and would be happy to help you with your interior design needs.\n\nOur team is available to discuss your requirement and the next steps.\n\nRegards,\nSantoshi Interior`,
  },
];

function digitsOnly(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function maskPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "—";
  if (digits.length <= 3) return `***${digits}`;
  return `***${digits.slice(-3)}`;
}

function firstName(name: string) {
  const raw = String(name || "there").trim();
  return raw.split(/\s+/)[0] || "there";
}

function fillPlaceholders(body: string, values: string[]) {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => values[Number(n) - 1] || "");
}

const avatarColors = [
  "bg-[#1c1610] text-[#e8d5b5]",
  "bg-[#9a7748] text-white",
  "bg-[#c4a574] text-[#1c1610]",
  "bg-[#efe4d2] text-[#1c1610] dark:bg-[#c4a574]/20 dark:text-[#e8d5b5]",
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

const dateRangeOptions = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

type DateRangeKey = (typeof dateRangeOptions)[number]["value"];

type LeadFilters = {
  status: "All Status" | LeadStatus;
  owner: string;
  project: string;
  source: string;
  dateRange: DateRangeKey;
  other: string;
  sortBy: string;
};

const defaultLeadFilters = (): LeadFilters => ({
  status: "All Status",
  owner: "all",
  project: "all",
  source: "all",
  dateRange: "all",
  other: "none",
  sortBy: "updated-desc",
});

const selectClass =
  "h-10 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] shadow-sm focus:border-[#c4a574] focus:outline-hidden focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6]";

function daysAgoIso(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

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

function emailDomain(email?: string | null) {
  const raw = String(email || "").trim().toLowerCase();
  const at = raw.lastIndexOf("@");
  if (at < 0) return "";
  return raw.slice(at + 1);
}

function followUpBucket(lead: Lead): string {
  const next = lead.followUps[lead.followUps.length - 1]?.nextDate;
  if (!next || next === "-") return "none";
  if (isOverdue(next)) return "overdue";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(next);
  if (Number.isNaN(target.getTime())) return "none";
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "today";
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  if (target <= weekEnd) return "week";
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (target <= monthEnd) return "month";
  return "later";
}

const COLUMN_FILTER_KEYS = [
  "Client Name",
  "Phone",
  "Email",
  "Follow Up",
  "Project",
  "Lead Owner",
  "Sales Owner",
] as const;

type ColumnFilterKey = (typeof COLUMN_FILTER_KEYS)[number];

const emptyColumnFilters = (): Record<ColumnFilterKey, string[] | null> => ({
  "Client Name": null,
  Phone: null,
  Email: null,
  "Follow Up": null,
  Project: null,
  "Lead Owner": null,
  "Sales Owner": null,
});

function matchesColumnSelection(
  selected: string[] | null,
  value: string
): boolean {
  if (!selected || !selected.length) return true;
  return selected.includes(value);
}

const columns = [
  "Client Name",
  "Status",
  "Phone",
  "Email",
  "Follow Up",
  "Project",
  "Lead Owner",
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

type LeadColumn = (typeof columns)[number];

const CHECKBOX_COL_WIDTH = 48;
const COLUMN_MIN_WIDTH = 72;
const COLUMN_MAX_WIDTH = 480;
const LEADS_COL_WIDTHS_KEY = "crm.leads.columnWidths.v1";
const LEADS_VISIBLE_COLS_KEY = "crm.leads.visibleColumns.v1";

/** Columns that can be toggled / exported (Actions stays UI-only). */
const TOGGLEABLE_COLUMNS = columns.filter((col) => col !== "Actions");
const REQUIRED_VISIBLE_COLUMNS: LeadColumn[] = ["Client Name"];
const EXPORTABLE_COLUMNS = TOGGLEABLE_COLUMNS;

const DEFAULT_VISIBLE_COLUMNS: Record<LeadColumn, boolean> = {
  "Client Name": true,
  Status: true,
  Phone: true,
  Email: true,
  "Follow Up": true,
  Project: true,
  "Lead Owner": true,
  "Sales Owner": true,
  Budget: true,
  Scope: true,
  "Project Type": false,
  Source: true,
  Store: false,
  Description: false,
  "Latest Remark": false,
  "Tentative Start": false,
  FY: false,
  "Created Date": true,
  "Last Update": true,
  Actions: true,
};

function loadVisibleColumns(userId?: string | null): Record<LeadColumn, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_VISIBLE_COLUMNS };
  try {
    const key = userId
      ? `${LEADS_VISIBLE_COLS_KEY}.${userId}`
      : LEADS_VISIBLE_COLS_KEY;
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...DEFAULT_VISIBLE_COLUMNS };
    const parsed = JSON.parse(raw) as Partial<Record<LeadColumn, boolean>>;
    const next = { ...DEFAULT_VISIBLE_COLUMNS };
    for (const col of columns) {
      if (typeof parsed[col] === "boolean") next[col] = parsed[col]!;
    }
    for (const col of REQUIRED_VISIBLE_COLUMNS) next[col] = true;
    next.Actions = true;
    return next;
  } catch {
    return { ...DEFAULT_VISIBLE_COLUMNS };
  }
}

const DEFAULT_COLUMN_WIDTHS: Record<LeadColumn, number> = {
  "Client Name": 190,
  Status: 140,
  Phone: 120,
  Email: 190,
  "Follow Up": 150,
  Project: 160,
  "Lead Owner": 170,
  "Sales Owner": 130,
  Budget: 110,
  Scope: 120,
  "Project Type": 130,
  Source: 120,
  Store: 130,
  Description: 220,
  "Latest Remark": 220,
  "Tentative Start": 130,
  FY: 80,
  "Created Date": 150,
  "Last Update": 150,
  Actions: 300,
};

function loadStoredColumnWidths(): Record<LeadColumn, number> {
  if (typeof window === "undefined") return { ...DEFAULT_COLUMN_WIDTHS };
  try {
    const raw = window.localStorage.getItem(LEADS_COL_WIDTHS_KEY);
    if (!raw) return { ...DEFAULT_COLUMN_WIDTHS };
    const parsed = JSON.parse(raw) as Partial<Record<LeadColumn, number>>;
    const next = { ...DEFAULT_COLUMN_WIDTHS };
    for (const key of columns) {
      const value = Number(parsed[key]);
      if (Number.isFinite(value)) {
        next[key] = Math.min(COLUMN_MAX_WIDTH, Math.max(COLUMN_MIN_WIDTH, value));
      }
    }
    return next;
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS };
  }
}

const teamAssigneeOptions: AssigneeOption[] = [
  { id: "team-procurement", name: "Procurement", kind: "team" },
  { id: "team-supervisor", name: "Project/Supervisor team", kind: "team" },
  { id: "team-sales-south", name: "SALES TEAM SOUTH GOA", kind: "team" },
  { id: "team-design", name: "Designing TEAM", kind: "team" },
];

type LeadAssigneeGroups = {
  all: LeadAssigneeUserDto[];
  sales: LeadAssigneeUserDto[];
  designTeam: LeadAssigneeUserDto[];
};

const emptyAssigneeGroups = (): LeadAssigneeGroups => ({
  all: [],
  sales: [],
  designTeam: [],
});

const LEAD_DELETE_PERMISSIONS = ["leads.delete"];

function mapLeadDto(dto: LeadDto): Lead {
  return {
    id: dto.id,
    clientName: dto.clientName,
    phone: dto.phone,
    email: dto.email || "",
    store: dto.store?.name || "",
    projectName: getLeadProjectName(dto.projectName, dto.project?.name),
    projectType: dto.projectType || "",
    scope: dto.scope || "",
    budget: dto.budget || "",
    source: dto.source || "",
    status: (enumToLabel(dto.status) || "New") as LeadStatus,
    salesOwner: dto.salesOwner?.name || "Unassigned",
    salesOwnerId: dto.salesOwnerId || dto.salesOwner?.id || null,
    assignedTo: dto.assignedTo?.name || "Unassigned",
    assignedToId: dto.assignedToId || dto.assignedTo?.id || null,
    description: dto.description || "",
    latestRemark: dto.latestRemark || "",
    tentativeStart: formatDate(dto.tentativeStart),
    financialYear: dto.financialYear || "",
    tags: dto.tags || "",
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    quotationCount: dto._count?.quotations ?? dto.quotations?.length ?? 0,
    latestQuotationId: dto.quotations?.[0]?.id || null,
    convertedProjectId: dto.project?.id || null,
    convertedProjectName: dto.project?.name || null,
    followUps: (dto.followUps || []).map((f) => ({
      id: f.id,
      date: formatDate(f.date),
      type: (enumToLabel(f.type) || "Call") as FollowUpType,
      note: f.note || "",
      by: f.by?.name || "",
      nextDate: formatDate(f.nextDate),
      nextTime: f.nextTime || "",
    })),
  };
}

function leadQuoteHref(lead: Lead) {
  if (lead.quotationCount === 1 && lead.latestQuotationId) {
    return `/quotations/${lead.latestQuotationId}`;
  }
  return `/sales/leads/${lead.id}?module=quotations`;
}

export default function LeadsTable() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canDeleteLeads = hasAnyPermission(user, LEAD_DELETE_PERMISSIONS);
  const canCall = hasAnyPermission(user, [
    "calls.make",
    "sales.full",
    "sales.manage",
    "leads.manage",
  ]);
  const canSendWa = hasAnyPermission(user, [
    "leads.manage",
    "sales.full",
    "sales.manage",
    "messages.send",
  ]);
  const searchParams = useSearchParams();
  const storeFilterId = searchParams.get("storeId") || "";
  const [storeFilterName, setStoreFilterName] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([]);
  const [assigneeGroups, setAssigneeGroups] = useState<LeadAssigneeGroups>(emptyAssigneeGroups);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<LeadColumn, boolean>>(
    () => loadVisibleColumns(user?.id)
  );
  const [columnWidths, setColumnWidths] = useState<Record<LeadColumn, number>>(
    () => ({ ...DEFAULT_COLUMN_WIDTHS })
  );
  const resizingRef = useRef<{
    key: LeadColumn;
    startX: number;
    startW: number;
  } | null>(null);

  useEffect(() => {
    setColumnWidths(loadStoredColumnWidths());
  }, []);

  useEffect(() => {
    setVisibleColumns(loadVisibleColumns(user?.id));
  }, [user?.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LEADS_COL_WIDTHS_KEY, JSON.stringify(columnWidths));
    } catch {
      /* ignore quota / private mode */
    }
  }, [columnWidths]);

  useEffect(() => {
    try {
      const key = user?.id
        ? `${LEADS_VISIBLE_COLS_KEY}.${user.id}`
        : LEADS_VISIBLE_COLS_KEY;
      window.localStorage.setItem(key, JSON.stringify(visibleColumns));
    } catch {
      /* ignore */
    }
  }, [visibleColumns, user?.id]);

  useEffect(() => {
    if (!columnsOpen) return;
    const onDown = (event: MouseEvent) => {
      if (columnsMenuRef.current?.contains(event.target as Node)) return;
      setColumnsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [columnsOpen]);

  const isColVisible = useCallback(
    (col: LeadColumn) => Boolean(visibleColumns[col]),
    [visibleColumns]
  );

  const visibleTableColumns = useMemo(
    () => columns.filter((col) => isColVisible(col)),
    [isColVisible]
  );

  const toggleColumnVisibility = (col: LeadColumn, checked: boolean) => {
    if (REQUIRED_VISIBLE_COLUMNS.includes(col) && !checked) return;
    if (col === "Actions" && !checked) return;
    setVisibleColumns((prev) => ({ ...prev, [col]: checked }));
  };

  const displayPhone = useCallback(
    (phone?: string | null) => {
      if (isSuperAdmin) return String(phone || "").trim() || "—";
      return maskPhone(phone);
    },
    [isSuperAdmin]
  );

  const exportLeadsExcel = async () => {
    try {
      setExporting(true);
      const XLSX = await import("xlsx");
      const exportCols = EXPORTABLE_COLUMNS.filter((col) => isColVisible(col));
      if (!exportCols.length) {
        toastError("Turn on at least one column before exporting");
        return;
      }

      const rows = filteredLeads.map((lead) => {
        const nextFu = lead.followUps[lead.followUps.length - 1];
        const followUpLabel = nextFu
          ? `${nextFu.type}${nextFu.nextDate ? ` · ${formatShortFollowUp(nextFu.nextDate, nextFu.nextTime)}` : ""}`
          : "";
        const values: Record<string, string | number> = {
          "Client Name": lead.clientName || "",
          Status: lead.status || "",
          Phone: displayPhone(lead.phone),
          Email: lead.email || "",
          "Follow Up": followUpLabel,
          Project: lead.convertedProjectName || lead.projectName || "",
          "Lead Owner": lead.assignedTo || "",
          "Sales Owner": lead.salesOwner || "",
          Budget: lead.budget || "",
          Scope: lead.scope || "",
          "Project Type": lead.projectType || "",
          Source: lead.source || "",
          Store: lead.store || "",
          Description: lead.description || "",
          "Latest Remark": lead.latestRemark || "",
          "Tentative Start": lead.tentativeStart || "",
          FY: lead.financialYear || "",
          "Created Date": formatDateTime(lead.createdAt),
          "Last Update": formatDateTime(lead.updatedAt),
        };
        const row: Record<string, string | number> = {};
        for (const col of exportCols) row[col] = values[col] ?? "";
        return row;
      });

      const sheet = XLSX.utils.json_to_sheet(rows, { header: exportCols as unknown as string[] });
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Leads");
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(book, `leads-export-${stamp}.xlsx`);
      toastSuccess(`Exported ${rows.length} lead(s) · ${exportCols.length} column(s)`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Excel export failed");
    } finally {
      setExporting(false);
    }
  };

  const onColumnResizeMove = useCallback((e: MouseEvent) => {
    const active = resizingRef.current;
    if (!active) return;
    const next = Math.min(
      COLUMN_MAX_WIDTH,
      Math.max(COLUMN_MIN_WIDTH, active.startW + (e.clientX - active.startX))
    );
    setColumnWidths((prev) =>
      prev[active.key] === next ? prev : { ...prev, [active.key]: next }
    );
  }, []);

  const onColumnResizeEnd = useCallback(() => {
    resizingRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onColumnResizeMove);
    window.removeEventListener("mouseup", onColumnResizeEnd);
  }, [onColumnResizeMove]);

  const startColumnResize = useCallback(
    (key: LeadColumn, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = {
        key,
        startX: e.clientX,
        startW: columnWidths[key],
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onColumnResizeMove);
      window.addEventListener("mouseup", onColumnResizeEnd);
    },
    [columnWidths, onColumnResizeMove, onColumnResizeEnd]
  );

  const resetColumnWidth = useCallback((key: LeadColumn) => {
    setColumnWidths((prev) => ({ ...prev, [key]: DEFAULT_COLUMN_WIDTHS[key] }));
  }, []);

  const colStyle = useCallback(
    (col: LeadColumn): React.CSSProperties => {
      const w = columnWidths[col];
      return { width: w, minWidth: w, maxWidth: w };
    },
    [columnWidths]
  );

  const tableMinWidth =
    CHECKBOX_COL_WIDTH +
    visibleTableColumns.reduce((sum, col) => sum + columnWidths[col], 0);

  const fetchLeads = async () => {
    const data = await leadsApi.list({
      limit: 100,
      ...(storeFilterId ? { storeId: storeFilterId } : {}),
    });
    setLeads(
      data.items.map(mapLeadDto).filter((lead) => !lead.convertedProjectId)
    );
  };

  useEffect(() => {
    if (!storeFilterId) {
      setStoreFilterName("");
      return;
    }
    (async () => {
      try {
        const store = await storesApi.get(storeFilterId);
        setStoreFilterName(store.name);
      } catch {
        setStoreFilterName("");
      }
    })();
  }, [storeFilterId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAssigneesLoading(true);
        const data = await leadsApi.listAssignees();
        if (cancelled) return;
        const groups: LeadAssigneeGroups = {
          all: data.all || [],
          sales: data.sales || [],
          designTeam: data.designTeam || [],
        };
        setAssigneeGroups(groups);
        const users = groups.all.map((u) => ({
          id: u.id,
          name: u.name,
          kind: "user" as const,
        }));
        setAssigneeOptions([...users, ...teamAssigneeOptions]);
      } catch {
        if (!cancelled) {
          setAssigneeGroups(emptyAssigneeGroups());
          setAssigneeOptions([...teamAssigneeOptions]);
        }
      } finally {
        if (!cancelled) setAssigneesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await fetchLeads();
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
  }, [storeFilterId]);
  const [search, setSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<LeadFilters>(defaultLeadFilters);
  const [appliedFilters, setAppliedFilters] = useState<LeadFilters>(defaultLeadFilters);
  const [filterTab, setFilterTab] = useState<"basic" | "advanced">("basic");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [columnFilters, setColumnFilters] =
    useState<Record<ColumnFilterKey, string[] | null>>(emptyColumnFilters);
  const [openColumnFilter, setOpenColumnFilter] = useState<ColumnFilterKey | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const patchDraft = <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) =>
    setDraftFilters((prev) => ({ ...prev, [key]: value }));

  const [followUpLeadId, setFollowUpLeadId] = useState<string | null>(null);
  const [fuType, setFuType] = useState<FollowUpType>("Call");
  const [fuNote, setFuNote] = useState("");
  const [fuNextDate, setFuNextDate] = useState("");
  const [fuBusy, setFuBusy] = useState(false);
  const [fuTemplate, setFuTemplate] = useState<WaTemplateId>("followup");
  const [fuTemplateName, setFuTemplateName] = useState("");
  const [fuTemplateNeed, setFuTemplateNeed] = useState("interior design");
  const [fuApprovedTemplates, setFuApprovedTemplates] = useState<string[]>([]);
  const [historyLeadId, setHistoryLeadId] = useState<string | null>(null);
  const [explorerLead, setExplorerLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const projectFilterOptions = useMemo(() => {
    const names = [
      ...new Set(
        leads
          .map((lead) => String(lead.projectName || lead.convertedProjectName || "").trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
    return names;
  }, [leads]);

  const sourceFilterOptions = useMemo(() => {
    const names = [
      ...new Set(leads.map((lead) => String(lead.source || "").trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
    return names;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const {
      status: statusFilter,
      owner: ownerFilter,
      project: projectFilter,
      source: sourceFilter,
      dateRange,
      other: otherFilter,
      sortBy,
    } = appliedFilters;

    const since =
      dateRange === "7d"
        ? daysAgoIso(7)
        : dateRange === "30d"
          ? daysAgoIso(30)
          : dateRange === "90d"
            ? daysAgoIso(90)
            : null;

    let list = leads.filter((lead) => {
      if (lead.convertedProjectId) return false;
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

      let matchesOwner = true;
      if (ownerFilter === "unassigned") {
        matchesOwner =
          !lead.assignedToId ||
          lead.assignedTo === "Unassigned" ||
          !String(lead.assignedTo || "").trim();
      } else if (ownerFilter !== "all") {
        matchesOwner = lead.assignedToId === ownerFilter;
      }

      let matchesProject = true;
      if (projectFilter === "has") {
        matchesProject = Boolean(
          String(lead.projectName || lead.convertedProjectName || "").trim()
        );
      } else if (projectFilter === "none") {
        matchesProject = !String(lead.projectName || lead.convertedProjectName || "").trim();
      } else if (projectFilter !== "all") {
        matchesProject =
          lead.projectName === projectFilter ||
          lead.convertedProjectName === projectFilter;
      }

      let matchesSource = true;
      if (sourceFilter !== "all") {
        matchesSource = String(lead.source || "").trim() === sourceFilter;
      }

      const matchesDate = !since || lead.createdAt >= since;

      let matchesOther = true;
      if (otherFilter === "overdue") {
        const next = lead.followUps[lead.followUps.length - 1]?.nextDate;
        matchesOther = !!next && isOverdue(next);
      } else if (otherFilter === "no-email") {
        matchesOther = !lead.email;
      } else if (otherFilter === "has-budget") {
        matchesOther = !!lead.budget;
      }

      const matchesColClient = matchesColumnSelection(
        columnFilters["Client Name"],
        lead.clientName || "—"
      );
      const matchesColPhone = matchesColumnSelection(
        columnFilters.Phone,
        lead.phone || "—"
      );
      const matchesColEmail = matchesColumnSelection(
        columnFilters.Email,
        emailDomain(lead.email) || "—"
      );
      const matchesColFollowUp = matchesColumnSelection(
        columnFilters["Follow Up"],
        followUpBucket(lead)
      );
      const matchesColProject = matchesColumnSelection(
        columnFilters.Project,
        String(lead.projectName || lead.convertedProjectName || "").trim() || "No project"
      );
      const matchesColLeadOwner = matchesColumnSelection(
        columnFilters["Lead Owner"],
        lead.assignedTo || "Unassigned"
      );
      const matchesColSalesOwner = matchesColumnSelection(
        columnFilters["Sales Owner"],
        lead.salesOwner || "Unassigned"
      );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesOwner &&
        matchesProject &&
        matchesSource &&
        matchesDate &&
        matchesOther &&
        matchesColClient &&
        matchesColPhone &&
        matchesColEmail &&
        matchesColFollowUp &&
        matchesColProject &&
        matchesColLeadOwner &&
        matchesColSalesOwner
      );
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
  }, [leads, search, appliedFilters, columnFilters]);

  const pageCount = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const pagedLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize);
  const showingFrom = filteredLeads.length ? (page - 1) * pageSize + 1 : 0;
  const showingTo = Math.min(page * pageSize, filteredLeads.length);
  const pageButtons = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const set = new Set([1, pageCount, page, page - 1, page + 1, page - 2, page + 2]);
    return [...set].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [search, appliedFilters, columnFilters, storeFilterId]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const leadsValueLabel = "₹ 0";

  const filtersDirty =
    JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);

  const hasColumnFilters = COLUMN_FILTER_KEYS.some(
    (key) => Array.isArray(columnFilters[key]) && columnFilters[key]!.length > 0
  );

  const hasActiveFilters =
    !!search.trim() ||
    appliedFilters.status !== "All Status" ||
    appliedFilters.owner !== "all" ||
    appliedFilters.project !== "all" ||
    appliedFilters.source !== "all" ||
    appliedFilters.dateRange !== "all" ||
    appliedFilters.other !== "none" ||
    hasColumnFilters;

  const allVisibleSelected =
    pagedLeads.length > 0 &&
    pagedLeads.every((l) => selected.includes(l.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) =>
        prev.filter((id) => !pagedLeads.some((l) => l.id === id))
      );
    } else {
      setSelected((prev) => [
        ...new Set([...prev, ...pagedLeads.map((l) => l.id)]),
      ]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async (leadId: string, assignedToId: string | null) => {
    const option = assigneeOptions.find((o) => o.id === assignedToId);
    const assigneeName = assignedToId
      ? option?.name || "Unassigned"
      : "Unassigned";

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              assignedTo: assigneeName,
              assignedToId,
            }
          : lead
      )
    );

    if (assignedToId && !option?.id) return;

    try {
      await leadsApi.update(leadId, { assignedToId });
    } catch {
      await fetchLeads();
    }
  };

  const handleBulkApply = async (payload: {
    action: BulkLeadAction;
    assigneeIds?: string[];
    status?: string;
    source?: string;
    projectType?: string;
  }) => {
    if (payload.action === "DELETE" && !canDeleteLeads) {
      throw new Error("You do not have permission to delete leads");
    }

    const userIds =
      payload.assigneeIds?.filter(
        (id) => !id.startsWith("team-") && assigneeOptions.some((o) => o.id === id)
      ) || [];

    if (
      (payload.action === "MOVE_TO" || payload.action === "ADD_ASSIGNEE") &&
      !userIds.length
    ) {
      throw new Error("Select at least one user to assign");
    }

    setBulkBusy(true);
    try {
      await leadsApi.bulkUpdate({
        leadIds: selected,
        action: payload.action,
        assigneeIds: userIds.length ? userIds : payload.assigneeIds,
        status: payload.status ? labelToEnum(payload.status) : undefined,
        source: payload.source,
        projectType: payload.projectType,
      });
      setSelected([]);
      await fetchLeads();
    } catch (err) {
      throw new Error(
        err instanceof ApiError ? err.message : "Bulk action failed"
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmDeleteLead = async () => {
    if (!deleteTarget || deleteBusy) return;
    try {
      setDeleteBusy(true);
      setError("");
      await leadsApi.remove(deleteTarget.id);
      setLeads((prev) => prev.filter((lead) => lead.id !== deleteTarget.id));
      setSelected((prev) => prev.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lead");
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (!selected.length || deleteBusy || !canDeleteLeads) return;
    try {
      setDeleteBusy(true);
      setError("");
      const ids = [...selected];
      await leadsApi.bulkDelete(ids);
      setLeads((prev) => prev.filter((lead) => !ids.includes(lead.id)));
      setSelected([]);
      setBulkDeleteOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete selected leads"
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleStatusChange = async (leadId: string, status: LeadStatus) => {
    const prev = leads;
    setLeads((current) =>
      current.map((lead) =>
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

    setStatusSavingId(leadId);
    try {
      await leadsApi.update(leadId, { status: labelToEnum(status) });
    } catch {
      setLeads(prev);
      setError("Failed to save status. Please try again.");
    } finally {
      setStatusSavingId(null);
    }
  };

  const openConvertModal = (lead: Lead) => {
    setConvertTarget(lead);
  };

  const handleConvertSuccess = (_result: {
    project: { id: string; name: string };
  }) => {
    if (!convertTarget) return;
    setLeads((prev) => prev.filter((lead) => lead.id !== convertTarget.id));
    setSelected((prev) => prev.filter((id) => id !== convertTarget.id));
    setConvertTarget(null);
  };

  const openFollowUpModal = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    setFollowUpLeadId(leadId);
    setFuType("Call");
    setFuNote("");
    setFuNextDate("");
    setFuBusy(false);
    setFuTemplate("followup");
    setFuTemplateName(firstName(lead?.clientName || ""));
    setFuTemplateNeed(lead?.scope || lead?.projectType || "interior design");
    void (async () => {
      try {
        const status = await messagingApi.getStatus();
        const approved = (status.approvedTemplates || []).map((row) => row.name);
        setFuApprovedTemplates(approved);
        const preferred =
          WA_FOLLOWUP_TEMPLATES.find((row) => approved.includes(row.id))?.id ||
          "followup";
        setFuTemplate(preferred);
      } catch {
        setFuApprovedTemplates([]);
      }
    })();
  };

  const placeLeadExotelCall = async (lead: Lead) => {
    const to = digitsOnly(lead.phone);
    if (!to || to.length < 10) {
      throw new Error("Lead has no valid phone number");
    }
    const agentNumber = digitsOnly(user?.phone);
    if (!agentNumber || agentNumber.length < 10) {
      throw new Error("Add your phone number in profile to place Exotel calls");
    }
    const result = await telephonyApi.clickToCall({
      to,
      leadId: lead.id,
      extension: user?.sipExtension || undefined,
      agentNumber,
      note: `Lead follow-up · ${lead.clientName}`,
    });
    if (result.originate.mode === "manual") {
      throw new Error(
        result.originate.message ||
          "Click-to-call is not configured. Set Exotel keys and restart the API."
      );
    }
  };

  const sendLeadWhatsAppTemplate = async (lead: Lead) => {
    const spec = WA_FOLLOWUP_TEMPLATES.find((row) => row.id === fuTemplate);
    const nameValue = fuTemplateName.trim() || firstName(lead.clientName);
    const needValue = fuTemplateNeed.trim() || lead.scope || "interior design";
    const bodyValues =
      spec?.params === 2
        ? [nameValue, needValue]
        : spec?.params === 1
          ? [nameValue]
          : [];
    await leadsApi.sendMessage(lead.id, {
      templateName: fuTemplate,
      languageCode: "en",
      useTemplate: true,
      bodyValues,
    });
  };

  const saveFollowUp = async () => {
    if (!followUpLeadId || fuBusy) return;
    const lead = leads.find((l) => l.id === followUpLeadId);
    if (!lead) return;

    if (fuType === "Site Visit" && !fuNote.trim()) {
      toastWarning("Add notes for the site visit follow-up");
      return;
    }
    if (fuType === "Call" && !canCall) {
      toastWarning("You do not have permission to place calls");
      return;
    }
    if (fuType === "WhatsApp" && !canSendWa) {
      toastWarning("You do not have permission to send WhatsApp messages");
      return;
    }

    setFuBusy(true);
    try {
      let note = fuNote.trim();
      if (fuType === "Call") {
        await placeLeadExotelCall(lead);
        if (!note) note = `Exotel call placed to ${maskPhone(lead.phone)}`;
        toastSuccess(`Calling ${lead.clientName}…`);
      } else if (fuType === "WhatsApp") {
        await sendLeadWhatsAppTemplate(lead);
        if (!note) note = `WhatsApp template “${fuTemplate}” sent`;
        toastSuccess("WhatsApp template sent");
      }

      const created = await leadsApi.addFollowUp(followUpLeadId, {
        type: labelToEnum(fuType),
        note,
        nextDate: fuNextDate || null,
      });
      const entry: FollowUpEntry = {
        id: (created as { id?: string })?.id || `FU-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: fuType,
        note,
        by: lead.assignedTo || "—",
        nextDate: fuNextDate || "-",
      };
      setLeads((prev) =>
        prev.map((l) =>
          l.id === followUpLeadId
            ? {
                ...l,
                followUps: [...l.followUps, entry],
                updatedAt: new Date().toISOString(),
                latestRemark: note,
              }
            : l
        )
      );
      setFollowUpLeadId(null);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Follow-up failed");
    } finally {
      setFuBusy(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    const next = defaultLeadFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
    setColumnFilters(emptyColumnFilters());
    setOpenColumnFilter(null);
    setMoreFiltersOpen(false);
  };

  const setColumnFilterValue = (key: ColumnFilterKey, next: string[] | null) => {
    setColumnFilters((prev) => ({ ...prev, [key]: next }));
  };

  const columnFilterOptions = useMemo(() => {
    const uniqueSorted = (values: string[]) =>
      [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      );

    const followUpLabels: Record<string, string> = {
      today: "Today",
      week: "This Week",
      month: "This Month",
      later: "Later",
      overdue: "Overdue",
      none: "No follow-up",
    };

    return {
      "Client Name": uniqueSorted(leads.map((l) => l.clientName || "—")).map((value) => ({
        value,
        label: value,
      })),
      Phone: uniqueSorted(leads.map((l) => l.phone || "—")).map((value) => ({
        value,
        label: value === "—" ? "—" : maskPhone(value),
      })),
      Email: uniqueSorted(
        leads.map((l) => emailDomain(l.email) || "—")
      ).map((value) => ({ value, label: value })),
      "Follow Up": (
        ["today", "week", "month", "later", "overdue", "none"] as const
      ).map((value) => ({ value, label: followUpLabels[value] })),
      Project: uniqueSorted(
        leads.map(
          (l) =>
            String(l.projectName || l.convertedProjectName || "").trim() || "No project"
        )
      ).map((value) => ({ value, label: value })),
      "Lead Owner": uniqueSorted(
        leads.map((l) => l.assignedTo || "Unassigned")
      ).map((value) => ({ value, label: value })),
      "Sales Owner": uniqueSorted(
        leads.map((l) => l.salesOwner || "Unassigned")
      ).map((value) => ({ value, label: value })),
    } satisfies Record<ColumnFilterKey, Array<{ value: string; label: string }>>;
  }, [leads]);

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const leadOwnerFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ id: string; name: string }> = [];
    const push = (id: string, name: string) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      rows.push({ id, name });
    };
    for (const member of assigneeGroups.sales) push(member.id, member.name);
    for (const member of assigneeGroups.designTeam) push(member.id, member.name);
    for (const member of assigneeGroups.all) push(member.id, member.name);
    for (const member of assigneeOptions) {
      if (String(member.id).startsWith("team-")) continue;
      push(member.id, member.name);
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [assigneeGroups, assigneeOptions]);

  const ownerLabel = (ownerId: string) => {
    if (ownerId === "all") return "All owners";
    if (ownerId === "unassigned") return "Unassigned";
    return leadOwnerFilterOptions.find((row) => row.id === ownerId)?.name || ownerId;
  };

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof LeadFilters | "search"; label: string }> = [];
    if (search.trim()) chips.push({ key: "search", label: `Search: ${search.trim()}` });
    if (appliedFilters.status !== "All Status") {
      chips.push({ key: "status", label: `Status: ${appliedFilters.status}` });
    }
    if (appliedFilters.owner !== "all") {
      chips.push({ key: "owner", label: `Owner: ${ownerLabel(appliedFilters.owner)}` });
    }
    if (appliedFilters.project !== "all") {
      const projectLabel =
        appliedFilters.project === "has"
          ? "Has project"
          : appliedFilters.project === "none"
            ? "No project"
            : appliedFilters.project;
      chips.push({ key: "project", label: `Project: ${projectLabel}` });
    }
    if (appliedFilters.source !== "all") {
      chips.push({ key: "source", label: `Source: ${appliedFilters.source}` });
    }
    if (appliedFilters.dateRange !== "all") {
      const range =
        dateRangeOptions.find((row) => row.value === appliedFilters.dateRange)?.label ||
        appliedFilters.dateRange;
      chips.push({ key: "dateRange", label: `Date: ${range}` });
    }
    if (appliedFilters.other !== "none") {
      const otherLabel =
        appliedFilters.other === "overdue"
          ? "Overdue follow-ups"
          : appliedFilters.other === "no-email"
            ? "Missing email"
            : appliedFilters.other === "has-budget"
              ? "Has budget"
              : appliedFilters.other;
      chips.push({ key: "other", label: otherLabel });
    }
    return chips;
  }, [appliedFilters, search, leadOwnerFilterOptions]);

  const clearChip = (key: keyof LeadFilters | "search") => {
    if (key === "search") {
      setSearch("");
      return;
    }
    const defaults = defaultLeadFilters();
    const next = { ...appliedFilters, [key]: defaults[key] };
    setAppliedFilters(next);
    setDraftFilters((prev) => ({ ...prev, [key]: defaults[key] }));
  };

  const historyLead = historyLeadId
    ? leads.find((l) => l.id === historyLeadId)
    : null;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      {storeFilterId && storeFilterName ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-4 py-3 text-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <span className="text-[#6f6254] dark:text-[#b5aa9c]">
            Showing leads for store:{" "}
            <strong className="text-[#1c1610] dark:text-[#f4efe6]">
              {storeFilterName}
            </strong>
          </span>
          <Link
            href="/sales/leads"
            className="font-medium text-[#9a7748] hover:underline"
          >
            View all leads
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
            Sales
          </p>
          <h1 className="font-serif text-3xl text-[#1c1610] dark:text-[#f4efe6]">Leads</h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            {loading
              ? "Loading pipeline…"
              : `${filteredLeads.length} lead${filteredLeads.length === 1 ? "" : "s"} · ${leadsValueLabel}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
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
              placeholder="Search client, phone or store"
              className="h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] pl-10 pr-9 text-sm text-[#1c1610] placeholder:text-[#b3a594] focus:border-[#c4a574] focus:outline-hidden focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7b68] hover:text-[#1c1610]"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="relative" ref={columnsMenuRef}>
            <button
              type="button"
              onClick={() => setColumnsOpen((v) => !v)}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${
                columnsOpen
                  ? "border-[#c4a574] bg-[#f6efe4] text-[#1c1610]"
                  : "border-[#eadfcf] bg-white text-[#5c5348] hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#d4c8b8]"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 5h6v14H4V5zm10 0h6v14h-6V5z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              Columns
            </button>
            {columnsOpen ? (
              <div className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-[#eadfcf] bg-white py-2 shadow-xl dark:border-[#3a342c] dark:bg-[#1a1714]">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                  Show / hide fields
                </p>
                <div className="max-h-72 overflow-y-auto">
                  {TOGGLEABLE_COLUMNS.map((col) => {
                    const locked = REQUIRED_VISIBLE_COLUMNS.includes(col);
                    return (
                      <label
                        key={col}
                        className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f4efe6] dark:hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(visibleColumns[col])}
                          disabled={locked}
                          onChange={(e) => toggleColumnVisibility(col, e.target.checked)}
                          className="h-4 w-4 rounded border-[#eadfcf] accent-[#c4a574]"
                        />
                        <span className="min-w-0 flex-1">{col}</span>
                        {locked ? (
                          <span className="text-[10px] uppercase tracking-wide text-[#8a7b68]">
                            Required
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
                <p className="border-t border-[#eadfcf] px-3 pt-2 text-[11px] text-[#8a7b68] dark:border-[#3a342c]">
                  Hidden columns stay hidden in Excel for every role.
                </p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={exporting || loading || !filteredLeads.length}
            onClick={() => void exportLeadsExcel()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#5c5348] hover:bg-[#fbf8f3] disabled:opacity-50 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#d4c8b8]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {exporting ? "Exporting…" : "Export Excel"}
          </button>
          <Link
            href="/sales/leads/new"
            className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] hover:bg-black"
          >
            + New lead
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eadfcf] px-3 py-2.5 dark:border-[#3a342c]">
          <div className="inline-flex rounded-xl bg-[#f4efe6] p-1 dark:bg-[#1c1914]">
            <button
              type="button"
              onClick={() => setFilterTab("basic")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterTab === "basic"
                  ? "bg-[#c4a574] text-[#1c1610] shadow-sm"
                  : "text-[#8a7b68] hover:text-[#1c1610]"
              }`}
            >
              Basic Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterTab("advanced");
                setMoreFiltersOpen(true);
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterTab === "advanced"
                  ? "bg-[#c4a574] text-[#1c1610] shadow-sm"
                  : "text-[#8a7b68] hover:text-[#1c1610]"
              }`}
            >
              Advanced Filters
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <span className="ml-auto text-[11px] text-[#8a7b68]">
            Showing {filteredLeads.length} of {leads.filter((l) => !l.convertedProjectId).length} leads
          </span>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          {filterTab === "basic" ? (
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Lead Status
                  </label>
                  <select
                    value={draftFilters.status}
                    onChange={(e) =>
                      patchDraft("status", e.target.value as LeadFilters["status"])
                    }
                    className={selectClass}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                        {s !== "All Status"
                          ? ` (${leads.filter((l) => l.status === s).length})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Lead Owner
                  </label>
                  <select
                    value={draftFilters.owner}
                    onChange={(e) => patchDraft("owner", e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All owners</option>
                    <option value="unassigned">Unassigned</option>
                    {leadOwnerFilterOptions.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Project
                  </label>
                  <select
                    value={draftFilters.project}
                    onChange={(e) => patchDraft("project", e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All projects</option>
                    <option value="has">Has project</option>
                    <option value="none">No project</option>
                    {projectFilterOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Lead Source
                  </label>
                  <select
                    value={draftFilters.source}
                    onChange={(e) => patchDraft("source", e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All sources</option>
                    {sourceFilterOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Date Range
                  </label>
                  <select
                    value={draftFilters.dateRange}
                    onChange={(e) =>
                      patchDraft("dateRange", e.target.value as DateRangeKey)
                    }
                    className={selectClass}
                  >
                    {dateRangeOptions.map((row) => (
                      <option key={row.value} value={row.value}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:w-40 xl:flex-col">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-[#1c1610] hover:bg-[#b8924e]"
                >
                  {filtersDirty ? "Apply Filters" : "Applied"}
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-medium text-[#5c5348] hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#d4c8b8]"
                >
                  Clear All
                </button>
              </div>
            </div>
          ) : null}

          {filterTab === "advanced" || moreFiltersOpen ? (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#1c1914] sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                  More filters
                </label>
                <select
                  value={draftFilters.other}
                  onChange={(e) => patchDraft("other", e.target.value)}
                  className={selectClass}
                >
                  <option value="none">None</option>
                  <option value="overdue">Overdue Follow-ups</option>
                  <option value="no-email">Missing Email</option>
                  <option value="has-budget">Has Budget</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                  Sort by
                </label>
                <select
                  value={draftFilters.sortBy}
                  onChange={(e) => patchDraft("sortBy", e.target.value)}
                  className={selectClass}
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {filterTab === "advanced" ? (
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-[#1c1610]"
                  >
                    Apply Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("basic")}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#5c5348] dark:border-[#3a342c] dark:bg-[#161411]"
                  >
                    Back
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMoreFiltersOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a7b68] hover:text-[#1c1610]"
            >
              More Filters
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {activeFilterChips.length ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-[#eadfcf] pt-3 dark:border-[#3a342c]">
              {activeFilterChips.map((chip) => (
                <button
                  key={`${chip.key}-${chip.label}`}
                  type="button"
                  onClick={() => clearChip(chip.key)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#eadfcf] bg-[#fbf8f3] px-2.5 py-1 text-[11px] font-medium text-[#5c5348] hover:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#d4c8b8]"
                >
                  {chip.label}
                  <span className="text-[#8a7b68]">×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-semibold text-[#c4a574] hover:text-[#1c1610]"
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#c4a574] bg-[#f6efe4] px-4 py-3 dark:border-[#c4a574]/40 dark:bg-[#c4a574]/10">
          <span className="text-sm font-medium text-[#1c1610] dark:text-[#f4efe6]">
            Selected {selected.length}
          </span>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex h-9 items-center rounded-xl bg-[#1c1610] px-4 text-sm font-medium text-[#e8d5b5]"
          >
            Action
          </button>
          {canDeleteLeads ? (
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={deleteBusy}
              className="inline-flex h-9 items-center rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-medium text-rose-600 disabled:opacity-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
            >
              Delete selected
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-sm text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f4efe6]"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      {/* Table / empty state */}
      {!loading && filteredLeads.length === 0 ? (
        <LeadsEmptyState
          filtered={hasActiveFilters || leads.length > 0}
          onClearFilters={resetFilters}
        />
      ) : (
      <div className="vendor-form-card overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="max-h-[min(70vh,720px)] max-w-full overflow-auto overscroll-contain [scrollbar-gutter:stable]">
            <Table
              className="table-fixed border-separate border-spacing-0 [&_td]:border-r [&_td]:border-[#f0e8db] [&_th]:border-r [&_th]:border-[#eadfcf] dark:[&_td]:border-[#3a342c] dark:[&_th]:border-[#3a342c] [&_td:last-child]:border-r-0 [&_th:last-child]:border-r-0"
              style={{ width: tableMinWidth, minWidth: "100%" }}
            >
              <colgroup>
                <col style={{ width: CHECKBOX_COL_WIDTH }} />
                {visibleTableColumns.map((heading) => (
                  <col key={heading} style={{ width: columnWidths[heading] }} />
                ))}
              </colgroup>
              <TableHeader className="border-b border-[#f0e8db] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#1c1914]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="sticky left-0 top-0 z-30 border-b border-[#f0e8db] bg-[#fbf8f3] px-3 py-3.5 text-start dark:border-[#3a342c] dark:bg-[#1c1914]"
                    style={{ width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
                  >
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-[#eadfcf] accent-[#1c1610]"
                      aria-label="Select all"
                    />
                  </TableCell>
                  {visibleTableColumns.map((heading) => {
                    const isClient = heading === "Client Name";
                    const filterKey = COLUMN_FILTER_KEYS.includes(
                      heading as ColumnFilterKey
                    )
                      ? (heading as ColumnFilterKey)
                      : null;
                    const allLabels: Record<ColumnFilterKey, string> = {
                      "Client Name": "All Clients",
                      Phone: "All Numbers",
                      Email: "All Domains",
                      "Follow Up": "All Follow-ups",
                      Project: "All Projects",
                      "Lead Owner": "All Owners",
                      "Sales Owner": "All Sales Owners",
                    };
                    return (
                      <TableCell
                        key={heading}
                        isHeader
                        style={{
                          ...colStyle(heading),
                          ...(isClient ? { left: CHECKBOX_COL_WIDTH } : null),
                        }}
                        className={`relative sticky top-0 z-20 border-b border-[#f0e8db] bg-[#fbf8f3] px-3 py-3.5 text-start text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914] ${
                          isClient ? "z-30 shadow-[2px_0_6px_-2px_rgba(28,22,16,0.08)]" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-1 pr-2">
                          <span className="min-w-0 flex-1 truncate">
                            {heading}
                            {heading === "Latest Remark" ? " ✎" : ""}
                          </span>
                          {filterKey ? (
                            <LeadColumnFilterMenu
                              label={heading}
                              allLabel={allLabels[filterKey]}
                              options={columnFilterOptions[filterKey]}
                              selected={columnFilters[filterKey]}
                              onChange={(next) => setColumnFilterValue(filterKey, next)}
                              open={openColumnFilter === filterKey}
                              onOpenChange={(nextOpen) =>
                                setOpenColumnFilter(nextOpen ? filterKey : null)
                              }
                            />
                          ) : null}
                        </div>
                        <span
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize ${heading} column`}
                          title="Drag to resize · double-click to reset"
                          onMouseDown={(e) => startColumnResize(heading, e)}
                          onDoubleClick={() => resetColumnWidth(heading)}
                          className="absolute inset-y-0 -right-px z-10 w-2 cursor-col-resize touch-none after:absolute after:inset-y-2 after:right-[3px] after:w-px after:bg-[#d9cbb8] after:opacity-70 hover:after:bg-[#9a7748] hover:after:opacity-100 active:after:bg-[#9a7748] active:after:opacity-100 dark:after:bg-[#5a5044]"
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-[#f0e8db] dark:divide-[#3a342c]">
                {pagedLeads.map((lead) => {
                  const nextFu = lead.followUps[lead.followUps.length - 1];
                  const overdue = nextFu ? isOverdue(nextFu.nextDate) : false;
                  const isSelected = selected.includes(lead.id);
                  const stickyTone =
                    overdue || isSelected
                      ? "bg-[#f6efe4] dark:bg-[#c4a574]/10"
                      : "bg-white group-hover:bg-[#fbf8f3] dark:bg-[#161411] dark:group-hover:bg-white/[0.03]";

                  return (
                    <TableRow
                      key={lead.id}
                      className={`group ${
                        overdue || isSelected
                          ? "bg-[#f6efe4] dark:bg-[#c4a574]/10"
                          : "hover:bg-[#fbf8f3] dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <TableCell
                        className={`sticky left-0 z-10 px-3 py-3 ${stickyTone}`}
                        style={{ width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`Select ${lead.id}`}
                        />
                      </TableCell>

                      <TableCell
                        className={`sticky z-10 overflow-hidden px-3 py-3 text-start shadow-[2px_0_6px_-2px_rgba(28,22,16,0.08)] ${stickyTone}`}
                        style={{ ...colStyle("Client Name"), left: CHECKBOX_COL_WIDTH }}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarClass(lead.clientName)}`}
                            aria-hidden
                          >
                            {getInitials(lead.clientName)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExplorerLead(lead)}
                            className="truncate font-semibold text-[#1c1610] text-theme-sm hover:text-[#9a7748] dark:text-[#f4efe6]"
                            title={lead.clientName}
                          >
                            {lead.clientName}
                          </button>
                        </div>
                      </TableCell>

                      {isColVisible("Status") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-start"
                        style={colStyle("Status")}
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="inline-flex w-fit max-w-full items-center gap-1 rounded-full border border-[#eadfcf] bg-[#f6efe4] px-2 py-0.5 dark:border-[#c4a574]/30 dark:bg-[#c4a574]/15">
                            <select
                              value={lead.status}
                              disabled={statusSavingId === lead.id}
                              onChange={(e) =>
                                void handleStatusChange(
                                  lead.id,
                                  e.target.value as LeadStatus
                                )
                              }
                              className="max-w-full truncate bg-transparent text-xs font-semibold text-[#9a7748] focus:outline-hidden disabled:opacity-60 dark:text-[#e8d5b5]"
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
                            {statusSavingId === lead.id
                              ? "Saving…"
                              : relativeTime(lead.updatedAt)}
                          </span>
                        </div>
                      </TableCell>
                      ) : null}

                      {isColVisible("Phone") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-700 text-theme-sm dark:text-gray-300"
                        style={colStyle("Phone")}
                      >
                        <span className="block truncate">{displayPhone(lead.phone)}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Email") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                        style={colStyle("Email")}
                      >
                        <span className="block truncate" title={lead.email || undefined}>
                          {lead.email || "—"}
                        </span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Follow Up") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-start"
                        style={colStyle("Follow Up")}
                      >
                        {nextFu && nextFu.nextDate !== "-" ? (
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setHistoryLeadId(lead.id)}
                              className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[#f6efe4] px-2.5 py-1 text-xs font-medium text-[#9a7748] dark:bg-[#c4a574]/15 dark:text-[#e8d5b5]"
                            >
                              {lead.followUps.length}{" "}
                              {nextFu.type.toLowerCase()}
                            </button>
                            <p
                              className={`mt-1 truncate text-theme-xs ${
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
                            className="rounded-lg border border-dashed border-[#c4a574] px-2.5 py-1.5 text-xs font-medium text-[#9a7748] hover:bg-[#f6efe4] dark:hover:bg-[#c4a574]/10"
                          >
                            + Add follow-up
                          </button>
                        )}
                      </TableCell>
                      ) : null}

                      {isColVisible("Project") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-start"
                        style={colStyle("Project")}
                      >
                        {lead.convertedProjectId ? (
                          <div className="flex min-w-0 flex-col gap-1">
                            <Badge size="sm" color="success">
                              Converted
                            </Badge>
                            <Link
                              href="/projects"
                              className="truncate text-sm font-medium text-gray-800 hover:text-[#9a7748] dark:text-white/90"
                              title="Open in Projects"
                            >
                              {lead.convertedProjectName || lead.projectName}
                            </Link>
                          </div>
                        ) : (
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <Badge size="sm" color="light">
                              No project
                            </Badge>
                            <button
                              type="button"
                              onClick={() => openConvertModal(lead)}
                              className="text-left text-xs font-medium text-[#9a7748] hover:underline"
                            >
                              Assign project →
                            </button>
                          </div>
                        )}
                      </TableCell>
                      ) : null}

                      {isColVisible("Lead Owner") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-start"
                        style={colStyle("Lead Owner")}
                      >
                        <div className="flex min-w-0 items-center gap-2" title={lead.assignedTo}>
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarClass(lead.assignedTo)}`}
                          >
                            {getInitials(lead.assignedTo)}
                          </span>
                          <select
                            value={lead.assignedToId || ""}
                            onChange={(e) =>
                              void handleAssign(lead.id, e.target.value || null)
                            }
                            className="h-8 min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent text-xs text-gray-600 hover:border-gray-200 focus:border-brand-300 focus:outline-hidden dark:text-gray-300"
                          >
                            <option value="">Unassigned</option>
                            {lead.assignedToId &&
                            ![...assigneeGroups.sales, ...assigneeGroups.designTeam].some(
                              (u) => u.id === lead.assignedToId
                            ) ? (
                              <option value={lead.assignedToId}>
                                {lead.assignedTo}
                              </option>
                            ) : null}
                            <optgroup label="Sales">
                              {assigneeGroups.sales.length === 0 ? (
                                <option value="" disabled>
                                  No sales users
                                </option>
                              ) : (
                                assigneeGroups.sales.map((member) => (
                                  <option key={`sales-${member.id}`} value={member.id}>
                                    {member.name}
                                  </option>
                                ))
                              )}
                            </optgroup>
                            <optgroup label="Design team">
                              {assigneeGroups.designTeam.length === 0 ? (
                                <option value="" disabled>
                                  No design team users
                                </option>
                              ) : (
                                assigneeGroups.designTeam.map((member) => (
                                  <option key={`design-${member.id}`} value={member.id}>
                                    {member.name}
                                  </option>
                                ))
                              )}
                            </optgroup>
                          </select>
                        </div>
                      </TableCell>
                      ) : null}

                      {isColVisible("Sales Owner") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300"
                        style={colStyle("Sales Owner")}
                      >
                        <span className="block truncate">{lead.salesOwner || "—"}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Budget") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300"
                        style={colStyle("Budget")}
                      >
                        <span className="block truncate">{lead.budget || "—"}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Scope") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300"
                        style={colStyle("Scope")}
                      >
                        <span className="block truncate">{lead.scope || "—"}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Project Type") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300"
                        style={colStyle("Project Type")}
                      >
                        <span className="block truncate">{lead.projectType || "—"}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Source") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300"
                        style={colStyle("Source")}
                      >
                        <span className="block truncate">{lead.source || "—"}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Store") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300"
                        style={colStyle("Store")}
                      >
                        <span className="block truncate">{lead.store || "—"}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Description") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                        style={colStyle("Description")}
                      >
                        <span className="line-clamp-2" title={lead.description || undefined}>
                          {lead.description || "—"}
                        </span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Latest Remark") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                        style={colStyle("Latest Remark")}
                      >
                        <span className="line-clamp-2" title={lead.latestRemark || undefined}>
                          {lead.latestRemark || "—"}
                        </span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Tentative Start") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300"
                        style={colStyle("Tentative Start")}
                      >
                        <span className="block truncate">{lead.tentativeStart || "—"}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("FY") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-gray-600 text-theme-sm dark:text-gray-300"
                        style={colStyle("FY")}
                      >
                        <span className="block truncate">{lead.financialYear || "—"}</span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Created Date") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-start"
                        style={colStyle("Created Date")}
                      >
                        <span className="block truncate text-gray-700 text-theme-sm dark:text-gray-300">
                          {formatDateTime(lead.createdAt)}
                        </span>
                        <span className="block truncate text-theme-xs text-gray-400">
                          {relativeTime(lead.createdAt)}
                        </span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Last Update") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-start"
                        style={colStyle("Last Update")}
                      >
                        <span className="block truncate text-gray-700 text-theme-sm dark:text-gray-300">
                          {formatDateTime(lead.updatedAt)}
                        </span>
                        <span className="block truncate text-theme-xs text-gray-400">
                          {relativeTime(lead.updatedAt)}
                        </span>
                      </TableCell>
                      ) : null}

                      {isColVisible("Actions") ? (
                      <TableCell
                        className="overflow-hidden px-3 py-3 text-start"
                        style={colStyle("Actions")}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {/* <button
                            type="button"
                            onClick={() => openFollowUpModal(lead.id)}
                            className="text-sm font-medium text-[#9a7748] hover:underline"
                          >
                            Follow Up
                          </button> */}
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
                            href={leadQuoteHref(lead)}
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                          >
                            Quote
                          </Link>
                          <Link
                            href={`/sales/leads/${lead.id}?module=details`}
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                          >
                            Edit
                          </Link>
                          {lead.convertedProjectId ? (
                            <Link
                              href="/projects"
                              className="text-sm font-medium text-success-600 hover:text-success-700"
                              title={lead.convertedProjectName || "View project"}
                            >
                              View Project
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openConvertModal(lead)}
                              className="text-sm font-medium text-[#9a7748] hover:underline"
                            >
                              Assign Project
                            </button>
                          )}
                          {canDeleteLeads ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(lead)}
                              className="text-sm font-medium text-error-500 hover:text-error-600"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </div>
        {filteredLeads.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0e6d8] px-4 py-3 text-sm text-[#8a7b68]">
            <p>
              Showing {showingFrom} to {showingTo} of {filteredLeads.length} leads
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-md border border-[#eadfcf] disabled:opacity-40"
              >
                ‹
              </button>
              {pageButtons.map((n, index) => {
                const prev = pageButtons[index - 1];
                return (
                  <React.Fragment key={n}>
                    {prev && n - prev > 1 ? <span className="px-1">…</span> : null}
                    <button
                      type="button"
                      onClick={() => setPage(n)}
                      className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm ${
                        n === page
                          ? "bg-[#1c1610] text-[#e8d5b5]"
                          : "border border-[#eadfcf] text-[#3d342c]"
                      }`}
                    >
                      {n}
                    </button>
                  </React.Fragment>
                );
              })}
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="grid h-8 w-8 place-items-center rounded-md border border-[#eadfcf] disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </div>
      )}

      {/* Follow-up Modal */}
      {followUpLeadId && (() => {
        const fuLead = leads.find((l) => l.id === followUpLeadId);
        const selectedSpec = WA_FOLLOWUP_TEMPLATES.find((row) => row.id === fuTemplate);
        const previewValues =
          selectedSpec?.params === 2
            ? [
                fuTemplateName.trim() || firstName(fuLead?.clientName || ""),
                fuTemplateNeed.trim() || "interior design",
              ]
            : selectedSpec?.params === 1
              ? [fuTemplateName.trim() || firstName(fuLead?.clientName || "")]
              : [];
        const previewBody = selectedSpec?.body
          ? fillPlaceholders(selectedSpec.body, previewValues)
          : "Approved WhatsApp greeting template (no body variables).";
        const clientLabel = (fuLead?.clientName || "client").trim() || "client";
        const saveDisabled =
          fuBusy ||
          (fuType === "Site Visit" && !fuNote.trim()) ||
          (fuType === "Call" && (!canCall || digitsOnly(fuLead?.phone).length < 10)) ||
          (fuType === "WhatsApp" && !canSendWa);
        const saveLabel = fuBusy
          ? fuType === "Call"
            ? `Calling ${clientLabel}…`
            : fuType === "WhatsApp"
              ? `Messaging ${clientLabel}…`
              : "Saving…"
          : fuType === "Call"
            ? `Call ${clientLabel}`
            : fuType === "WhatsApp"
              ? `WhatsApp ${clientLabel}`
              : `Save site visit`;

        const fuFieldClass =
          "w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
        const fuLabelClass =
          "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]";

        return (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="flex max-h-[min(92vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="relative shrink-0 overflow-hidden border-b border-[#eadfcf] bg-gradient-to-br from-[#1c1610] to-[#3a2f24] px-5 py-4 text-[#e8d5b5] dark:border-[#3a342c]">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#c4a574]/20" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
                    Follow-up
                  </p>
                  <h3 className="mt-1 font-serif text-xl leading-tight text-[#f3ece2]">
                    {clientLabel}
                  </h3>
                  <p className="mt-1 text-xs text-[#c4a574]/90">
                    {maskPhone(fuLead?.phone)}
                    {fuLead?.store ? ` · ${fuLead.store}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !fuBusy && setFollowUpLeadId(null)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[#e8d5b5] hover:bg-white/20"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className={fuLabelClass}>Follow-up type</label>
                <div className="grid grid-cols-3 gap-2">
                  {followUpTypes.map((type) => {
                    const active = fuType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={fuBusy}
                        onClick={() => setFuType(type)}
                        className={`rounded-xl border px-2 py-3 text-center transition ${
                          active
                            ? "border-[#1c1610] bg-[#1c1610] text-[#e8d5b5] shadow-sm dark:border-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
                            : "border-[#eadfcf] bg-white text-[#6b645b] hover:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#d4c8b8]"
                        }`}
                      >
                        <span className="block text-base leading-none">{followUpTypeIcon[type]}</span>
                        <span className="mt-1.5 block text-[11px] font-semibold tracking-wide">
                          {type}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {fuType === "Call" ? (
                  <p className="mt-2.5 rounded-xl border border-[#eadfcf] bg-white px-3 py-2 text-xs text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1a1714]">
                    Exotel will ring your phone first, then connect to{" "}
                    <span className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {clientLabel}
                    </span>{" "}
                    ({maskPhone(fuLead?.phone)}).
                  </p>
                ) : null}
                {fuType === "WhatsApp" ? (
                  <p className="mt-2.5 rounded-xl border border-[#eadfcf] bg-white px-3 py-2 text-xs text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1a1714]">
                    Sends an approved WhatsApp template to{" "}
                    <span className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {clientLabel}
                    </span>{" "}
                    ({maskPhone(fuLead?.phone)}), then logs this follow-up.
                  </p>
                ) : null}
              </div>

              {fuType === "WhatsApp" ? (
                <div className="space-y-3 rounded-2xl border border-[#eadfcf] bg-white p-3.5 dark:border-[#3a342c] dark:bg-[#1a1714]">
                  <div>
                    <label className={fuLabelClass}>WhatsApp template</label>
                    <select
                      value={fuTemplate}
                      disabled={fuBusy}
                      onChange={(e) => setFuTemplate(e.target.value as WaTemplateId)}
                      className={fuFieldClass}
                    >
                      {WA_FOLLOWUP_TEMPLATES.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.label}
                          {fuApprovedTemplates.length && !fuApprovedTemplates.includes(row.id)
                            ? " (may need approval)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(selectedSpec?.params || 0) >= 1 ? (
                    <div>
                      <label className={fuLabelClass}>Name {"{{1}}"}</label>
                      <input
                        type="text"
                        value={fuTemplateName}
                        disabled={fuBusy}
                        onChange={(e) => setFuTemplateName(e.target.value)}
                        className={fuFieldClass}
                      />
                    </div>
                  ) : null}
                  {(selectedSpec?.params || 0) >= 2 ? (
                    <div>
                      <label className={fuLabelClass}>Requirement {"{{2}}"}</label>
                      <input
                        type="text"
                        value={fuTemplateNeed}
                        disabled={fuBusy}
                        onChange={(e) => setFuTemplateNeed(e.target.value)}
                        className={fuFieldClass}
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className={fuLabelClass}>Preview</label>
                    <div className="max-h-28 overflow-y-auto rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap text-[#5c5348] dark:border-[#3a342c] dark:bg-[#161411] dark:text-[#d4c8b8]">
                      {previewBody}
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <label className={fuLabelClass}>
                  Notes / outcome{" "}
                  {fuType === "Site Visit" ? (
                    <span className="normal-case tracking-normal text-rose-500">*</span>
                  ) : (
                    <span className="normal-case tracking-normal text-[#b3a594]">optional</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={fuNote}
                  disabled={fuBusy}
                  onChange={(e) => setFuNote(e.target.value)}
                  placeholder={
                    fuType === "Call"
                      ? "Optional notes after the call…"
                      : fuType === "WhatsApp"
                        ? "Optional notes about this WhatsApp follow-up…"
                        : "What was discussed? Client response? Next steps..."
                  }
                  className={fuFieldClass}
                />
              </div>

              <div>
                <label className={fuLabelClass}>Next follow-up date</label>
                <DatePickerField
                  id="lead-follow-up-next-date"
                  value={fuNextDate}
                  onChange={setFuNextDate}
                  placeholder="Select next follow-up date"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#eadfcf] bg-white/80 px-5 py-4 backdrop-blur dark:border-[#3a342c] dark:bg-[#161411]">
              <button
                type="button"
                disabled={fuBusy}
                onClick={() => setFollowUpLeadId(null)}
                className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68] disabled:opacity-50 dark:border-[#3a342c] dark:bg-[#1a1714]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveFollowUp()}
                disabled={saveDisabled}
                className="inline-flex h-11 min-w-[9.5rem] items-center justify-center gap-2 rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              >
                {fuType === "Call" && !fuBusy ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
                  </svg>
                ) : null}
                {saveLabel}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Follow-up History Drawer */}
      {historyLead && (
        <div
          className="fixed inset-0 z-[99999] flex justify-end"
          onClick={() => setHistoryLeadId(null)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-[#eadfcf] bg-[#fbf8f3] shadow-[-12px_0_40px_rgba(28,22,16,0.12)] dark:border-[#3a342c] dark:bg-[#161411]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0 overflow-hidden border-b border-[#eadfcf] bg-gradient-to-br from-[#1c1610] to-[#3a2f24] px-5 py-4 text-[#e8d5b5] dark:border-[#3a342c]">
              <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#c4a574]/20" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
                    Follow-up history
                  </p>
                  <h3 className="mt-1 truncate font-serif text-xl leading-tight text-[#f3ece2]">
                    {historyLead.clientName}
                  </h3>
                  <p className="mt-1 text-xs text-[#c4a574]/90">
                    {maskPhone(historyLead.phone)}
                    {historyLead.projectName
                      ? ` · ${historyLead.projectName}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryLeadId(null)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[#e8d5b5] hover:bg-white/20"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="shrink-0 border-b border-[#eadfcf] px-5 py-4 dark:border-[#3a342c]">
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#eadfcf] bg-white p-3.5 dark:border-[#3a342c] dark:bg-[#1a1714]">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Phone
                  </span>
                  <span className="mt-0.5 block text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                    {maskPhone(historyLead.phone)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Status
                  </span>
                  <div className="mt-1">
                    <Badge size="sm" color={statusColor[historyLead.status]}>
                      {historyLead.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Assigned to
                  </span>
                  <span className="mt-0.5 block text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                    {historyLead.assignedTo || "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    Project
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                    {historyLead.projectName || "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHistoryLeadId(null);
                  openFollowUpModal(historyLead.id);
                }}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1c1610] text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] hover:bg-[#2a2218] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              >
                + Add follow-up
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                  Timeline
                </p>
                <span className="rounded-full bg-[#eadfcf] px-2.5 py-0.5 text-[11px] font-semibold text-[#7d6139] dark:bg-[#c4a574]/20 dark:text-[#e8d5b5]">
                  {historyLead.followUps.length} logged
                </span>
              </div>

              {historyLead.followUps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-white px-4 py-10 text-center dark:border-[#3a342c] dark:bg-[#1a1714]">
                  <p className="text-sm text-[#8a7b68]">No follow-ups logged yet.</p>
                  <p className="mt-1 text-xs text-[#b3a594]">
                    Add a call, WhatsApp, or site visit to start the timeline.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute bottom-3 left-[15px] top-3 w-px bg-[#eadfcf] dark:bg-[#3a342c]" />
                  <div className="space-y-3">
                    {[...historyLead.followUps].reverse().map((fu) => (
                      <div key={fu.id} className="relative flex gap-3">
                        <div
                          className={`relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#fbf8f3] text-sm shadow-sm dark:border-[#161411] ${
                            fu.type === "Call"
                              ? "bg-[#1c1610] text-[#e8d5b5]"
                              : fu.type === "WhatsApp"
                                ? "bg-[#25D366] text-white"
                                : "bg-[#c4a574] text-[#1c1610]"
                          }`}
                        >
                          {followUpTypeIcon[fu.type]}
                        </div>
                        <div className="min-w-0 flex-1 rounded-2xl border border-[#eadfcf] bg-white p-3.5 dark:border-[#3a342c] dark:bg-[#1a1714]">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="inline-flex rounded-full bg-[#f6efe4] px-2.5 py-0.5 text-[11px] font-semibold text-[#9a7748] dark:bg-[#c4a574]/15 dark:text-[#e8d5b5]">
                              {fu.type}
                            </span>
                            <span className="text-[11px] text-[#b3a594]">
                              {fu.date}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-[#1c1610] dark:text-[#f3ece2]">
                            {fu.note || "—"}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#8a7b68]">
                            {fu.by && fu.by !== "—" ? (
                              <span>By {fu.by}</span>
                            ) : null}
                            {fu.nextDate && fu.nextDate !== "-" ? (
                              <span>Next {fu.nextDate}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <LeadExplorerModal
        lead={
          explorerLead
            ? {
                id: explorerLead.id,
                clientName: explorerLead.clientName,
                projectName: explorerLead.projectName,
              }
            : null
        }
        open={Boolean(explorerLead)}
        onClose={() => setExplorerLead(null)}
      />

      <BulkLeadActionsModal
        open={bulkOpen}
        onClose={() => !bulkBusy && setBulkOpen(false)}
        selectedCount={selected.length}
        assigneeOptions={assigneeOptions}
        loading={assigneesLoading || bulkBusy}
        canDelete={canDeleteLeads}
        onApply={handleBulkApply}
      />

      <ConvertLeadToProjectModal
        lead={
          convertTarget
            ? {
                id: convertTarget.id,
                clientName: convertTarget.clientName,
                projectName: convertTarget.projectName,
              }
            : null
        }
        onClose={() => setConvertTarget(null)}
        onSuccess={handleConvertSuccess}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Delete lead?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Remove <strong>{deleteTarget.clientName}</strong> (
              {deleteTarget.id}) from the leads list? This is a soft delete —
              the record is hidden but kept in the database.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => !deleteBusy && setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-error-500 hover:bg-error-600"
                onClick={() => void confirmDeleteLead()}
                disabled={deleteBusy}
              >
                {deleteBusy ? "Deleting…" : "Delete lead"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkDeleteOpen ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Delete {selected.length} lead{selected.length === 1 ? "" : "s"}?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Remove the selected leads from the list? This is a soft delete —
              records are hidden but kept in the database.
            </p>
            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
              {selected.slice(0, 8).map((id) => {
                const lead = leads.find((item) => item.id === id);
                return (
                  <li key={id} className="truncate">
                    {lead?.clientName || id} · {id}
                  </li>
                );
              })}
              {selected.length > 8 ? (
                <li className="text-gray-400">
                  +{selected.length - 8} more…
                </li>
              ) : null}
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => !deleteBusy && setBulkDeleteOpen(false)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-error-500 hover:bg-error-600"
                onClick={() => void confirmBulkDelete()}
                disabled={deleteBusy}
              >
                {deleteBusy
                  ? "Deleting…"
                  : `Delete ${selected.length} lead${selected.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
