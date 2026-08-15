"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { leadsApi, projectsApi, storesApi } from "@/services/crmApi";
import { enumToLabel, labelToEnum } from "@/lib/mappers";
import { projectFormFromLead } from "@/lib/leadToProjectForm";

type ProjectStatus =
  | "Kickoff"
  | "Design"
  | "Material"
  | "Execution"
  | "Handover"
  | "On Hold"
  | "Completed";

type Project = {
  id: string;
  name: string;
  client: string;
  phone: string;
  store: string;
  projectType: string;
  scope: string;
  budget: string;
  status: ProjectStatus;
  progress: number;
  salesOwner: string;
  assignedTo: string;
  financialYear: string;
  startDate: string;
  endDate: string;
  address: string;
  description: string;
  latestRemark: string;
  updatedAt: string;
};

const statuses: ProjectStatus[] = [
  "Kickoff",
  "Design",
  "Material",
  "Execution",
  "Handover",
  "On Hold",
  "Completed",
];

const projectTypes = [
  "Residential",
  "Commercial",
  "Office",
  "Retail Showroom",
  "Renovation",
];

const scopes = [
  "Full Home Interiors",
  "Modular Kitchen",
  "Living Room",
  "Bedroom",
  "Office Fit-out",
  "Renovation",
  "Other",
];

const budgets = [
  "Under ₹5 Lakh",
  "₹5 – 10 Lakh",
  "₹10 – 25 Lakh",
  "₹25 – 50 Lakh",
  "Above ₹50 Lakh",
];

const stores = ["All Stores", "Main Branch", "North Store", "South Store"];

const team = [
  "Mukesh singh",
  "Rahul Sharma",
  "Priya Mehta",
  "Amit Verma",
  "Sneha Patel",
  "Vikram Singh",
];

const statusColor: Record<
  ProjectStatus,
  "primary" | "info" | "warning" | "success" | "error" | "light"
> = {
  Kickoff: "info",
  Design: "primary",
  Material: "warning",
  Execution: "warning",
  Handover: "success",
  "On Hold": "error",
  Completed: "success",
};

