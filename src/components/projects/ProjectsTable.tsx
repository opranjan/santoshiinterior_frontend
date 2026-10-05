"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { leadsApi, projectsApi, storesApi, usersApi } from "@/services/crmApi";
import { enumToLabel, labelToEnum } from "@/lib/mappers";
import { projectFormFromLead } from "@/lib/leadToProjectForm";
import ProjectTasksPanel, { toYmd } from "@/components/projects/ProjectTasksPanel";

type ProjectStatus =
  | "Kickoff"
  | "Design"
  | "Material"
  | "Execution"
  | "Handover"
  | "On Hold"
  | "Completed";

type TimelineTask = {
  id: string;
  title: string;
  startDate?: string | null;
  dueDate?: string | null;
  status: string;
};

type Project = {
  id: string;
  name: string;
  client: string;
  phone: string;
  store: string;
  projectType: string;
  scope: string;
  budget: string;
  dlpHoldingPercent: number;
  status: ProjectStatus;
  progress: number;
  salesOwner: string;
  assignedTo: string;
  assignedToId: string | null;
  franchiseeIds: string[];
  franchiseeNames: string;
  financialYear: string;
  startDate: string;
  endDate: string;
  startIso: string;
  endIso: string;
  address: string;
  description: string;
  latestRemark: string;
  updatedAt: string;
  taskCount: number;
  timelineTasks: TimelineTask[];
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

type StaffOption = { id: string; name: string };

function isFranchiseeAccount(user: {
  accessRole?: { key?: string; label?: string } | null;
}) {
  const key = user.accessRole?.key || "";
  const label = String(user.accessRole?.label || "");
  return key === "FRANCHISEE" || /franchisee/i.test(label) || /vendor panel/i.test(label);
}

function franchiseesFromDto(dto: Record<string, unknown>) {
  const rows = Array.isArray(dto.assignees)
    ? (dto.assignees as Array<{
        userId?: string;
        user?: { id?: string; name?: string } | null;
      }>)
    : [];
  const people = rows
    .map((row) => ({
      id: row.user?.id || row.userId || "",
      name: row.user?.name || "",
    }))
    .filter((row) => row.id);
  return {
    franchiseeIds: people.map((row) => row.id),
    franchiseeNames: people.map((row) => row.name || "Franchisee").join(", "),
  };
}

const team = [
  "Mukesh singh",
  "Rahul Sharma",
  "Priya Mehta",
  "Amit Verma",
  "Sneha Patel",
  "Vikram Singh",
];

const statusChip: Record<ProjectStatus, string> = {
  Kickoff: "bg-[#eadfcf] text-[#5c472c]",
  Design: "bg-[#1c1610] text-[#e8d5b5]",
  Material: "bg-[#f3e6c8] text-[#7d6139]",
  Execution: "bg-[#f3e6c8] text-[#7d6139]",
  Handover: "bg-[#e8efe4] text-[#3d5a3a]",
  "On Hold": "bg-rose-50 text-rose-700",
  Completed: "bg-[#e8efe4] text-[#3d5a3a]",
};

const initialProjects = [
  {
    id: "PRJ-101",
    name: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    phone: "+91 90909 80808",
    store: "Main Branch",
    projectType: "Residential",
    scope: "Full Home Interiors",
    budget: "Rs. 10 - 25 Lakh",
    status: "Execution",
    progress: 78,
    salesOwner: "Vikram Singh",
    assignedTo: "Sneha Patel",
    financialYear: "2026-27",
    startDate: "2026-06-01",
    endDate: "2026-09-15",
    address: "Scheme 54, Indore",
    description: "Full home interiors with modular kitchen and false ceiling",
    latestRemark: "Carpentry 80% done Â· painting starts next week",
    taskCount: 0,
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
    budget: "Above Rs. 50 Lakh",
    status: "Design",
    progress: 42,
    salesOwner: "Rahul Sharma",
    assignedTo: "Rahul Sharma",
    financialYear: "2026-27",
    startDate: "2026-07-10",
    endDate: "2026-10-30",
    address: "Vijay Nagar, Indore",
    description: "50-seater office with cabin partition + reception",
    latestRemark: "Layout approved Â· material list in progress",
    taskCount: 0,
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
    budget: "Rs. 25 - 50 Lakh",
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
    taskCount: 0,
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
    budget: "Rs. 5 - 10 Lakh",
    status: "Material",
    progress: 55,
    salesOwner: "Amit Verma",
    assignedTo: "Amit Verma",
    financialYear: "2026-27",
    startDate: "2026-07-05",
    endDate: "2026-08-20",
    address: "Ujjain",
    description: "Living room false ceiling + TV unit",
    latestRemark: "Laminate ordered Â· delivery in 5 days",
    taskCount: 0,
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
    budget: "Rs. 25 - 50 Lakh",
    status: "On Hold",
    progress: 30,
    salesOwner: "Sneha Patel",
    assignedTo: "Vikram Singh",
    financialYear: "2026-27",
    startDate: "2026-05-20",
    endDate: "2026-09-01",
    address: "AB Road, Indore",
    description: "Showroom interiors and display units",
    latestRemark: "On hold Â· waiting client advance",
    taskCount: 0,
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
    budget: "Above Rs. 50 Lakh",
    status: "Completed",
    progress: 100,
    salesOwner: "Mukesh singh",
    assignedTo: "Sneha Patel",
    financialYear: "2025-26",
    startDate: "2025-11-01",
    endDate: "2026-04-30",
    address: "Palm Court, Indore",
    description: "Luxury penthouse interiors",
    latestRemark: "Handover done Â· warranty activated",
    taskCount: 0,
    updatedAt: "2026-05-02T12:00:00",
  },
];

function formatDate(iso: string) {
  if (!iso) return "\u2014";
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

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const selectClass = fieldClass;
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

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
  const [tasksProject, setTasksProject] = useState<Project | null>(null);

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [franchisees, setFranchisees] = useState<StaffOption[]>([]);
  const [franchiseePickerId, setFranchiseePickerId] = useState<string | null>(null);
  const franchiseePickerRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    name: "",
    client: "",
    phone: "",
    store: "Main Branch",
    projectType: "Residential",
    scope: "Full Home Interiors",
    budget: "",
    dlpHoldingPercent: 20,
    status: "Kickoff" as ProjectStatus,
    progress: 0,
    salesOwner: "Mukesh singh",
    assignedTo: "",
    assignedToId: "",
    franchiseeIds: [] as string[],
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
    const assignedTo = dto.assignedTo as
      | { id?: string; name?: string }
      | null
      | undefined;
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
      dlpHoldingPercent: Number(dto.dlpHoldingPercent ?? 20),
      status: (statuses.includes(statusLabel) ? statusLabel : "Kickoff") as ProjectStatus,
      progress: Number(dto.progress || 0),
      salesOwner: salesOwner?.name || "",
      assignedTo: assignedTo?.name || "",
      assignedToId: assignedTo?.id || (dto.assignedToId as string | null) || null,
      ...franchiseesFromDto(dto),
      financialYear: String(dto.financialYear || ""),
      startDate: formatDate((dto.startDate as string | null) || ""),
      endDate: formatDate((dto.endDate as string | null) || ""),
      startIso: toYmd((dto.startDate as string | null) || ""),
      endIso: toYmd((dto.endDate as string | null) || ""),
      address: String(dto.address || ""),
      description: String(dto.description || ""),
      latestRemark: String(dto.latestRemark || ""),
      updatedAt: String(dto.updatedAt || ""),
      taskCount: Number(
        (dto._count as { tasks?: number } | undefined)?.tasks || 0
      ),
      timelineTasks: Array.isArray(dto.tasks)
        ? (dto.tasks as TimelineTask[])
        : [],
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
        let staffRows: StaffOption[] = [];
        let franchiseeRows: StaffOption[] = [];
        try {
          const userData = await usersApi.list({ limit: 200, isActive: "true" });
          (userData.items || []).forEach((u) => {
            const option = { id: u.id, name: u.name };
            if (isFranchiseeAccount(u)) franchiseeRows.push(option);
            else staffRows.push(option);
          });
        } catch {
          staffRows = [];
          franchiseeRows = [];
        }
        if (cancelled) return;
        setStoreOptions(
          storeData.items.map((s) => ({ id: s.id, name: s.name }))
        );
        setStaff(staffRows);
        setFranchisees(franchiseeRows);
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
          assignedTo: lead.assignedTo?.name || "",
        });
        setForm((prev) => ({
          ...prev,
          ...prefilled,
          assignedToId: lead.assignedToId || lead.assignedTo?.id || "",
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

  useEffect(() => {
    if (!franchiseePickerId) return;
    const onPointerDown = (event: MouseEvent) => {
      const node = franchiseePickerRef.current;
      if (node && !node.contains(event.target as Node)) {
        setFranchiseePickerId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFranchiseePickerId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [franchiseePickerId]);

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
      budget: "",
    dlpHoldingPercent: 20,
      status: "Kickoff",
      progress: 0,
      salesOwner: "Mukesh singh",
      assignedTo: "",
      assignedToId: "",
      franchiseeIds: [],
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
      dlpHoldingPercent: p.dlpHoldingPercent ?? 20,
      status: p.status,
      progress: p.progress,
      salesOwner: p.salesOwner,
      assignedTo: p.assignedTo,
      assignedToId: p.assignedToId || "",
      franchiseeIds: p.franchiseeIds || [],
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
      dlpHoldingPercent: Number(form.dlpHoldingPercent) || 0,
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
      assignedToId: form.assignedToId || null,
      assigneeIds: form.franchiseeIds,
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

  const updateAssignee = async (id: string, assignedToId: string) => {
    const option = staff.find((u) => u.id === assignedToId);
    const prev = projects;
    setProjects((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              assignedToId: assignedToId || null,
              assignedTo: option?.name || "",
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
    try {
      await projectsApi.update(id, { assignedToId: assignedToId || null });
    } catch {
      setProjects(prev);
    }
  };

  const updateFranchisees = async (id: string, nextIds: string[]) => {
    const prev = projects;
    const names = franchisees
      .filter((user) => nextIds.includes(user.id))
      .map((user) => user.name)
      .join(", ");
    setProjects((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              franchiseeIds: nextIds,
              franchiseeNames: names,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
    try {
      await projectsApi.update(id, { assigneeIds: nextIds });
    } catch {
      setProjects(prev);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            Execution
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={serif}
          >
            Projects
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Track interior work across stores - status, progress, and team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start lg:self-auto">
          <Link
            href="/settings/projects"
            className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748] dark:border-[#3a342c] dark:bg-[#1a1714]"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] hover:bg-black dark:bg-[#e8d5b5] dark:text-[#1c1610]"
          >
            + New project
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-y divide-[#eadfcf] sm:grid-cols-5 sm:divide-x sm:divide-y-0 dark:divide-[#3a342c]">
          {[
            { label: "Total", value: String(stats.total) },
            { label: "Active", value: String(stats.active) },
            { label: "On hold", value: String(stats.onHold), accent: stats.onHold > 0 },
            { label: "Completed", value: String(stats.completed) },
            { label: "Avg progress", value: `${stats.avgProgress}%`, accent: true },
          ].map((s) => (
            <div key={s.label} className="px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">{s.label}</p>
              <p
                className={`mt-1 font-serif text-2xl ${s.accent ? "text-[#9a7748]" : "text-[#1c1610] dark:text-[#f3ece2]"}`}
                style={serif}
              >
                {loading ? "\u2014" : s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
          <div className="relative flex-1 sm:min-w-[220px]">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search project, client, or ID"
              defaultValue={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${fieldClass} pl-10`}
            />
          </div>
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className={`${selectClass} lg:w-44`}>
            {["All Stores", ...storeOptions.map((s) => s.name)].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | ProjectStatus)}
            className={`${selectClass} lg:w-40`}
          >
            <option value="All">All status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${selectClass} lg:w-44`}>
            <option value="All">All types</option>
            {projectTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1400px]">
            <Table>
              <TableHeader className="border-b border-[#f0e8db] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#1c1914]">
                <TableRow>
                  {[
                    "Project",
                    "Client",
                    "Type / Scope",
                    "Store",
                    "Status",
                    "Progress",
                    "Assigned To",
                    "Vendors",
                    "Timeline",
                    "Latest Remark",
                    "Actions",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3.5 text-start text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] whitespace-nowrap"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#f0e8db] dark:divide-[#3a342c]">
                {filtered.map((p) => (
                  <TableRow key={p.id} className="hover:bg-[#fbf8f3] dark:hover:bg-white/[0.03]">
                    <TableCell className="px-4 py-3.5 text-start">
                      <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                        {p.name}
                      </p>
                      <p className="text-xs font-semibold text-[#9a7748]">{p.id.slice(0, 8)}</p>
                      <p className="text-xs text-[#b3a594]">FY {p.financialYear}</p>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-start whitespace-nowrap">
                      <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                        {p.client}
                      </p>
                      <p className="text-xs text-[#8a7b68]">{p.phone}</p>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-start whitespace-nowrap">
                      <p className="text-sm text-[#1c1610] dark:text-[#f3ece2]">
                        {p.projectType}
                      </p>
                      <p className="text-xs text-[#8a7b68]">{p.scope}</p>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-sm text-[#6b645b] whitespace-nowrap">
                      {p.store}
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusChip[p.status]}`}>
                          {p.status}
                        </span>
                        <select
                          value={p.status}
                          onChange={(e) =>
                            updateStatus(
                              p.id,
                              e.target.value as ProjectStatus
                            )
                          }
                          className="h-8 rounded-lg border border-[#eadfcf] bg-[#fdfbf7] px-2 text-xs text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eadfcf] dark:bg-[#3a342c]">
                          <div
                            className="h-full rounded-full bg-[#c4a574] transition-all"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs font-medium text-[#6b645b]">
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
                        className="mt-1 w-full accent-[#c4a574]"
                      />
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      <div className="flex items-center gap-2" title={p.assignedTo}>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1610] text-[11px] font-semibold text-[#e8d5b5]">
                          {initials(p.assignedTo) || "\u2014"}
                        </span>
                        <select
                          value={p.assignedToId || ""}
                          onChange={(e) =>
                            void updateAssignee(p.id, e.target.value)
                          }
                          className="h-8 max-w-[140px] rounded-lg border border-transparent bg-transparent text-xs text-[#6b645b] hover:border-[#eadfcf] focus:border-[#c4a574] focus:outline-hidden dark:text-[#d4c8b8]"
                        >
                          <option value="">Unassigned</option>
                          {p.assignedToId &&
                          !staff.some((u) => u.id === p.assignedToId) ? (
                            <option value={p.assignedToId}>{p.assignedTo}</option>
                          ) : null}
                          {staff.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 min-w-[180px]">
                      <div
                        className="relative"
                        ref={franchiseePickerId === p.id ? franchiseePickerRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setFranchiseePickerId((id) => (id === p.id ? null : p.id))
                          }
                          className="max-w-[160px] truncate text-left text-xs text-[#6b645b] hover:text-[#9a7748]"
                        >
                          {p.franchiseeNames || "Assign vendors"}
                        </button>
                        {franchiseePickerId === p.id ? (
                          <div className="absolute z-30 mt-1 max-h-40 w-56 overflow-y-auto rounded-xl border border-[#eadfcf] bg-white p-2 shadow-lg dark:border-[#3a342c] dark:bg-[#161411]">
                            {franchisees.length ? (
                              franchisees.map((user) => {
                                const checked = p.franchiseeIds.includes(user.id);
                                return (
                                  <label
                                    key={user.id}
                                    className="flex items-center gap-2 rounded-lg px-1 py-1 text-xs text-[#1c1610] dark:text-[#f3ece2]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const next = checked
                                          ? p.franchiseeIds.filter((fid) => fid !== user.id)
                                          : [...p.franchiseeIds, user.id];
                                        void updateFranchisees(p.id, next);
                                      }}
                                    />
                                    {user.name}
                                  </label>
                                );
                              })
                            ) : (
                              <p className="px-1 py-2 text-xs text-[#b3a594]">
                                No vendor accounts yet
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-start whitespace-nowrap">
                      <p className="text-sm text-[#1c1610] dark:text-[#f3ece2]">
                        {p.startDate}
                      </p>
                      <p className="text-xs text-[#b3a594]">
                        to {p.endDate}
                      </p>
                      {p.timelineTasks.slice(0, 2).map((task) => (
                        <p
                          key={task.id}
                          className="mt-1 max-w-[140px] truncate text-[11px] text-[#8a7b68]"
                          title={task.title}
                        >
                          {task.title}
                          <span className="block text-[#b3a594]">
                            {formatDate(task.startDate || "")}
                            {task.dueDate
                              ? ` to ${formatDate(task.dueDate)}`
                              : ""}
                          </span>
                        </p>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTasksProject(p)}
                        className="mt-1.5 text-left text-xs font-semibold text-[#9a7748] hover:text-[#1c1610]"
                      >
                        + Add task
                      </button>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 max-w-[220px]">
                      <p className="line-clamp-2 text-sm text-[#8a7b68]">
                        {p.latestRemark || "\u2014"}
                      </p>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="text-left text-sm font-semibold text-[#9a7748] hover:text-[#1c1610]"
                        >
                          Edit
                        </button>
                        <Link
                          href="/design/designing"
                          className="text-sm text-[#8a7b68] hover:text-[#1c1610]"
                        >
                          Design
                        </Link>
                        <Link
                          href={`/sales/quotations/new?from=project&id=${p.id}`}
                          className="text-sm text-[#8a7b68] hover:text-[#1c1610]"
                        >
                          Quotation
                        </Link>
                        <Link
                          href={`/customer-issues?projectId=${p.id}`}
                          className="text-sm text-[#8a7b68] hover:text-[#1c1610]"
                        >
                          Issue
                        </Link>
                        <button
                          type="button"
                          onClick={() => setTasksProject(p)}
                          className="text-left text-sm text-[#8a7b68] hover:text-[#1c1610]"
                        >
                          Tasks{p.taskCount ? ` (${p.taskCount})` : ""}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-16 text-center">
                      <p className="font-serif text-xl text-[#1c1610] dark:text-[#f4efe6]" style={serif}>
                        {loading ? "Loading projects..." : "No projects match your filters"}
                      </p>
                      {!loading ? (
                        <p className="mt-1 text-sm text-[#8a7b68]">Try a different search, store, or status.</p>
                      ) : null}
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#eadfcf] bg-white p-0 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-0 flex items-center justify-between border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c] dark:bg-[#1c1914]">
              <div>
                <h3 className="font-serif text-lg text-[#1c1610] dark:text-[#f3ece2]" style={serif}>
                  {editing ? "Edit project" : "New project"}
                </h3>
                {sourceLeadId && !editing ? (
                  <p className="mt-1 text-sm text-[#9a7748]">
                    From lead: {sourceLeadClientName} - review and save to link
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
                className="text-[#8a7b68] hover:text-[#1c1610]"
              >
                {"\u00D7"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Project name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Enter project name"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Client name</label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client: e.target.value }))
                  }
                  placeholder="Client name"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+91 ..."
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Store</label>
                <select
                  value={form.store}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, store: e.target.value }))
                  }
                  className={selectClass}
                >
                  {storeOptions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Project type</label>
                <select
                  value={form.projectType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, projectType: e.target.value }))
                  }
                  className={selectClass}
                >
                  {projectTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Scope</label>
                <select
                  value={form.scope}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scope: e.target.value }))
                  }
                  className={selectClass}
                >
                  {scopes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Budget</label>
                <input
                  type="text"
                  value={form.budget}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, budget: e.target.value }))
                  }
                  placeholder={"e.g. \u20B912 Lakh"}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>DLP holding %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.dlpHoldingPercent}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dlpHoldingPercent: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="20"
                  className={fieldClass}
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Held from vendor project value. 20% of 100 = ₹20 DLP, ₹80 payment.
                </p>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as ProjectStatus,
                    }))
                  }
                  className={selectClass}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Progress (%)</label>
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
                <label className={labelClass}>Sales owner</label>
                <select
                  value={form.salesOwner}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, salesOwner: e.target.value }))
                  }
                  className={selectClass}
                >
                  {team.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Assigned to</label>
                <select
                  value={form.assignedToId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const name = staff.find((u) => u.id === id)?.name || "";
                    setForm((f) => ({ ...f, assignedToId: id, assignedTo: name }));
                  }}
                  className={selectClass}
                >
                  <option value="">Unassigned</option>
                  {form.assignedToId &&
                  !staff.some((u) => u.id === form.assignedToId) ? (
                    <option value={form.assignedToId}>
                      {form.assignedTo || "Assigned"}
                    </option>
                  ) : null}
                  {staff.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#b3a594]">
                  CRM staff owner. Separate from vendors.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Assign to vendors</label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[#eadfcf] bg-[#fdfbf7] p-2 dark:border-[#3a342c] dark:bg-[#1a1714]">
                  {franchisees.length ? (
                    franchisees.map((user) => {
                      const checked = form.franchiseeIds.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 text-sm text-[#1c1610] dark:text-[#f3ece2]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                franchiseeIds: checked
                                  ? f.franchiseeIds.filter((id) => id !== user.id)
                                  : [...f.franchiseeIds, user.id],
                              }))
                            }
                          />
                          {user.name}
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs text-[#b3a594]">No vendor accounts yet</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#b3a594]">
                  One project can be assigned to multiple vendors. This does not change Assigned To.
                </p>
              </div>
              <div>
                <label className={labelClass}>Start date</label>
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
                <label className={labelClass}>End date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Site address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Project / site address"
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Write a description..."
                  className="w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Latest remark</label>
                <textarea
                  rows={2}
                  value={form.latestRemark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, latestRemark: e.target.value }))
                  }
                  placeholder="Write your remark..."
                  className="w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#eadfcf] px-6 py-4 dark:border-[#3a342c]">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setEditing(null);
                }}
                className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1a1714]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProject}
                disabled={!form.name.trim() || !form.client.trim()}
                className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              >
                {editing ? "Save changes" : "Create project"}
              </button>
            </div>
          </div>
        </div>
      )}


      {tasksProject ? (
        <ProjectTasksPanel
          project={tasksProject}
          onClose={() => setTasksProject(null)}
          onCountChange={(count) =>
            setProjects((current) =>
              current.map((p) =>
                p.id === tasksProject.id ? { ...p, taskCount: count } : p
              )
            )
          }
          onTasksChange={(timelineTasks) =>
            setProjects((current) =>
              current.map((p) =>
                p.id === tasksProject.id ? { ...p, timelineTasks } : p
              )
            )
          }
        />
      ) : null}
    </div>
  );
}
