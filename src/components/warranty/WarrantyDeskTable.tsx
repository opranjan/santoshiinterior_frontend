"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { warrantyApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum, warrantyTypeToEnum } from "@/lib/mappers";
import { mapWarranty, toIsoDateOrNull } from "@/lib/crmMappers";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TicketStatus =
  | "Open"
  | "Assigned"
  | "In Progress"
  | "Waiting Parts"
  | "Resolved"
  | "Closed"
  | "Rejected";

type TicketType =
  | "Warranty Claim"
  | "Service Visit"
  | "AMC"
  | "Complaint"
  | "Inspection";

type Priority = "Low" | "Medium" | "High" | "Urgent";

type WarrantyTicket = {
  id: string;
  subject: string;
  type: TicketType;
  priority: Priority;
  status: TicketStatus;
  projectId: string;
  projectName: string;
  client: string;
  phone: string;
  store: string;
  warrantyUntil: string;
  assignedTo: string;
  openedAt: string;
  dueDate: string;
  resolvedAt: string;
  issue: string;
  resolution: string;
};

const statuses: TicketStatus[] = [
  "Open",
  "Assigned",
  "In Progress",
  "Waiting Parts",
  "Resolved",
  "Closed",
  "Rejected",
];

const types: TicketType[] = [
  "Warranty Claim",
  "Service Visit",
  "AMC",
  "Complaint",
  "Inspection",
];

const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];

const team = [
  "Vikram Singh",
  "Sneha Patel",
  "Amit Verma",
  "Rahul Sharma",
  "Priya Mehta",
  "Service Team A",
  "Service Team B",
];

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(t: WarrantyTicket) {
  if (
    !t.dueDate ||
    t.status === "Resolved" ||
    t.status === "Closed" ||
    t.status === "Rejected"
  ) {
    return false;
  }
  return t.dueDate < todayIso();
}

function warrantyActive(until: string) {
  if (!until) return false;
  return until >= todayIso();
}

