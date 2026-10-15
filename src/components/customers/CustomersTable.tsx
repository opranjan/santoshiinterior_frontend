"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  customersApi,
  storesApi,
  type CustomerDto,
  type CustomerMessageKind,
  type CustomerWebsiteShop,
} from "@/services/crmApi";
import { enumToLabel, labelToEnum } from "@/lib/mappers";
import CustomerSendModal from "@/components/customers/CustomerSendModal";

type CustomerStatus = "Active" | "Lead" | "Inactive" | "VIP";
type CustomerType = "Individual" | "Family" | "Company";

function actionsMenuPosition(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const menuHeight = 430;
  const menuWidth = 280;
  let top = rect.bottom + 8;
  if (top + menuHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - menuHeight - 8);
  }
  let right = window.innerWidth - rect.right;
  if (window.innerWidth - right < menuWidth + 8) {
    right = 8;
  }
  return { top, right };
}

const actionIconClass =
  "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F3E8DA] text-[#6B4423]";

function ActionMenuItem({
  href,
  onClick,
  label,
  icon,
  iconWrapClass,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  iconWrapClass?: string;
}) {
  const className =
    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-[15px] font-medium text-[#1a1410] hover:bg-[#F7F1E8]";
  const inner = (
    <>
      <span className={iconWrapClass ?? actionIconClass}>{icon}</span>
      <span className="flex-1">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#c9b8a4]" aria-hidden>
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  );
}

type Customer = {
  id: string;
  name: string;
  phone: string;
  alternatePhone: string;
  email: string;
  store: string;
  type: CustomerType;
  status: CustomerStatus;
  city: string;
  address: string;
  source: string;
  projects: number;
  totalValue: number;
  owner: string;
  tags: string;
  notes: string;
  createdAt: string;
  lastContact: string;
};

const statuses: CustomerStatus[] = ["Active", "Lead", "Inactive", "VIP"];
const types: CustomerType[] = ["Individual", "Family", "Company"];
const sources = [
  "Walk-in",
  "Referral",
  "Website",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Exhibition",
  "Other",
];
const owners = [
  "Mukesh singh",
  "Rahul Sharma",
  "Priya Mehta",
  "Amit Verma",
  "Sneha Patel",
  "Vikram Singh",
];

const initialCustomers: Customer[] = [
  {
    id: "CUS-201",
    name: "Neha & Rohan Desai",
    phone: "+91 90909 80808",
    alternatePhone: "",
    email: "desai@email.com",
    store: "Main Branch",
    type: "Family",
    status: "Active",
    city: "Indore",
    address: "Scheme 54, Indore",
    source: "WhatsApp",
    projects: 1,
    totalValue: 1200000,
    owner: "Vikram Singh",
    tags: "residential, hotspot",
    notes: "Execution ongoing · prefer evening calls",
    createdAt: "2026-06-01",
    lastContact: "2026-07-28",
  },
  {
    id: "CUS-202",
    name: "TechNest Pvt Ltd",
    phone: "+91 91234 56789",
    alternatePhone: "+91 91234 56780",
    email: "ops@technest.in",
    store: "Main Branch",
    type: "Company",
    status: "VIP",
    city: "Indore",
    address: "Vijay Nagar, Indore",
    source: "Website",
    projects: 1,
    totalValue: 6200000,
    owner: "Rahul Sharma",
    tags: "b2b, office",
    notes: "MD prefers email updates with BOQ",
    createdAt: "2026-07-10",
    lastContact: "2026-07-29",
  },
  {
    id: "CUS-203",
    name: "Rajesh Malhotra",
    phone: "+91 98111 22334",
    alternatePhone: "",
    email: "rajesh@email.com",
    store: "North Store",
    type: "Individual",
    status: "Active",
    city: "Bhopal",
    address: "Arera Colony, Bhopal",
    source: "Referral",
    projects: 1,
    totalValue: 3000000,
    owner: "Priya Mehta",
    tags: "villa, hot",
    notes: "Kickoff scheduled · modular kitchen priority",
    createdAt: "2026-07-20",
    lastContact: "2026-07-28",
  },
  {
    id: "CUS-204",
    name: "Meera Joshi",
    phone: "+91 99887 66554",
    alternatePhone: "",
    email: "meera@email.com",
    store: "South Store",
    type: "Individual",
    status: "Active",
    city: "Ujjain",
    address: "Freeganj, Ujjain",
    source: "Walk-in",
    projects: 1,
    totalValue: 800000,
    owner: "Amit Verma",
    tags: "renovation",
    notes: "Material delay · keep informed",
    createdAt: "2026-07-05",
    lastContact: "2026-07-27",
  },
  {
    id: "CUS-205",
    name: "Ananya Kapoor",
    phone: "+91 98765 43210",
    alternatePhone: "",
    email: "ananya@email.com",
    store: "Main Branch",
    type: "Individual",
    status: "VIP",
    city: "Indore",
    address: "Palm Court, Indore",
    source: "Instagram",
    projects: 1,
    totalValue: 5500000,
    owner: "Mukesh singh",
    tags: "penthouse, warranty",
    notes: "Handover done · warranty active",
    createdAt: "2025-11-01",
    lastContact: "2026-07-25",
  },
  {
    id: "CUS-206",
    name: "Suresh Agarwal",
    phone: "+91 97654 32109",
    alternatePhone: "",
    email: "",
    store: "North Store",
    type: "Individual",
    status: "Lead",
    city: "Indore",
    address: "AB Road, Indore",
    source: "Exhibition",
    projects: 1,
    totalValue: 2800000,
    owner: "Sneha Patel",
    tags: "showroom, on-hold",
    notes: "Project on hold · waiting advance",
    createdAt: "2026-05-18",
    lastContact: "2026-07-20",
  },
  {
    id: "CUS-207",
    name: "Ravi Mvr",
    phone: "+91 96434 69755",
    alternatePhone: "",
    email: "",
    store: "Main Branch",
    type: "Individual",
    status: "Lead",
    city: "Indore",
    address: "",
    source: "Instagram",
    projects: 0,
    totalValue: 0,
    owner: "Mukesh singh",
    tags: "new",
    notes: "Fresh lead · follow up needed",
    createdAt: "2026-07-26",
    lastContact: "2026-07-26",
  },
];

function formatMoney(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

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
  return new Date().toISOString();
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusPill(status: CustomerStatus) {
  if (status === "Active") return "bg-[#E7F6EC] text-[#2F7D3A]";
  if (status === "VIP") return "bg-[#F6EDE0] text-[#7A4A28]";
  if (status === "Lead") return "bg-[#E8F0FB] text-[#3B6EA8]";
  return "bg-[#F3EEE6] text-[#6b5b4b]";
}

function GhostBtn({
  children,
  onClick,
  disabled,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
}) {
  const className =
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[#eadfcf] bg-white px-3 text-sm font-medium text-[#3d342c] disabled:opacity-40";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

const selectClass =
  "h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [storeOptions, setStoreOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [statusFilter, setStatusFilter] = useState<"All" | CustomerStatus>(
    "All"
  );
  const [typeFilter, setTypeFilter] = useState<"All" | CustomerType>("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendKind, setSendKind] = useState<CustomerMessageKind | null>(null);
  const [websiteShop, setWebsiteShop] = useState<CustomerWebsiteShop | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const emptyForm = {
    name: "",
    phone: "",
    alternatePhone: "",
    email: "",
    store: "Main Branch",
    type: "Individual" as CustomerType,
    status: "Lead" as CustomerStatus,
    city: "",
    address: "",
    source: "Walk-in",
    owner: owners[0],
    tags: "",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [customerData, storeData] = await Promise.allSettled([
          customersApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;

        if (customerData.status === "rejected") {
          throw customerData.reason;
        }

        if (storeData.status === "fulfilled") {
          setStoreOptions(
            storeData.value.items.map((s) => ({ id: s.id, name: s.name }))
          );
          if (storeData.value.items[0]) {
            setForm((prev) => ({ ...prev, store: storeData.value.items[0].name }));
          }
        }

        setCustomers(
          customerData.value.items.map((dto: CustomerDto): Customer => ({
            id: dto.id,
            name: dto.name,
            phone: dto.phone,
            alternatePhone: dto.alternatePhone || "",
            email: dto.email || "",
            store: dto.store?.name || "",
            type: (enumToLabel(dto.type) || "Individual") as CustomerType,
            status: (enumToLabel(dto.status) || "Lead") as CustomerStatus,
            city: dto.city || "",
            address: dto.address || "",
            source: dto.source || "",
            projects: dto._count?.projects || 0,
            totalValue: 0,
            owner: dto.owner?.name || "",
            tags: dto.tags || "",
            notes: dto.notes || "",
            createdAt: formatDate(dto.createdAt),
            lastContact: formatDate(dto.lastContact || ""),
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load customers"
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

  useEffect(() => {
    setPage(1);
  }, [search, storeFilter, statusFilter, typeFilter]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-actions-menu]")) return;
      setMenuId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!menuId) return;
    const sync = () => {
      const trigger = document.querySelector<HTMLElement>(
        `[data-actions-trigger="${menuId}"]`
      );
      if (!trigger) return;
      setMenuPos(actionsMenuPosition(trigger));
    };
    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [menuId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchSearch =
        !q ||
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.tags.toLowerCase().includes(q);
      const matchStore =
        storeFilter === "All Stores" || c.store === storeFilter;
      const matchStatus =
        statusFilter === "All" || c.status === statusFilter;
      const matchType = typeFilter === "All" || c.type === typeFilter;
      return matchSearch && matchStore && matchStatus && matchType;
    });
  }, [customers, search, storeFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const active = customers.filter((c) => c.status === "Active").length;
    const leads = customers.filter((c) => c.status === "Lead").length;
    const vip = customers.filter((c) => c.status === "VIP").length;
    const value = customers.reduce((s, c) => s + c.totalValue, 0);
    const activePct = customers.length ? Math.round((active / customers.length) * 100) : 0;
    return { total: customers.length, active, leads, vip, value, activePct };
  }, [customers]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const showingFrom = filtered.length ? (page - 1) * pageSize + 1 : 0;
  const showingTo = Math.min(page * pageSize, filtered.length);

  const openAdd = () => {
    setEditing(null);
    setWebsiteShop(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setWebsiteShop(null);
    customersApi
      .get(c.id)
      .then((dto) => setWebsiteShop(dto.websiteShop || null))
      .catch(() => setWebsiteShop(null));
    setForm({
      name: c.name,
      phone: c.phone,
      alternatePhone: c.alternatePhone,
      email: c.email,
      store: c.store,
      type: c.type,
      status: c.status,
      city: c.city,
      address: c.address,
      source: c.source,
      owner: c.owner,
      tags: c.tags,
      notes: c.notes,
    });
    setShowForm(true);
  };

  const saveCustomer = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;

    const storeId =
      storeOptions.find((s) => s.name === form.store)?.id || null;

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim() || null,
      email: form.email.trim() || null,
      storeId,
      type: labelToEnum(form.type),
      status: labelToEnum(form.status),
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      source: form.source,
      tags: form.tags.trim() || null,
      notes: form.notes.trim() || null,
      lastContact: todayIso(),
    };

    try {
      if (editing) {
        const updated = await customersApi.update(editing.id, payload);
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  name: updated.name,
                  phone: updated.phone,
                  alternatePhone: updated.alternatePhone || "",
                  email: updated.email || "",
                  store: updated.store?.name || form.store,
                  type: (enumToLabel(updated.type) || form.type) as CustomerType,
                  status: (enumToLabel(updated.status) ||
                    form.status) as CustomerStatus,
                  city: updated.city || "",
                  address: updated.address || "",
                  source: updated.source || "",
                  tags: updated.tags || "",
                  notes: updated.notes || "",
                  lastContact: formatDate(updated.lastContact || ""),
                }
              : c
          )
        );
      } else {
        const created = await customersApi.create(payload);
        setCustomers((prev) => [
          {
            id: created.id,
            name: created.name,
            phone: created.phone,
            alternatePhone: created.alternatePhone || "",
            email: created.email || "",
            store: created.store?.name || form.store,
            type: (enumToLabel(created.type) || form.type) as CustomerType,
            status: (enumToLabel(created.status) ||
              form.status) as CustomerStatus,
            city: created.city || "",
            address: created.address || "",
            source: created.source || "",
            projects: 0,
            totalValue: 0,
            owner: created.owner?.name || form.owner,
            tags: created.tags || "",
            notes: created.notes || "",
            createdAt: formatDate(created.createdAt),
            lastContact: formatDate(created.lastContact || ""),
          },
          ...prev,
        ]);
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer");
    }
  };

  const updateStatus = async (id: string, status: CustomerStatus) => {
    const prev = customers;
    setCustomers((current) =>
      current.map((c) =>
        c.id === id ? { ...c, status, lastContact: todayIso() } : c
      )
    );
    try {
      await customersApi.update(id, { status: labelToEnum(status) });
    } catch {
      setCustomers(prev);
    }
  };

  const updateOwner = (id: string, owner: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, owner, lastContact: todayIso() } : c
      )
    );
  };

  const touchContact = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, lastContact: todayIso() } : c
      )
    );
  };

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedIds.includes(c.id)),
    [customers, selectedIds]
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]
    );
  };

  const toggleAllFiltered = () => {
    const ids = filtered.map((c) => c.id);
    const allOn = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allOn ? selectedIds.filter((id) => !ids.includes(id)) : ids);
  };

  const openSend = (kind: CustomerMessageKind, ids?: string[]) => {
    const next = ids || selectedIds;
    if (!next.length) {
      setError("Select at least one customer to send a message.");
      return;
    }
    if (kind === "whatsapp" && next.length > 1) {
      setError("Pick one customer for WhatsApp, or use Broadcast for many.");
      return;
    }
    setError("");
    setSelectedIds(next);
    setSendKind(kind);
  };

  const activePct = stats.activePct;
  const filterClass =
    "h-10 min-w-0 flex-1 rounded-md border-0 bg-transparent px-2 text-sm text-[#3d342c] outline-none sm:flex-none";

  return (
    <div className="-mx-4 min-h-full min-w-0 overflow-x-hidden bg-[#F7F1E8] px-3.5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-1 sm:px-8 md:-mx-6 xl:px-10">
      <nav className="mb-4 flex items-center gap-2 text-sm text-[#8a7b68]">
        <Link href="/" className="hover:text-[#7A4A28]">Home</Link>
        <span>›</span>
        <span className="font-medium text-[#1c1610]">Customers</span>
      </nav>

      {error ? (
        <div className="mb-4 rounded-xl bg-[#FDE8EC] px-4 py-3 text-sm text-[#C45C4A]">{error}</div>
      ) : null}

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1c1610]">Customers</h1>
          <p className="mt-1 text-sm text-[#8a7b68]">Profiles, project history, and ownership across stores.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostBtn href="/sales/leads">Leads</GhostBtn>
          <GhostBtn href="/projects">Projects</GhostBtn>
          <GhostBtn onClick={() => openSend("whatsapp")} disabled={selectedIds.length !== 1}>
            WhatsApp
          </GhostBtn>
          <GhostBtn onClick={() => openSend("broadcast")} disabled={selectedIds.length === 0}>
            Broadcast
          </GhostBtn>
          <GhostBtn onClick={() => openSend("marketing")} disabled={selectedIds.length === 0}>
            Marketing
          </GhostBtn>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 items-center rounded-md bg-[#7A4A28] px-4 text-sm font-semibold text-white"
          >
            + Add Customer
          </button>
        </div>
      </div>

      {loading ? <p className="mb-4 text-sm text-[#8a7b68]">Loading customers…</p> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white px-4 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F4EDE3] text-[#7A4A28]">👤</span>
          <div>
            <p className="text-xs text-[#8a7b68]">Total</p>
            <p className="text-2xl font-semibold text-[#1c1610]">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfcf] bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E7F6EC] text-[#2F7D3A]">👤</span>
            <div>
              <p className="text-xs text-[#8a7b68]">Active</p>
              <p className="text-2xl font-semibold text-[#1c1610]">{stats.active}</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-[#2F7D3A]">↗ {activePct}%</p>
            <svg width="72" height="28" viewBox="0 0 72 28" className="text-[#7BC47F]">
              <path d="M0 20 C14 20 14 10 24 12 S40 4 48 10 S64 18 72 8" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white px-4 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EEF3FB] text-[#3B6EA8]">◎</span>
          <div>
            <p className="text-xs text-[#8a7b68]">Leads</p>
            <p className="text-2xl font-semibold text-[#1c1610]">{stats.leads}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white px-4 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F6EDE0] text-[#7A4A28]">♛</span>
          <div>
            <p className="text-xs text-[#8a7b68]">VIP</p>
            <p className="text-2xl font-semibold text-[#1c1610]">{stats.vip}</p>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white px-4 py-4 xl:col-span-1">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F4EDE3] text-[#7A4A28]">₹</span>
          <div>
            <p className="text-xs text-[#8a7b68]">Lifetime Value</p>
            <p className="text-2xl font-semibold text-[#1c1610]">{formatMoney(stats.value)}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-[#eadfcf] bg-white p-2 sm:flex-row sm:items-center sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <span className="text-[#8a7b68]">⌕</span>
          <input
            type="text"
            placeholder="Search name, phone, email, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full bg-transparent text-sm text-[#1c1610] outline-none placeholder:text-[#b5a89a]"
          />
        </div>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className={filterClass}
        >
          {["All Stores", ...storeOptions.map((s) => s.name)].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | CustomerStatus)}
          className={filterClass}
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
          onChange={(e) => setTypeFilter(e.target.value as "All" | CustomerType)}
          className={filterClass}
        >
          <option value="All">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-white">
        <div className="max-w-full overflow-x-auto overflow-y-visible">
          <div className="min-w-[1280px]">
            <Table>
              <TableHeader className="border-b border-[#f0e6d8]">
                <TableRow>
                  <TableCell isHeader className="px-4 py-3 text-start">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id))}
                      onChange={toggleAllFiltered}
                      aria-label="Select all customers"
                      className="h-4 w-4 rounded border-[#eadfcf]"
                    />
                  </TableCell>
                  {["Customer", "Contact", "Store / City", "Type", "Status", "Owner", "Projects", "Value", "Last Contact", "Actions"].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3 text-start text-xs font-medium whitespace-nowrap text-[#8a7b68]"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#f3ebe0]">
                {paged.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelected(c.id)}
                        aria-label={`Select ${c.name}`}
                        className="h-4 w-4 rounded border-[#eadfcf]"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-4 text-start">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFE4D4] text-xs font-semibold text-[#7A4A28]">
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/customers/${c.id}`} className="text-sm font-semibold text-[#1c1610] hover:text-[#7A4A28]">
                            {c.name}
                          </Link>
                          <p className="max-w-[148px] break-all text-[11px] leading-4 text-[#b5a89a]">{c.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-start whitespace-nowrap">
                      <p className="flex items-center gap-1.5 text-sm text-[#3d342c]">
                        <span className="text-[#C4A574]">☎</span> {c.phone}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#8a7b68]">
                        <span className="text-[#C4A574]">✉</span> {c.email || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-start whitespace-nowrap">
                      <p className="flex items-center gap-1.5 text-sm text-[#3d342c]">
                        <span className="text-[#C4A574]">📍</span> {c.city || c.store || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-[#6b5b4b] whitespace-nowrap">{c.type}</TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="relative inline-flex">
                        <select
                          value={c.status}
                          onChange={(e) => updateStatus(c.id, e.target.value as CustomerStatus)}
                          className={`appearance-none rounded-full py-1 pl-3 pr-7 text-xs font-medium ${statusPill(c.status)}`}
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-70">▾</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EFE4D4] text-[10px] font-semibold text-[#7A4A28]">
                          {initials(c.owner || "NA")}
                        </span>
                        <select
                          value={c.owner}
                          onChange={(e) => updateOwner(c.id, e.target.value)}
                          className="max-w-[120px] bg-transparent text-sm text-[#3d342c] outline-none"
                        >
                          {c.owner && !owners.includes(c.owner) ? <option value={c.owner}>{c.owner}</option> : null}
                          {owners.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-[#3d342c]">{c.projects}</TableCell>
                    <TableCell className="px-4 py-4 text-sm font-medium text-[#1c1610] whitespace-nowrap">
                      {formatMoney(c.totalValue)}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-[#6b5b4b] whitespace-nowrap">
                      {c.lastContact || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap" data-actions-menu>
                      <button
                        type="button"
                        data-actions-trigger={c.id}
                        className="grid h-8 w-8 place-items-center rounded-md text-[#8a7b68] hover:bg-[#F6EDE0]"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (menuId === c.id) {
                            setMenuId(null);
                            return;
                          }
                          setMenuPos(actionsMenuPosition(event.currentTarget));
                          setMenuId(c.id);
                        }}
                        aria-label={`Actions for ${c.name}`}
                      >
                        ⋯
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-sm text-[#8a7b68]">
                      No customers match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0e6d8] px-4 py-3 text-sm text-[#8a7b68]">
          <p>
            Showing {showingFrom} to {showingTo} of {filtered.length} customers
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
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`grid h-8 w-8 place-items-center rounded-md text-sm ${
                  n === page ? "bg-[#7A4A28] text-white" : "border border-[#eadfcf] text-[#3d342c]"
                }`}
              >
                {n}
              </button>
            ))}
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
      </div>

      {menuId
        ? (() => {
            const menuCustomer = customers.find((item) => item.id === menuId);
            if (!menuCustomer) return null;
            return (
              <div
                data-actions-menu
                className="fixed z-[80] w-[280px] overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#FBF8F3] py-2 shadow-[0_12px_40px_rgba(80,50,20,0.14)]"
                style={{ top: menuPos.top, right: menuPos.right }}
              >
                <p className="px-4 pb-1 pt-2 text-[11px] font-semibold tracking-[0.14em] text-[#C4A574]">
                  CUSTOMER ACTIONS
                </p>
                <ActionMenuItem
                  href={`/customers/${menuCustomer.id}`}
                  onClick={() => setMenuId(null)}
                  label="View"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  }
                />
                <ActionMenuItem
                  onClick={() => {
                    setMenuId(null);
                    openEdit(menuCustomer);
                  }}
                  label="Edit"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 20h4.5L19 9.5a2.1 2.1 0 0 0 0-3L17.5 5a2.1 2.1 0 0 0-3 0L4 15.5V20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <div className="mx-3 my-1 border-t border-[#eadfcf]" />
                <ActionMenuItem
                  onClick={() => {
                    setMenuId(null);
                    openSend("whatsapp", [menuCustomer.id]);
                  }}
                  label="WhatsApp"
                  iconWrapClass="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#E7F6EA] text-[#25D366]"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.82c0 1.74.46 3.44 1.32 4.94L2 22l5.4-1.4a10.1 10.1 0 0 0 4.64 1.12h.04c5.46 0 9.89-4.4 9.89-9.82C21.97 6.4 17.5 2 12.04 2Zm5.74 14.16c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.14-1.8-.12-.42-.16-.95-.3-1.64-.6-2.88-1.24-4.76-4.16-4.9-4.36-.14-.2-1.16-1.54-1.16-2.94s.74-2.08 1-2.36c.24-.28.54-.36.72-.36h.52c.16 0 .4-.06.62.48.24.56.8 1.94.86 2.08.08.14.12.3.02.48-.1.18-.14.3-.28.46-.14.16-.3.36-.42.48-.14.14-.28.3-.12.58.16.28.72 1.18 1.54 1.92 1.06.94 1.94 1.24 2.22 1.38.28.14.44.12.6-.06.16-.18.7-.82.88-1.1.18-.28.36-.24.6-.14.24.1 1.54.72 1.8.86.26.14.44.2.5.32.06.12.06.68-.18 1.36Z" />
                    </svg>
                  }
                />
                <ActionMenuItem
                  onClick={() => {
                    setMenuId(null);
                    openSend("marketing", [menuCustomer.id]);
                  }}
                  label="Marketing"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 10h3l9-5v14l-9-5H4v-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                      <path d="M9.5 14.2 8 19h2.4l1.4-3.4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <ActionMenuItem
                  onClick={() => {
                    setMenuId(null);
                    touchContact(menuCustomer.id);
                  }}
                  label="Log Contact"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M7.5 4.5h2.2l1 4.2-1.7 1a12 12 0 0 0 5.3 5.3l1-1.7 4.2 1v2.2c0 .8-.6 1.5-1.4 1.6A16.5 16.5 0 0 1 5.9 5.9c.1-.8.8-1.4 1.6-1.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <div className="mx-3 my-1 border-t border-[#eadfcf]" />
                <ActionMenuItem
                  href="/projects"
                  onClick={() => setMenuId(null)}
                  label="Projects"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M3.5 8.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-10Z" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M3.5 8.5 5.8 4.8A1.5 1.5 0 0 1 7.1 4h3.2c.5 0 .9.2 1.2.6L13 8.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <ActionMenuItem
                  href="/sales/quotations/new"
                  onClick={() => setMenuId(null)}
                  label="Quotation"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M7 3.5h7.5L19.5 9v11.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                      <path d="M14.5 3.5V9h5.5M8.5 13h7M8.5 16.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>
            );
          })()
        : null}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editing ? "Edit Customer" : "Add Customer"}
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
                <Label>Full Name</Label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Customer / company name"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Phone / WhatsApp</Label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+91 …"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Alternate Phone</Label>
                <input
                  type="tel"
                  value={form.alternatePhone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      alternatePhone: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Email</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                  className={fieldClass}
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
                <Label>Type</Label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as CustomerType,
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
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as CustomerStatus,
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
                <Label>Source</Label>
                <select
                  value={form.source}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, source: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Owner</Label>
                <select
                  value={form.owner}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, owner: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>City</Label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="City"
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Full address"
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Tags</Label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tags: e.target.value }))
                  }
                  placeholder="e.g. residential, hot"
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Internal notes…"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            {websiteShop ? (
              <div className="mt-6 space-y-4 rounded-xl border border-[#eadfcf] bg-[#FBF7F1] p-4">
                <div>
                  <p className="text-sm font-semibold text-[#1c1610]">Website account</p>
                  <p className="mt-1 text-xs text-[#6b5b4b]">
                    {websiteShop.account
                      ? `${websiteShop.account.email}${
                          websiteShop.account.lastLoginAt
                            ? ` · last login ${formatDate(websiteShop.account.lastLoginAt)}`
                            : ""
                        }`
                      : "No website login linked"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7b68]">Addresses</p>
                  {websiteShop.addresses.length ? (
                    <div className="mt-2 space-y-2">
                      {websiteShop.addresses.map((row) => (
                        <p key={row.id} className="text-sm text-[#3d342c]">
                          {row.name} · {row.line1}, {row.city} {row.pin}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-[#8a7b68]">No saved addresses</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7b68]">Cart ({websiteShop.cart.length})</p>
                    {websiteShop.cart.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-[#3d342c]">
                        {websiteShop.cart.map((row) => (
                          <li key={row.id}>
                            {row.title} × {row.quantity}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-[#8a7b68]">Empty</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7b68]">Wishlist ({websiteShop.wishlist.length})</p>
                    {websiteShop.wishlist.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-[#3d342c]">
                        {websiteShop.wishlist.map((row) => (
                          <li key={row.id}>{row.title}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-[#8a7b68]">Empty</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7b68]">Orders ({websiteShop.orders.length})</p>
                  {websiteShop.orders.length ? (
                    <div className="mt-2 space-y-2">
                      {websiteShop.orders.map((row) => (
                        <div key={row.id} className="flex items-center justify-between text-sm text-[#3d342c]">
                          <span>
                            {row.orderNumber} · {row.status}
                          </span>
                          <span>₹{Number(row.total).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-[#8a7b68]">No website orders yet</p>
                  )}
                </div>
              </div>
            ) : null}

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
                onClick={saveCustomer}
                disabled={!form.name.trim() || !form.phone.trim()}
              >
                {editing ? "Save Changes" : "Add Customer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CustomerSendModal
        open={Boolean(sendKind)}
        kind={sendKind || "whatsapp"}
        customers={selectedCustomers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        }))}
        onClose={() => setSendKind(null)}
        onSent={(iso) => {
          const stamp = formatDate(iso);
          setCustomers((prev) =>
            prev.map((c) =>
              selectedIds.includes(c.id) ? { ...c, lastContact: stamp } : c
            )
          );
        }}
      />
    </div>
  );
}
