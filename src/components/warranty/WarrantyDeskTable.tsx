"use client";

import React, { useEffect, useMemo, useState } from "react";
import { warrantyApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum, warrantyTypeToEnum } from "@/lib/mappers";
import { mapWarranty, toIsoDateOrNull } from "@/lib/crmMappers";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
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

const stores = ["All Stores", "Main Branch", "North Store", "South Store"];

const team = [
  "Vikram Singh",
  "Sneha Patel",
  "Amit Verma",
  "Rahul Sharma",
  "Priya Mehta",
  "Service Team A",
  "Service Team B",
];

const legacyProjectOptions = [
  {
    id: "PRJ-106",
    name: "Kapoor Penthouse",
    client: "Ananya Kapoor",
    phone: "+91 98765 43210",
    store: "Main Branch",
    warrantyUntil: "2027-04-30",
  },
  {
    id: "PRJ-101",
    name: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    phone: "+91 90909 80808",
    store: "Main Branch",
    warrantyUntil: "2027-09-15",
  },
  {
    id: "PRJ-104",
    name: "2 BHK Renovation - Ujjain",
    client: "Meera Joshi",
    phone: "+91 99887 66554",
    store: "South Store",
    warrantyUntil: "2027-08-20",
  },
  {
    id: "PRJ-103",
    name: "Malhotra Villa",
    client: "Rajesh Malhotra",
    phone: "+91 98111 22334",
    store: "North Store",
    warrantyUntil: "2027-12-15",
  },
];

const statusColor: Record<
  TicketStatus,
  "warning" | "info" | "primary" | "light" | "success" | "error"
> = {
  Open: "warning",
  Assigned: "info",
  "In Progress": "primary",
  "Waiting Parts": "light",
  Resolved: "success",
  Closed: "success",
  Rejected: "error",
};

const priorityColor: Record<Priority, "light" | "info" | "warning" | "error"> =
  {
    Low: "light",
    Medium: "info",
    High: "warning",
    Urgent: "error",
  };