const initialProjects: Project[] = [
  {
    id: "PRJ-101",
    name: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    phone: "+91 90909 80808",
    store: "Main Branch",
    projectType: "Residential",
    scope: "Full Home Interiors",
    budget: "₹10 – 25 Lakh",
    status: "Execution",
    progress: 78,
    salesOwner: "Vikram Singh",
    assignedTo: "Sneha Patel",
    financialYear: "2026-27",
    startDate: "2026-06-01",
    endDate: "2026-09-15",
    address: "Scheme 54, Indore",
    description: "Full home interiors with modular kitchen and false ceiling",
    latestRemark: "Carpentry 80% done · painting starts next week",
    updatedAt: "2026-07-28T15:20:00",
  },
  {
    id: "PRJ-102",
    name: "TechNest Office Fit-out",
    client: "TechNest Pvt Ltd",
    phone: "+91 91234 56789",
    store: "Main Branch",
    projectType: "Office",
    scope: "Office Fit-out",
    budget: "Above ₹50 Lakh",
    status: "Design",
    progress: 42,
    salesOwner: "Rahul Sharma",
    assignedTo: "Rahul Sharma",
    financialYear: "2026-27",
    startDate: "2026-07-10",
    endDate: "2026-10-30",
    address: "Vijay Nagar, Indore",
    description: "50-seater office with cabin partition + reception",
    latestRemark: "Layout approved · material list in progress",
    updatedAt: "2026-07-29T11:00:00",
  },
  {
    id: "PRJ-103",
    name: "Malhotra Villa",
    client: "Rajesh Malhotra",
    phone: "+91 98111 22334",
    store: "North Store",
    projectType: "Residential",
    scope: "Full Home Interiors",
    budget: "₹25 – 50 Lakh",
    status: "Kickoff",
    progress: 15,
    salesOwner: "Priya Mehta",
    assignedTo: "Priya Mehta",
    financialYear: "2026-27",
    startDate: "2026-08-01",
    endDate: "2026-12-15",
    address: "Bhopal",
    description: "4BHK villa modular kitchen priority",
    latestRemark: "Site measurement completed",
    updatedAt: "2026-07-28T15:30:00",
  },
  {
    id: "PRJ-104",
    name: "2 BHK Renovation - Ujjain",
    client: "Meera Joshi",
    phone: "+91 99887 66554",
    store: "South Store",
    projectType: "Renovation",
    scope: "Living Room",
    budget: "₹5 – 10 Lakh",
    status: "Material",
    progress: 55,
    salesOwner: "Amit Verma",
    assignedTo: "Amit Verma",
    financialYear: "2026-27",
    startDate: "2026-07-05",
    endDate: "2026-08-20",
    address: "Ujjain",
    description: "Living room false ceiling + TV unit",
    latestRemark: "Laminate ordered · delivery in 5 days",
    updatedAt: "2026-07-27T09:40:00",
  },
  {
    id: "PRJ-105",
    name: "Retail Showroom - North",
    client: "Suresh Agarwal",
    phone: "+91 97654 32109",
    store: "North Store",
    projectType: "Retail Showroom",
    scope: "Other",
    budget: "₹25 – 50 Lakh",
    status: "On Hold",
    progress: 30,
    salesOwner: "Sneha Patel",
    assignedTo: "Vikram Singh",
    financialYear: "2026-27",
    startDate: "2026-05-20",
    endDate: "2026-09-01",
    address: "AB Road, Indore",
    description: "Showroom interiors and display units",
    latestRemark: "On hold · waiting client advance",
    updatedAt: "2026-07-20T16:00:00",
  },
  {
    id: "PRJ-106",
    name: "Kapoor Penthouse",
    client: "Ananya Kapoor",
    phone: "+91 98765 43210",
    store: "Main Branch",
    projectType: "Residential",
    scope: "Full Home Interiors",
    budget: "Above ₹50 Lakh",
    status: "Completed",
    progress: 100,
    salesOwner: "Mukesh singh",
    assignedTo: "Sneha Patel",
    financialYear: "2025-26",
    startDate: "2025-11-01",
    endDate: "2026-04-30",
    address: "Palm Court, Indore",
    description: "Luxury penthouse interiors",
    latestRemark: "Handover done · warranty activated",
    updatedAt: "2026-05-02T12:00:00",
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const selectClass =
  "h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function ProjectsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLeadHandled = useRef(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [storeOptions, setStoreOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [statusFilter, setStatusFilter] = useState<"All" | ProjectStatus>(
    "All"
  );
  const [typeFilter, setTypeFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [sourceLeadId, setSourceLeadId] = useState<string | null>(null);
  const [sourceLeadClientName, setSourceLeadClientName] = useState("");

  const [form, setForm] = useState({
    name: "",
    client: "",
    phone: "",
    store: "Main Branch",
    projectType: "Residential",
    scope: "Full Home Interiors",
    budget: "₹10 – 25 Lakh",
    status: "Kickoff" as ProjectStatus,
    progress: 0,
    salesOwner: "Mukesh singh",
    assignedTo: "Mukesh singh",
    financialYear: "2026-27",
    startDate: "",
    endDate: "",
    address: "",
    description: "",
    latestRemark: "",
  });

  const mapProject = (dto: Record<string, unknown>): Project => {
    const store = dto.store as { name?: string } | null | undefined;
    const salesOwner = dto.salesOwner as { name?: string } | null | undefined;
    const assignedTo = dto.assignedTo as { name?: string } | null | undefined;
    const statusLabel = enumToLabel(String(dto.status || "KICKOFF")) as ProjectStatus;
    return {
      id: String(dto.id),
      name: String(dto.name || ""),
      client: String(dto.clientName || ""),
      phone: String(dto.phone || ""),
      store: store?.name || "",
      projectType: String(dto.projectType || ""),
      scope: String(dto.scope || ""),
      budget: String(dto.budget || ""),
      status: (statuses.includes(statusLabel) ? statusLabel : "Kickoff") as ProjectStatus,
      progress: Number(dto.progress || 0),
      salesOwner: salesOwner?.name || "",
      assignedTo: assignedTo?.name || "",
      financialYear: String(dto.financialYear || ""),
      startDate: formatDate((dto.startDate as string | null) || ""),
      endDate: formatDate((dto.endDate as string | null) || ""),
      address: String(dto.address || ""),
      description: String(dto.description || ""),
      latestRemark: String(dto.latestRemark || ""),
      updatedAt: String(dto.updatedAt || ""),
    };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [projectData, storeData] = await Promise.all([
          projectsApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(
          storeData.items.map((s) => ({ id: s.id, name: s.name }))
        );
        if (storeData.items[0]) {
          setForm((prev) => ({ ...prev, store: storeData.items[0].name }));
        }
        setProjects(projectData.items.map((item) => mapProject(item)));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load projects");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const fromLead = searchParams.get("fromLead");
    if (!fromLead || fromLeadHandled.current || loading) return;

    fromLeadHandled.current = true;

    (async () => {
      try {
        const lead = await leadsApi.get(fromLead);
        const prefilled = projectFormFromLead(lead, {
          store: storeOptions[0]?.name || "Main Branch",
          salesOwner: "Mukesh singh",
          assignedTo: lead.assignedTo?.name || "Mukesh singh",
        });
        setForm((prev) => ({
          ...prev,
          ...prefilled,
          status: "Kickoff",
          progress: 0,
          endDate: "",
        }));
        setSourceLeadId(fromLead);
        setSourceLeadClientName(lead.clientName);
        setEditing(null);
        setShowAdd(true);
        router.replace("/projects", { scroll: false });
      } catch {
        setError("Could not load lead details for new project.");
      }
    })();
  }, [searchParams, loading, storeOptions, router]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      const matchSearch =
        !q ||
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""));
      const matchStore =
        storeFilter === "All Stores" || p.store === storeFilter;
      const matchStatus =
        statusFilter === "All" || p.status === statusFilter;
      const matchType =
        typeFilter === "All" || p.projectType === typeFilter;
      return matchSearch && matchStore && matchStatus && matchType;
    });
  }, [projects, search, storeFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const active = projects.filter(
      (p) => p.status !== "Completed" && p.status !== "On Hold"
    ).length;
    const onHold = projects.filter((p) => p.status === "On Hold").length;
    const completed = projects.filter((p) => p.status === "Completed").length;
    const avgProgress =
      projects.length === 0
        ? 0
        : Math.round(
            projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
          );
    return {
      total: projects.length,
      active,
      onHold,
      completed,
      avgProgress,
    };
  }, [projects]);

  const resetForm = () => {
    setForm({
      name: "",
      client: "",
      phone: "",
      store: "Main Branch",
      projectType: "Residential",
      scope: "Full Home Interiors",
      budget: "₹10 – 25 Lakh",
      status: "Kickoff",
      progress: 0,
      salesOwner: "Mukesh singh",
      assignedTo: "Mukesh singh",
      financialYear: "2026-27",
      startDate: "",
      endDate: "",
      address: "",
      description: "",
      latestRemark: "",
    });
  };

  const openAdd = () => {
    setEditing(null);
    setSourceLeadId(null);
    setSourceLeadClientName("");
    resetForm();
    setShowAdd(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      name: p.name,
      client: p.client,
      phone: p.phone,
      store: p.store,
      projectType: p.projectType,
      scope: p.scope,
      budget: p.budget,
      status: p.status,
      progress: p.progress,
      salesOwner: p.salesOwner,
      assignedTo: p.assignedTo,
      financialYear: p.financialYear,
      startDate: p.startDate,
      endDate: p.endDate,
      address: p.address,
      description: p.description,
      latestRemark: p.latestRemark,
    });
    setShowAdd(true);
  };

  const saveProject = async () => {
    if (!form.name.trim() || !form.client.trim()) return;
    const storeId =
      storeOptions.find((s) => s.name === form.store)?.id || null;
    const payload = {
      name: form.name.trim(),
      clientName: form.client.trim(),
      phone: form.phone.trim() || null,
      storeId,
      projectType: form.projectType,
      scope: form.scope,
      budget: form.budget,
      status: labelToEnum(form.status),
      progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
      financialYear: form.financialYear || null,
      startDate: form.startDate
        ? `${form.startDate}T00:00:00.000Z`
        : null,
      endDate: form.endDate ? `${form.endDate}T00:00:00.000Z` : null,
      address: form.address || null,
      description: form.description || null,
      latestRemark: form.latestRemark || null,
    };

    try {
      if (editing) {
        const updated = (await projectsApi.update(
          editing.id,
          payload
        )) as Record<string, unknown>;
        setProjects((prev) =>
          prev.map((p) => (p.id === editing.id ? mapProject(updated) : p))
        );
      } else {
        const created = (await projectsApi.create(
          payload
        )) as Record<string, unknown>;
        setProjects((prev) => [mapProject(created), ...prev]);

        if (sourceLeadId) {
          await leadsApi.convertToProject(sourceLeadId, {
            projectId: String(created.id),
          });
        }
      }
      setShowAdd(false);
      setEditing(null);
      setSourceLeadId(null);
      setSourceLeadClientName("");
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    }
  };

  const updateStatus = async (id: string, status: ProjectStatus) => {
    const prev = projects;
    setProjects((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              progress:
                status === "Completed"
                  ? 100
                  : status === "Kickoff"
                    ? Math.min(p.progress, 15)
                    : p.progress,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
    try {
      await projectsApi.update(id, {
        status: labelToEnum(status),
        progress:
          status === "Completed"
            ? 100
            : undefined,
      });
    } catch {
      setProjects(prev);
    }
  };

  const updateProgress = async (id: string, progress: number) => {
    const value = Math.min(100, Math.max(0, progress));
    const prev = projects;
    setProjects((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              progress: value,
              status: value >= 100 ? "Completed" : p.status,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
    try {
      await projectsApi.update(id, {
        progress: value,
        status: value >= 100 ? "COMPLETED" : undefined,
      });
    } catch {
      setProjects(prev);
    }
  };

  const updateAssignee = (id: string, assignedTo: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, assignedTo, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500">Loading projects...</div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Projects
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track interior projects across stores — status, progress, and team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/settings/projects">
            <Button size="sm" variant="outline">
              Project Settings
            </Button>
          </Link>
          <Button size="sm" onClick={openAdd}>
            + New Project
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Total Projects", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "On Hold", value: stats.onHold },
          { label: "Completed", value: stats.completed },
          { label: "Avg Progress", value: `${stats.avgProgress}%` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
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
            placeholder="Search project, client, ID…"
            defaultValue={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className={selectClass}
        >
          {["All Stores", ...storeOptions.map((s) => s.name)].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "All" | ProjectStatus)
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
          onChange={(e) => setTypeFilter(e.target.value)}
          className={selectClass}
        >
          <option value="All">All Types</option>
          {projectTypes.map((t) => (
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
                    "Project",
                    "Client",
                    "Type / Scope",
                    "Store",
                    "Status",
                    "Progress",
                    "Assigned To",
                    "Budget",
                    "Timeline",
                    "Latest Remark",
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
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="px-4 py-3 text-start">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400">{p.id}</p>
                      <p className="text-xs text-gray-400">FY {p.financialYear}</p>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {p.client}
                      </p>
                      <p className="text-xs text-gray-500">{p.phone}</p>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                      <p className="text-sm text-gray-800 dark:text-white/90">
                        {p.projectType}
                      </p>
                      <p className="text-xs text-gray-500">{p.scope}</p>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {p.store}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <Badge size="sm" color={statusColor[p.status]}>
                          {p.status}
                        </Badge>
                        <select
                          value={p.status}
                          onChange={(e) =>
                            updateStatus(
                              p.id,
                              e.target.value as ProjectStatus
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

                    <TableCell className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-brand-600 transition-all"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs font-medium text-gray-600 dark:text-gray-300">
                          {p.progress}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={p.progress}
                        onChange={(e) =>
                          updateProgress(p.id, Number(e.target.value))
                        }
                        className="mt-1 w-full accent-brand-600"
                      />
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2" title={p.assignedTo}>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-[11px] font-semibold text-white">
                          {initials(p.assignedTo)}
                        </span>
                        <select
                          value={p.assignedTo}
                          onChange={(e) =>
                            updateAssignee(p.id, e.target.value)
                          }
                          className="h-8 max-w-[120px] rounded-md border border-transparent bg-transparent text-xs text-gray-600 hover:border-gray-200 focus:border-brand-300 focus:outline-hidden dark:text-gray-300"
                        >
                          {team.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {p.budget}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(p.startDate)}
                      </p>
                      <p className="text-xs text-gray-400">
                        → {formatDate(p.endDate)}
                      </p>
                    </TableCell>

                    <TableCell className="px-4 py-3 max-w-[220px]">
                      <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                        {p.latestRemark || "—"}
                      </p>
                    </TableCell>

                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="text-left text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Edit
                        </button>
                        <Link
                          href="/design/designing"
                          className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                        >
                          Design
                        </Link>
                        <Link
                          href={`/sales/quotations/new?from=project&id=${p.id}`}
                          className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                        >
                          Quotation
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-sm text-gray-500">
                      No projects match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {editing ? "Edit Project" : "New Project"}
                </h3>
                {sourceLeadId && !editing ? (
                  <p className="mt-1 text-sm text-brand-600 dark:text-brand-400">
                    From lead: {sourceLeadClientName} — review and save to link
                    this project
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setEditing(null);
                  setSourceLeadId(null);
                  setSourceLeadClientName("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Project Name</Label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Enter project name"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <Label>Client Name</Label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client: e.target.value }))
                  }
                  placeholder="Client name"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+91 …"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <Label>Store</Label>
                <select
                  value={form.store}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, store: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {storeOptions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Project Type</Label>
                <select
                  value={form.projectType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, projectType: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {projectTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Scope</Label>
                <select
                  value={form.scope}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scope: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {scopes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Budget</Label>
                <select
                  value={form.budget}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, budget: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {budgets.map((b) => (
                    <option key={b} value={b}>
                      {b}
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
                      status: e.target.value as ProjectStatus,
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
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <Label>Sales Owner</Label>
                <select
                  value={form.salesOwner}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, salesOwner: e.target.value }))
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
                <Label>Start Date</Label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Site Address</Label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Project / site address"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Write a description…"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Latest Remark</Label>
                <textarea
                  rows={2}
                  value={form.latestRemark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, latestRemark: e.target.value }))
                  }
                  placeholder="Write your remark…"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveProject}
                disabled={!form.name.trim() || !form.client.trim()}
              >
                {editing ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
