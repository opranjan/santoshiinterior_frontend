"use client";

import React, { useEffect, useMemo, useState } from "react";
import { workOrdersApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum } from "@/lib/mappers";
import { mapWorkOrder, toIsoDateOrNull } from "@/lib/crmMappers";
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

type WOStatus =
  | "Draft"
  | "Assigned"
  | "In Progress"
  | "On Hold"
  | "Completed"
  | "Cancelled";

type WOCategory =
  | "Carpentry"
  | "Modular"
  | "Electrical"
  | "Plumbing"
  | "Painting"
  | "False Ceiling"
  | "Site Work"
  | "Other";

type Priority = "Low" | "Medium" | "High" | "Urgent";

type WorkOrder = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  client: string;
  store: string;
  category: WOCategory;
  priority: Priority;
  status: WOStatus;
  progress: number;
  assignedTo: string;
  supervisor: string;
  startDate: string;
  dueDate: string;
  completedDate: string;
  siteAddress: string;
  instructions: string;
  remark: string;
  createdAt: string;
};

const statuses: WOStatus[] = [
  "Draft",
  "Assigned",
  "In Progress",
  "On Hold",
  "Completed",
  "Cancelled",
];

const categories: WOCategory[] = [
  "Carpentry",
  "Modular",
  "Electrical",
  "Plumbing",
  "Painting",
  "False Ceiling",
  "Site Work",
  "Other",
];

const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];

const stores = ["All Stores", "Main Branch", "North Store", "South Store"];

const team = [
  "Vikram Singh",
  "Sneha Patel",
  "Amit Verma",
  "Rahul Sharma",
  "Priya Mehta",
  "Site Team A",
  "Site Team B",
  "Carpentry Unit",
];

const legacyProjectOptions = [
  {
    id: "PRJ-101",
    name: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    store: "Main Branch",
    address: "Scheme 54, Indore",
  },
  {
    id: "PRJ-102",
    name: "TechNest Office Fit-out",
    client: "TechNest Pvt Ltd",
    store: "Main Branch",
    address: "Vijay Nagar, Indore",
  },
  {
    id: "PRJ-103",
    name: "Malhotra Villa",
    client: "Rajesh Malhotra",
    store: "North Store",
    address: "Bhopal",
  },
  {
    id: "PRJ-104",
    name: "2 BHK Renovation - Ujjain",
    client: "Meera Joshi",
    store: "South Store",
    address: "Ujjain",
  },
];

const statusColor: Record<
  WOStatus,
  "light" | "info" | "primary" | "warning" | "success" | "error"
> = {
  Draft: "light",
  Assigned: "info",
  "In Progress": "primary",
  "On Hold": "warning",
  Completed: "success",
  Cancelled: "error",
};

const priorityColor: Record<Priority, "light" | "info" | "warning" | "error"> =
  {
    Low: "light",
    Medium: "info",
    High: "warning",
    Urgent: "error",
  };