const initialTickets: WarrantyTicket[] = [
  {
    id: "WR-901",
    subject: "Kitchen shutter soft-close not working",
    type: "Warranty Claim",
    priority: "High",
    status: "In Progress",
    projectId: "PRJ-106",
    projectName: "Kapoor Penthouse",
    client: "Ananya Kapoor",
    phone: "+91 98765 43210",
    store: "Main Branch",
    warrantyUntil: "2027-04-30",
    assignedTo: "Service Team A",
    openedAt: "2026-07-25",
    dueDate: "2026-07-30",
    resolvedAt: "",
    issue: "Two shutters not closing properly after handover.",
    resolution: "Hinges ordered · visit scheduled",
  },
  {
    id: "WR-902",
    subject: "Wardrobe laminate chip near handle",
    type: "Warranty Claim",
    priority: "Medium",
    status: "Waiting Parts",
    projectId: "PRJ-101",
    projectName: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    phone: "+91 90909 80808",
    store: "Main Branch",
    warrantyUntil: "2027-09-15",
    assignedTo: "Sneha Patel",
    openedAt: "2026-07-27",
    dueDate: "2026-08-05",
    resolvedAt: "",
    issue: "Edge chip on master wardrobe door.",
    resolution: "Matching laminate patch pending from vendor",
  },
  {
    id: "WR-903",
    subject: "Quarterly AMC visit",
    type: "AMC",
    priority: "Low",
    status: "Assigned",
    projectId: "PRJ-106",
    projectName: "Kapoor Penthouse",
    client: "Ananya Kapoor",
    phone: "+91 98765 43210",
    store: "Main Branch",
    warrantyUntil: "2027-04-30",
    assignedTo: "Service Team B",
    openedAt: "2026-07-28",
    dueDate: "2026-08-08",
    resolvedAt: "",
    issue: "Routine AMC inspection for hardware & fittings.",
    resolution: "",
  },
  {
    id: "WR-904",
    subject: "False ceiling crack near AC",
    type: "Complaint",
    priority: "Urgent",
    status: "Open",
    projectId: "PRJ-104",
    projectName: "2 BHK Renovation - Ujjain",
    client: "Meera Joshi",
    phone: "+91 99887 66554",
    store: "South Store",
    warrantyUntil: "2027-08-20",
    assignedTo: "Amit Verma",
    openedAt: "2026-07-30",
    dueDate: "2026-08-01",
    resolvedAt: "",
    issue: "Hairline crack appeared after AC installation by third party.",
    resolution: "",
  },
  {
    id: "WR-905",
    subject: "Drawer channel replacement",
    type: "Service Visit",
    priority: "Medium",
    status: "Resolved",
    projectId: "PRJ-103",
    projectName: "Malhotra Villa",
    client: "Rajesh Malhotra",
    phone: "+91 98111 22334",
    store: "North Store",
    warrantyUntil: "2027-12-15",
    assignedTo: "Vikram Singh",
    openedAt: "2026-07-10",
    dueDate: "2026-07-18",
    resolvedAt: "2026-07-17",
    issue: "Kitchen drawer not sliding smoothly.",
    resolution: "Channel replaced under warranty · client signed OK",
  },
  {
    id: "WR-906",
    subject: "Post-handover quality inspection",
    type: "Inspection",
    priority: "Low",
    status: "Closed",
    projectId: "PRJ-106",
    projectName: "Kapoor Penthouse",
    client: "Ananya Kapoor",
    phone: "+91 98765 43210",
    store: "Main Branch",
    warrantyUntil: "2027-04-30",
    assignedTo: "Priya Mehta",
    openedAt: "2026-05-05",
    dueDate: "2026-05-10",
    resolvedAt: "2026-05-09",
    issue: "Standard snag list after handover.",
    resolution: "Minor touch-ups completed · ticket closed",
  },
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
    return {
      total: tickets.length,
      open,
      overdue,
      resolved,
      urgent,
      underWarranty,
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Warranty Desk
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            After-sales tickets, warranty claims, AMC, and service visits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects">
            <Button size="sm" variant="outline">
              Projects
            </Button>
          </Link>
          <Link href="/customers">
            <Button size="sm" variant="outline">
              Customers
            </Button>
          </Link>
          <Button size="sm" onClick={openAdd}>
            + New Ticket
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total Tickets", value: stats.total },
          { label: "Open", value: stats.open },
          { label: "Overdue", value: stats.overdue, alert: true },
          { label: "Urgent", value: stats.urgent, alert: true },
          { label: "Resolved", value: stats.resolved },
          { label: "Under Warranty", value: stats.underWarranty },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p
              className={`mt-1 text-xl font-semibold ${
                s.alert && s.value > 0
                  ? "text-error-500"
                  : "text-gray-800 dark:text-white/90"
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex-1 sm:max-w-xs">
          <Input
            type="text"
            placeholder="Search ticket, client, project…"
            defaultValue={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className={selectClass}
        >
          {stores.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "All" | TicketStatus)
          }
          className={selectClass}
        >
          <option value="All">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "All" | TicketType)
          }
          className={selectClass}
        >
          <option value="All">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1400px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
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
                      className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filtered.map((t) => {
                  const overdue = isOverdue(t);
                  const active = warrantyActive(t.warrantyUntil);
                  return (
                    <TableRow
                      key={t.id}
                      className={
                        overdue
                          ? "bg-error-50/40 dark:bg-error-500/5"
                          : undefined
                      }
                    >
                      <TableCell className="px-4 py-3 text-start">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {t.subject}
                        </p>
                        <p className="text-xs text-gray-400">{t.id}</p>
                        <p className="text-xs text-gray-400">
                          Opened {formatDate(t.openedAt)}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {t.client}
                        </p>
                        <p className="text-xs text-gray-500">{t.phone}</p>
                        <p className="text-xs text-gray-400">
                          {t.projectName} · {t.store}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {t.type}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <Badge size="sm" color={priorityColor[t.priority]}>
                          {t.priority}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge size="sm" color={statusColor[t.status]}>
                            {t.status}
                          </Badge>
                          <select
                            value={t.status}
                            onChange={(e) =>
                              updateStatus(
                                t.id,
                                e.target.value as TicketStatus
                              )
                            }
                            className="h-8 rounded-md border border-gray-200 bg-transparent px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <select
                          value={t.assignedTo}
                          onChange={(e) =>
                            updateAssignee(t.id, e.target.value)
                          }
                          className="h-8 max-w-[140px] rounded-md border border-gray-200 bg-transparent px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                          {team.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(t.warrantyUntil)}
                        </p>
                        <p
                          className={`text-xs ${
                            active
                              ? "text-success-600"
                              : "text-error-500"
                          }`}
                        >
                          {active ? "Active" : "Expired"}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p
                          className={`text-sm ${
                            overdue
                              ? "font-medium text-error-500"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {formatDate(t.dueDate)}
                        </p>
                        {overdue && (
                          <p className="text-xs text-error-500">Overdue</p>
                        )}
                        {t.resolvedAt && (
                          <p className="text-xs text-gray-400">
                            Done {formatDate(t.resolvedAt)}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 max-w-[220px]">
                        <p className="line-clamp-2 text-sm text-gray-500">
                          {t.issue || "—"}
                        </p>
                        {t.resolution && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">
                            Fix: {t.resolution}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="text-left text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            Edit
                          </button>
                          {t.status !== "Resolved" &&
                            t.status !== "Closed" &&
                            t.status !== "Rejected" && (
                              <button
                                type="button"
                                onClick={() => markResolved(t.id)}
                                className="text-left text-sm font-medium text-success-600 hover:text-success-700"
                              >
                                Resolve
                              </button>
                            )}
                          <Link
                            href="/projects"
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                          >
                            Project
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-sm text-gray-500">
                      No tickets match your filters.
                    </TableCell>
                  </TableRow>
                )}
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
