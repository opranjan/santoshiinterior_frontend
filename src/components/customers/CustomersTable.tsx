"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  customersApi,
  storesApi,
  type CustomerDto,
} from "@/services/crmApi";
import { enumToLabel, labelToEnum } from "@/lib/mappers";

type CustomerStatus = "Active" | "Lead" | "Inactive" | "VIP";
type CustomerType = "Individual" | "Family" | "Company";

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

const statusColor: Record<
  CustomerStatus,
  "success" | "info" | "light" | "warning"
> = {
  Active: "success",
  Lead: "info",
  Inactive: "light",
  VIP: "warning",
};

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
            projects: 0,
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
    return { total: customers.length, active, leads, vip, value };
  }, [customers]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500">Loading customers...</div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Customers
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Profiles, project history, and ownership across stores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales/leads">
            <Button size="sm" variant="outline">
              Leads
            </Button>
          </Link>
          <Link href="/projects">
            <Button size="sm" variant="outline">
              Projects
            </Button>
          </Link>
          <Button size="sm" onClick={openAdd}>
            + Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Total</p>
          <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Active</p>
          <p className="mt-1 text-xl font-semibold text-success-600">
            {stats.active}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Leads</p>
          <p className="mt-1 text-xl font-semibold text-brand-600">
            {stats.leads}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">VIP</p>
          <p className="mt-1 text-xl font-semibold text-warning-600">
            {stats.vip}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Lifetime Value</p>
          <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            {formatMoney(stats.value)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex-1 sm:max-w-xs">
          <Input
            type="text"
            placeholder="Search name, phone, email, city…"
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
            setStatusFilter(e.target.value as "All" | CustomerStatus)
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
            setTypeFilter(e.target.value as "All" | CustomerType)
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
          <div className="min-w-[1300px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {[
                    "Customer",
                    "Contact",
                    "Store / City",
                    "Type",
                    "Status",
                    "Owner",
                    "Projects",
                    "Value",
                    "Last Contact",
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
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="px-4 py-3 text-start">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
                          {initials(c.name)}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {c.name}
                          </p>
                          <p className="text-xs text-gray-400">{c.id}</p>
                          {c.tags && (
                            <p className="text-xs text-gray-400">{c.tags}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                      <p className="text-sm text-gray-800 dark:text-white/90">
                        {c.phone}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.email || "—"}
                      </p>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {c.store}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.city || "—"}
                      </p>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {c.type}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <Badge size="sm" color={statusColor[c.status]}>
                          {c.status}
                        </Badge>
                        <select
                          value={c.status}
                          onChange={(e) =>
                            updateStatus(
                              c.id,
                              e.target.value as CustomerStatus
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
                        value={c.owner}
                        onChange={(e) => updateOwner(c.id, e.target.value)}
                        className="h-8 max-w-[130px] rounded-md border border-gray-200 bg-transparent px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        {owners.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {c.projects}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                      {formatMoney(c.totalValue)}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(c.lastContact)}
                    </TableCell>

                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="text-left text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => touchContact(c.id)}
                          className="text-left text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                        >
                          Log Contact
                        </button>
                        <Link
                          href="/projects"
                          className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                        >
                          Projects
                        </Link>
                        <Link
                          href="/sales/quotations/new"
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
                      No customers match your filters.
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
    </div>
  );
}