const selectClass =
  "h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function WarrantyDeskTable() {
  const [tickets, setTickets] = useState<WarrantyTicket[]>([]);
  const [apiProjects, setApiProjects] = useState<
    Array<{ id: string; name: string; client?: string; store: string; warrantyUntil?: string }>
  >([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [ticketsData, projects, stores] = await Promise.all([
          warrantyApi.list({ limit: 100 }),
          projectsApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
        setApiProjects(
          projects.items.map((p) => {
            const row = p as Record<string, unknown>;
            const store = row.store as { name?: string } | null;
            return {
              id: String(row.id),
              name: String(row.name || ""),
              client: String(row.clientName || ""),
              store: store?.name || "",
            };
          })
        );
        setTickets(
          ticketsData.items.map(
            (i) => mapWarranty(i as Record<string, unknown>) as WarrantyTicket
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load warranty tickets");
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
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [statusFilter, setStatusFilter] = useState<"All" | TicketStatus>(
    "All"
  );
  const [typeFilter, setTypeFilter] = useState<"All" | TicketType>("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WarrantyTicket | null>(null);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!actionsOpenId) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (actionsMenuRef.current?.contains(target)) return;
      setActionsOpenId(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionsOpenId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [actionsOpenId]);

  const emptyForm = {
    subject: "",
    type: "Warranty Claim" as TicketType,
    priority: "Medium" as Priority,
    status: "Open" as TicketStatus,
    projectId: "",
    assignedTo: team[0],
    openedAt: todayIso(),
    dueDate: "",
    issue: "",
    resolution: "",
  };

  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tickets.filter((t) => {
      const matchSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.client.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        t.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""));
      const matchStore =
        storeFilter === "All Stores" || t.store === storeFilter;
      const matchStatus =
        statusFilter === "All" || t.status === statusFilter;
      const matchType = typeFilter === "All" || t.type === typeFilter;
      return matchSearch && matchStore && matchStatus && matchType;
    });
  }, [tickets, search, storeFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const open = tickets.filter(
      (t) =>
        t.status === "Open" ||
        t.status === "Assigned" ||
        t.status === "In Progress" ||
        t.status === "Waiting Parts"
    ).length;
    const overdue = tickets.filter((t) => isOverdue(t)).length;
    const resolved = tickets.filter(
      (t) => t.status === "Resolved" || t.status === "Closed"
    ).length;
    const urgent = tickets.filter(
      (t) =>
        t.priority === "Urgent" &&
        t.status !== "Resolved" &&
        t.status !== "Closed" &&
        t.status !== "Rejected"
    ).length;
    const underWarranty = tickets.filter((t) =>
      warrantyActive(t.warrantyUntil)
    ).length;
    const growthLabel =
      tickets.length > 0 ? `+${Math.round((open / Math.max(tickets.length, 1)) * 100)}%` : null;

    return {
      total: tickets.length,
      open,
      overdue,
      resolved,
      urgent,
      underWarranty,
      growthLabel,
    };
  }, [tickets]);

  const selectedProject = apiProjects.find((p) => p.id === form.projectId);

  const openAdd = () => {
    setError("");
    setEditing(null);
    setForm({
      ...emptyForm,
      projectId: apiProjects[0]?.id || "",
      openedAt: todayIso(),
      dueDate: "",
    });
    setShowForm(true);
  };

  const openEdit = (t: WarrantyTicket) => {
    setEditing(t);
    setForm({
      subject: t.subject,
      type: t.type,
      priority: t.priority,
      status: t.status,
      projectId: t.projectId,
      assignedTo: t.assignedTo,
      openedAt: t.openedAt,
      dueDate: t.dueDate,
      issue: t.issue,
      resolution: t.resolution,
    });
    setShowForm(true);
  };

  const saveTicket = async () => {
    if (!form.subject.trim()) {
      setError("Ticket subject is required");
      return;
    }

    const status = form.status;
    const storeId = selectedProject
      ? storeOptions.find((s) => s.name === selectedProject.store)?.id || null
      : null;

    const apiPayload = {
      subject: form.subject.trim(),
      type: warrantyTypeToEnum(form.type),
      priority: labelToEnum(form.priority),
      status: labelToEnum(status),
      projectId: selectedProject?.id || null,
      storeId,
      clientName: selectedProject?.client || null,
      phone: (selectedProject as { phone?: string } | undefined)?.phone || null,
      warrantyUntil: toIsoDateOrNull(
        (selectedProject as { warrantyUntil?: string } | undefined)
          ?.warrantyUntil || null
      ),
      openedAt: toIsoDateOrNull(form.openedAt || todayIso()),
      dueDate: toIsoDateOrNull(form.dueDate),
      resolvedAt:
        status === "Resolved" || status === "Closed"
          ? toIsoDateOrNull(editing?.resolvedAt || todayIso())
          : null,
      issue: form.issue.trim() || null,
      resolution: form.resolution.trim() || null,
    };

    try {
      setError("");
      if (editing) {
        const updated = (await warrantyApi.update(
          editing.id,
          apiPayload
        )) as Record<string, unknown>;
        setTickets((prev) =>
          prev.map((t) =>
            t.id === editing.id ? (mapWarranty(updated) as WarrantyTicket) : t
          )
        );
      } else {
        const created = (await warrantyApi.create(
          apiPayload
        )) as Record<string, unknown>;
        setTickets((prev) => [
          mapWarranty(created) as WarrantyTicket,
          ...prev,
        ]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save warranty ticket"
      );
    }
  };

  const updateStatus = (id: string, status: TicketStatus) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              resolvedAt:
                status === "Resolved" || status === "Closed"
                  ? t.resolvedAt || todayIso()
                  : "",
            }
          : t
      )
    );
  };

  const updateAssignee = (id: string, assignedTo: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              assignedTo,
              status: t.status === "Open" ? "Assigned" : t.status,
            }
          : t
      )
    );
  };

  const markResolved = (id: string) => updateStatus(id, "Resolved");

  const softSelect =
    "h-11 appearance-none rounded-xl border border-[#eadfcf] bg-white px-3 pr-9 text-sm text-[#1c1610] outline-none focus:border-[#c4a574]";

  const priorityPill: Record<Priority, string> = {
    Low: "bg-[#f3f4f6] text-[#4b5563]",
    Medium: "bg-[#fff4e5] text-[#b76a1a]",
    High: "bg-[#fdeceb] text-[#b42318]",
    Urgent: "bg-[#fee4e2] text-[#912018]",
  };

  const statusPill: Record<TicketStatus, string> = {
    Open: "bg-[#fff7e8] text-[#b54708]",
    Assigned: "bg-[#eef4ff] text-[#3538cd]",
    "In Progress": "bg-[#eef4ff] text-[#3538cd]",
    "Waiting Parts": "bg-[#f4ebe0] text-[#7a5c34]",
    Resolved: "bg-[#eaf6ee] text-[#1f7a45]",
    Closed: "bg-[#eaf6ee] text-[#1f7a45]",
    Rejected: "bg-[#fdeceb] text-[#b42318]",
  };

  const typeIcon = (type: TicketType) => {
    if (type === "Service Visit") return "🔧";
    if (type === "Warranty Claim") return "🛡️";
    if (type === "Complaint") return "⚠️";
    if (type === "AMC") return "📋";
    return "🔍";
  };

  const thumbFor = (key: string) => {
    const thumbs = [
      "/images/product/product-01.jpg",
      "/images/product/product-02.jpg",
      "/images/product/product-03.jpg",
      "/images/product/product-04.jpg",
      "/images/cards/card-01.jpg",
      "/images/cards/card-02.jpg",
    ];
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 1)) % thumbs.length;
    return thumbs[hash];
  };

  const avatarFor = (name: string) => {
    const avatars = [
      "/images/user/user-01.jpg",
      "/images/user/user-02.jpg",
      "/images/user/user-03.jpg",
      "/images/user/user-04.jpg",
      "/images/user/user-05.jpg",
      "/images/user/user-06.jpg",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % avatars.length;
    return avatars[hash];
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-[#f0c9c3] bg-[#fff7f6] px-4 py-3 text-sm text-[#8a3424]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_1px_2px_rgba(28,22,16,0.04)]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a7b68]">
              Total Tickets
            </p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f4ebe0] text-sm">🎫</span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.total}</p>
            {stats.growthLabel ? (
              <span className="mb-1 text-xs font-semibold text-[#1f7a45]">{stats.growthLabel}</span>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-[#d6e4ff] bg-[#eef4ff] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6172f3]">Open</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm">📂</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.open}</p>
        </div>
        <div className="rounded-2xl border border-[#f9dbda] bg-[#fef3f2] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#d92d20]">Overdue</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm">⚠</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.overdue}</p>
        </div>
        <div className="rounded-2xl border border-[#f9db8e] bg-[#fff6df] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b54708]">Urgent</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm">🔥</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.urgent}</p>
        </div>
        <div className="rounded-2xl border border-[#cfe8d7] bg-[#eaf6ee] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1f7a45]">Resolved</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm">✓</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.resolved}</p>
        </div>
        <div className="rounded-2xl border border-[#e0d7fe] bg-[#f4f0ff] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6938ef]">
              Under Warranty
            </p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm">🛡️</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.underWarranty}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1 xl:max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7b68]">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket, client, project..."
              className="h-11 w-full rounded-xl border border-[#eadfcf] bg-white pl-9 pr-3 text-sm text-[#1c1610] outline-none focus:border-[#c4a574]"
            />
          </div>
          <div className="relative">
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className={softSelect}
            >
              <option value="All Stores">All Stores</option>
              {storeOptions.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | TicketStatus)}
              className={softSelect}
            >
              <option value="All">All Status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "All" | TicketType)}
              className={softSelect}
            >
              <option value="All">All Types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/projects"
            className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-3 text-sm font-semibold text-[#5c5348]"
          >
            Projects
          </Link>
          <Link
            href="/customers"
            className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-3 text-sm font-semibold text-[#5c5348]"
          >
            Customers
          </Link>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-11 items-center rounded-xl bg-[#2a2118] px-4 text-sm font-semibold text-[#f3ece2]"
          >
            + New Ticket
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-[0_1px_2px_rgba(28,22,16,0.04)]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1280px]">
            <Table>
              <TableHeader className="bg-[#f4ebe0]">
                <TableRow>
                  {[
                    "Ticket",
                    "Client / Project",
                    "Type",
                    "Priority",
                    "Status",
                    "Assigned To",
                    "Warranty",
                    "Due",
                    "Issue",
                    "Actions",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3.5 text-start text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7a6f62] whitespace-nowrap"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading &&
                  filtered.map((t) => {
                    const overdue = isOverdue(t);
                    const active = warrantyActive(t.warrantyUntil);
                    return (
                      <TableRow
                        key={t.id}
                        className={`border-t border-[#f0e8db] hover:bg-[#fbf8f3] ${
                          overdue ? "bg-[#fff7f6]" : ""
                        }`}
                      >
                        <TableCell className="px-4 py-3.5 text-start">
                          <p className="text-sm font-semibold text-[#1c1610]">
                            #{t.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-[#8a7b68]">{t.subject}</p>
                          <p className="text-xs text-[#a89884]">Opened {formatDate(t.openedAt)}</p>
                        </TableCell>

                        <TableCell className="px-4 py-3.5 text-start">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={thumbFor(t.projectId || t.id)}
                              alt=""
                              className="h-10 w-10 rounded-xl object-cover ring-1 ring-[#eadfcf]"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#1c1610]">
                                {t.client || "—"}
                              </p>
                              <p className="truncate text-xs text-[#8a7b68]">{t.phone || "—"}</p>
                              <p className="truncate text-xs text-[#a89884]">
                                {t.projectName || "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-sm text-[#5c5348]">
                            <span>{typeIcon(t.type)}</span>
                            {t.type}
                          </span>
                        </TableCell>

                        <TableCell className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityPill[t.priority]}`}
                          >
                            {t.priority}
                          </span>
                        </TableCell>

                        <TableCell className="px-4 py-3.5">
                          <div className="relative inline-flex">
                            <select
                              value={t.status}
                              onChange={(e) =>
                                updateStatus(t.id, e.target.value as TicketStatus)
                              }
                              className={`h-8 appearance-none rounded-full border-0 px-3 pr-7 text-[11px] font-semibold outline-none ${statusPill[t.status]}`}
                            >
                              {statuses.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={avatarFor(t.assignedTo || "Unassigned")}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover ring-1 ring-[#eadfcf]"
                            />
                            <select
                              value={t.assignedTo}
                              onChange={(e) => updateAssignee(t.id, e.target.value)}
                              className="h-8 max-w-[130px] rounded-lg border border-[#eadfcf] bg-white px-2 text-xs text-[#5c5348]"
                            >
                              {team.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3.5 whitespace-nowrap">
                          <p
                            className={`text-sm font-medium ${
                              active ? "text-[#1f7a45]" : "text-[#b42318]"
                            }`}
                          >
                            {active ? "Active" : "— Expired"}
                          </p>
                          <p className="text-xs text-[#8a7b68]">{formatDate(t.warrantyUntil)}</p>
                        </TableCell>

                        <TableCell className="px-4 py-3.5 whitespace-nowrap">
                          {t.resolvedAt ? (
                            <p className="text-sm text-[#5c5348]">Done {formatDate(t.resolvedAt)}</p>
                          ) : (
                            <p
                              className={`text-sm ${
                                overdue ? "font-semibold text-[#b42318]" : "text-[#5c5348]"
                              }`}
                            >
                              {formatDate(t.dueDate)}
                            </p>
                          )}
                          {overdue ? <p className="text-xs text-[#b42318]">Overdue</p> : null}
                        </TableCell>

                        <TableCell className="max-w-[220px] px-4 py-3.5">
                          <p className="line-clamp-2 text-sm text-[#6b645b]">{t.issue || "—"}</p>
                        </TableCell>

                        <TableCell className="px-4 py-3.5 whitespace-nowrap">
                          <div
                            className="relative inline-flex"
                            ref={actionsOpenId === t.id ? actionsMenuRef : undefined}
                          >
                            <button
                              type="button"
                              aria-haspopup="menu"
                              aria-expanded={actionsOpenId === t.id}
                              onClick={() =>
                                setActionsOpenId((prev) => (prev === t.id ? null : t.id))
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#eadfcf] text-[#8a7b68] hover:bg-[#fbf8f3]"
                            >
                              ⋯
                            </button>
                            {actionsOpenId === t.id ? (
                              <div
                                role="menu"
                                className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-xl border border-[#eadfcf] bg-white py-1 shadow-lg"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setActionsOpenId(null);
                                    openEdit(t);
                                  }}
                                  className="block w-full px-3 py-2 text-left text-sm text-[#1c1610] hover:bg-[#fbf8f3]"
                                >
                                  Edit
                                </button>
                                {t.status !== "Resolved" &&
                                t.status !== "Closed" &&
                                t.status !== "Rejected" ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setActionsOpenId(null);
                                      markResolved(t.id);
                                    }}
                                    className="block w-full px-3 py-2 text-left text-sm text-[#1f7a45] hover:bg-[#fbf8f3]"
                                  >
                                    Resolve
                                  </button>
                                ) : null}
                                <Link
                                  href="/projects"
                                  role="menuitem"
                                  onClick={() => setActionsOpenId(null)}
                                  className="block px-3 py-2 text-sm text-[#5c5348] hover:bg-[#fbf8f3]"
                                >
                                  Project
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                      No tickets match your filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editing ? "Edit Ticket" : "New Warranty Ticket"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Subject</Label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  placeholder="e.g. Soft-close hinge not working"
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Project / Client</Label>
                <select
                  value={form.projectId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, projectId: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  <option value="">Select project (optional)</option>
                  {apiProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.client}
                    </option>
                  ))}
                </select>
                {selectedProject && (
                  <p className="mt-1 text-xs text-gray-400">
                    Warranty until{" "}
                    {formatDate(selectedProject.warrantyUntil || "")} ·{" "}
                    {warrantyActive(selectedProject.warrantyUntil || "")
                      ? "Active"
                      : "Expired"}
                  </p>
                )}
              </div>
              <div>
                <Label>Type</Label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as TicketType,
                    }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      priority: e.target.value as Priority,
                    }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {priorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as TicketStatus,
                    }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Assigned To</Label>
                <select
                  value={form.assignedTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, assignedTo: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {team.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Opened On</Label>
                <input
                  type="date"
                  value={form.openedAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, openedAt: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Issue Details</Label>
                <textarea
                  rows={2}
                  value={form.issue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, issue: e.target.value }))
                  }
                  placeholder="Describe the customer issue…"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Resolution / Notes</Label>
                <textarea
                  rows={2}
                  value={form.resolution}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, resolution: e.target.value }))
                  }
                  placeholder="What was done / next steps…"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveTicket}
                disabled={!form.subject.trim()}
              >
                {editing ? "Save Changes" : "Create Ticket"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