const initialOrders: WorkOrder[] = [
  {
    id: "WO-301",
    title: "Living room carpentry & TV unit",
    projectId: "PRJ-101",
    projectName: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    store: "Main Branch",
    category: "Carpentry",
    priority: "High",
    status: "In Progress",
    progress: 70,
    assignedTo: "Carpentry Unit",
    supervisor: "Vikram Singh",
    startDate: "2026-07-10",
    dueDate: "2026-08-05",
    completedDate: "",
    siteAddress: "Scheme 54, Indore",
    instructions: "Complete TV unit, sofa back panel, and cove framing.",
    remark: "TV unit installed · sofa panel pending",
    createdAt: "2026-07-08T10:00:00",
  },
  {
    id: "WO-302",
    title: "Modular kitchen installation",
    projectId: "PRJ-101",
    projectName: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    store: "Main Branch",
    category: "Modular",
    priority: "Urgent",
    status: "Assigned",
    progress: 20,
    assignedTo: "Site Team A",
    supervisor: "Sneha Patel",
    startDate: "2026-07-28",
    dueDate: "2026-08-12",
    completedDate: "",
    siteAddress: "Scheme 54, Indore",
    instructions: "Install base & wall units, quartz top fitting after carcass.",
    remark: "Material reached site",
    createdAt: "2026-07-25T14:30:00",
  },
  {
    id: "WO-303",
    title: "Office cabin partitions",
    projectId: "PRJ-102",
    projectName: "TechNest Office Fit-out",
    client: "TechNest Pvt Ltd",
    store: "Main Branch",
    category: "Site Work",
    priority: "Medium",
    status: "In Progress",
    progress: 45,
    assignedTo: "Site Team B",
    supervisor: "Rahul Sharma",
    startDate: "2026-07-18",
    dueDate: "2026-08-20",
    completedDate: "",
    siteAddress: "Vijay Nagar, Indore",
    instructions: "Gypsum partitions for 6 cabins + reception backdrop.",
    remark: "4 cabins framed",
    createdAt: "2026-07-16T09:00:00",
  },
  {
    id: "WO-304",
    title: "False ceiling + cove lights",
    projectId: "PRJ-103",
    projectName: "Malhotra Villa",
    client: "Rajesh Malhotra",
    store: "North Store",
    category: "False Ceiling",
    priority: "High",
    status: "Draft",
    progress: 0,
    assignedTo: "Site Team A",
    supervisor: "Priya Mehta",
    startDate: "2026-08-05",
    dueDate: "2026-08-25",
    completedDate: "",
    siteAddress: "Bhopal",
    instructions: "Living + master bedroom POP with LED cove.",
    remark: "Waiting kickoff confirmation",
    createdAt: "2026-07-29T11:15:00",
  },
  {
    id: "WO-305",
    title: "Living room painting",
    projectId: "PRJ-104",
    projectName: "2 BHK Renovation - Ujjain",
    client: "Meera Joshi",
    store: "South Store",
    category: "Painting",
    priority: "Medium",
    status: "On Hold",
    progress: 35,
    assignedTo: "Amit Verma",
    supervisor: "Amit Verma",
    startDate: "2026-07-20",
    dueDate: "2026-07-30",
    completedDate: "",
    siteAddress: "Ujjain",
    instructions: "Acrylic emulsion · shade approved by client.",
    remark: "On hold · laminate delivery delayed",
    createdAt: "2026-07-18T16:00:00",
  },
  {
    id: "WO-306",
    title: "Electrical points & switches",
    projectId: "PRJ-102",
    projectName: "TechNest Office Fit-out",
    client: "TechNest Pvt Ltd",
    store: "Main Branch",
    category: "Electrical",
    priority: "High",
    status: "Completed",
    progress: 100,
    assignedTo: "Site Team B",
    supervisor: "Vikram Singh",
    startDate: "2026-07-12",
    dueDate: "2026-07-22",
    completedDate: "2026-07-21",
    siteAddress: "Vijay Nagar, Indore",
    instructions: "New DB, cabin points, and floor boxes.",
    remark: "Handover checklist signed",
    createdAt: "2026-07-10T08:45:00",
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

function isOverdue(wo: WorkOrder) {
  if (!wo.dueDate || wo.status === "Completed" || wo.status === "Cancelled") {
    return false;
  }
  return wo.dueDate < todayIso();
}

const selectClass =
  "h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function WorkOrdersTable() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [apiProjects, setApiProjects] = useState<
    Array<{ id: string; name: string; client: string; store: string; address?: string }>
  >([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [wo, projects, stores] = await Promise.all([
          workOrdersApi.list({ limit: 100 }),
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
              address: String(row.address || ""),
            };
          })
        );
        setOrders(
          wo.items.map((i) => mapWorkOrder(i as Record<string, unknown>) as WorkOrder)
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load work orders");
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
  const [statusFilter, setStatusFilter] = useState<"All" | WOStatus>("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | WOCategory>(
    "All"
  );
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);

  const emptyForm = {
    title: "",
    projectId: "",
    category: "Carpentry" as WOCategory,
    priority: "Medium" as Priority,
    status: "Draft" as WOStatus,
    progress: 0,
    assignedTo: team[0],
    supervisor: team[0],
    startDate: "",
    dueDate: "",
    siteAddress: "",
    instructions: "",
    remark: "",
  };

  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter((wo) => {
      const matchSearch =
        !q ||
        wo.id.toLowerCase().includes(q) ||
        wo.title.toLowerCase().includes(q) ||
        wo.projectName.toLowerCase().includes(q) ||
        wo.client.toLowerCase().includes(q) ||
        wo.assignedTo.toLowerCase().includes(q);
      const matchStore =
        storeFilter === "All Stores" || wo.store === storeFilter;
      const matchStatus =
        statusFilter === "All" || wo.status === statusFilter;
      const matchCategory =
        categoryFilter === "All" || wo.category === categoryFilter;
      return matchSearch && matchStore && matchStatus && matchCategory;
    });
  }, [orders, search, storeFilter, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const open = orders.filter(
      (o) =>
        o.status === "Assigned" ||
        o.status === "In Progress" ||
        o.status === "Draft"
    ).length;
    const inProgress = orders.filter((o) => o.status === "In Progress").length;
    const onHold = orders.filter((o) => o.status === "On Hold").length;
    const completed = orders.filter((o) => o.status === "Completed").length;
    const overdue = orders.filter((o) => isOverdue(o)).length;
    return { total: orders.length, open, inProgress, onHold, completed, overdue };
  }, [orders]);

  const selectedProject = apiProjects.find((p) => p.id === form.projectId);

  const openAdd = () => {
    setError("");
    setEditing(null);
    const first = apiProjects[0];
    setForm({
      ...emptyForm,
      projectId: first?.id || "",
      startDate: todayIso(),
      dueDate: "",
      siteAddress: first?.address || "",
    });
    setShowForm(true);
  };

  const openEdit = (wo: WorkOrder) => {
    setEditing(wo);
    setForm({
      title: wo.title,
      projectId: wo.projectId,
      category: wo.category,
      priority: wo.priority,
      status: wo.status,
      progress: wo.progress,
      assignedTo: wo.assignedTo,
      supervisor: wo.supervisor,
      startDate: wo.startDate,
      dueDate: wo.dueDate,
      siteAddress: wo.siteAddress,
      instructions: wo.instructions,
      remark: wo.remark,
    });
    setShowForm(true);
  };

  const saveOrder = async () => {
    if (!form.title.trim()) {
      setError("Work order title is required");
      return;
    }
    const progress = Math.min(100, Math.max(0, Number(form.progress) || 0));
    const status =
      progress >= 100 && form.status !== "Cancelled"
        ? "Completed"
        : form.status;

    const storeId = selectedProject
      ? storeOptions.find((s) => s.name === selectedProject.store)?.id || null
      : null;

    const apiPayload = {
      title: form.title.trim(),
      projectId: selectedProject?.id || null,
      storeId,
      category: labelToEnum(form.category),
      priority: labelToEnum(form.priority),
      status: labelToEnum(status),
      progress,
      startDate: toIsoDateOrNull(form.startDate),
      dueDate: toIsoDateOrNull(form.dueDate),
      completedDate:
        status === "Completed"
          ? toIsoDateOrNull(editing?.completedDate || todayIso())
          : null,
      siteAddress:
        form.siteAddress.trim() || selectedProject?.address || null,
      instructions: form.instructions.trim() || null,
      remark: form.remark.trim() || null,
    };

    try {
      setError("");
      if (editing) {
        const updated = (await workOrdersApi.update(
          editing.id,
          apiPayload
        )) as Record<string, unknown>;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === editing.id ? (mapWorkOrder(updated) as WorkOrder) : o
          )
        );
      } else {
        const created = (await workOrdersApi.create(
          apiPayload
        )) as Record<string, unknown>;
        setOrders((prev) => [mapWorkOrder(created) as WorkOrder, ...prev]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save work order");
    }
  };

  const updateStatus = async (id: string, status: WOStatus) => {
    const prev = orders;
    setOrders((current) =>
      current.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              progress:
                status === "Completed"
                  ? 100
                  : status === "Draft"
                    ? Math.min(o.progress, 5)
                    : o.progress,
              completedDate:
                status === "Completed" ? o.completedDate || todayIso() : "",
            }
          : o
      )
    );
    try {
      await workOrdersApi.update(id, {
        status: labelToEnum(status),
        progress: status === "Completed" ? 100 : undefined,
        completedDate:
          status === "Completed" ? toIsoDateOrNull(todayIso()) : null,
      });
    } catch {
      setOrders(prev);
    }
  };

  const updateProgress = (id: string, progress: number) => {
    const value = Math.min(100, Math.max(0, progress));
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              progress: value,
              status:
                value >= 100
                  ? "Completed"
                  : o.status === "Draft" && value > 0
                    ? "In Progress"
                    : o.status,
              completedDate: value >= 100 ? o.completedDate || todayIso() : "",
            }
          : o
      )
    );
  };

  const updateAssignee = (id: string, assignedTo: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              assignedTo,
              status: o.status === "Draft" ? "Assigned" : o.status,
            }
          : o
      )
    );
  };

  const markComplete = (id: string) => {
    updateStatus(id, "Completed");
  };

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
            Work Orders
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Plan and track site execution for carpentry, modular, painting, and
            more.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects">
            <Button size="sm" variant="outline">
              View Projects
            </Button>
          </Link>
          <Button size="sm" onClick={openAdd}>
            + New Work Order
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total", value: stats.total },
          { label: "Open", value: stats.open },
          { label: "In Progress", value: stats.inProgress },
          { label: "On Hold", value: stats.onHold },
          { label: "Completed", value: stats.completed },
          { label: "Overdue", value: stats.overdue },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p
              className={`mt-1 text-xl font-semibold ${
                s.label === "Overdue" && s.value > 0
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
            placeholder="Search WO, project, team…"
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
            setStatusFilter(e.target.value as "All" | WOStatus)
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
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as "All" | WOCategory)
          }
          className={selectClass}
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
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
                    "Work Order",
                    "Project",
                    "Category",
                    "Priority",
                    "Status",
                    "Progress",
                    "Assigned To",
                    "Timeline",
                    "Remark",
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
                {filtered.map((wo) => {
                  const overdue = isOverdue(wo);
                  return (
                    <TableRow
                      key={wo.id}
                      className={
                        overdue
                          ? "bg-error-50/40 dark:bg-error-500/5"
                          : undefined
                      }
                    >
                      <TableCell className="px-4 py-3 text-start">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {wo.title}
                        </p>
                        <p className="text-xs text-gray-400">{wo.id}</p>
                        <p className="text-xs text-gray-400">{wo.store}</p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {wo.projectName}
                        </p>
                        <p className="text-xs text-gray-500">{wo.client}</p>
                        <p className="text-xs text-gray-400">{wo.projectId}</p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {wo.category}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <Badge size="sm" color={priorityColor[wo.priority]}>
                          {wo.priority}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge size="sm" color={statusColor[wo.status]}>
                            {wo.status}
                          </Badge>
                          <select
                            value={wo.status}
                            onChange={(e) =>
                              updateStatus(wo.id, e.target.value as WOStatus)
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

                      <TableCell className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full bg-brand-600 transition-all"
                              style={{ width: `${wo.progress}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs font-medium text-gray-600">
                            {wo.progress}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={wo.progress}
                          onChange={(e) =>
                            updateProgress(wo.id, Number(e.target.value))
                          }
                          className="mt-1 w-full accent-brand-600"
                        />
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <select
                          value={wo.assignedTo}
                          onChange={(e) =>
                            updateAssignee(wo.id, e.target.value)
                          }
                          className="h-8 max-w-[140px] rounded-md border border-gray-200 bg-transparent px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                          {team.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-400">
                          Sup: {wo.supervisor}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(wo.startDate)}
                        </p>
                        <p
                          className={`text-xs ${
                            overdue
                              ? "font-medium text-error-500"
                              : "text-gray-400"
                          }`}
                        >
                          Due {formatDate(wo.dueDate)}
                          {overdue ? " · overdue" : ""}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 max-w-[200px]">
                        <p className="line-clamp-2 text-sm text-gray-500">
                          {wo.remark || "—"}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(wo)}
                            className="text-left text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            Edit
                          </button>
                          {wo.status !== "Completed" &&
                            wo.status !== "Cancelled" && (
                              <button
                                type="button"
                                onClick={() => markComplete(wo.id)}
                                className="text-left text-sm font-medium text-success-600 hover:text-success-700"
                              >
                                Complete
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
                      No work orders match your filters.
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
                {editing ? "Edit Work Order" : "New Work Order"}
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
                <Label>Title</Label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Modular kitchen installation"
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Project</Label>
                <select
                  value={form.projectId}
                  onChange={(e) => {
                    const p = apiProjects.find((x) => x.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      projectId: e.target.value,
                      siteAddress: p?.address || f.siteAddress,
                    }));
                  }}
                  className={`${selectClass} w-full`}
                >
                  <option value="">Select project (optional)</option>
                  {apiProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.client}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as WOCategory,
                    }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
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
                      status: e.target.value as WOStatus,
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
                <Label>Progress (%)</Label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      progress: Number(e.target.value),
                    }))
                  }
                  className={fieldClass}
                />
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
                <Label>Supervisor</Label>
                <select
                  value={form.supervisor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supervisor: e.target.value }))
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
                <Label>Start Date</Label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
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
                <Label>Site Address</Label>
                <input
                  type="text"
                  value={form.siteAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, siteAddress: e.target.value }))
                  }
                  placeholder="Site address"
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Instructions</Label>
                <textarea
                  rows={2}
                  value={form.instructions}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, instructions: e.target.value }))
                  }
                  placeholder="Work instructions for the team…"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Remark</Label>
                <textarea
                  rows={2}
                  value={form.remark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remark: e.target.value }))
                  }
                  placeholder="Latest update…"
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
                onClick={saveOrder}
                disabled={!form.title.trim()}
              >
                {editing ? "Save Changes" : "Create Work Order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
