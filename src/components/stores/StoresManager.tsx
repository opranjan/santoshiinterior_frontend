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
import { storesApi, type StoreDto } from "@/services/crmApi";
import { enumToLabel, formatDate as toIsoDate, labelToEnum } from "@/lib/mappers";

type StoreStatus = "Active" | "Inactive" | "Coming Soon";

type Store = {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  staffCount: number;
  openLeads: number;
  activeProjects: number;
  monthlyRevenue: number;
  status: StoreStatus;
  openedOn: string;
};

const mapStore = (dto: StoreDto): Store => {
  const statusLabel = enumToLabel(dto.status);
  const status: StoreStatus =
    statusLabel === "Coming Soon"
      ? "Coming Soon"
      : statusLabel === "Inactive"
        ? "Inactive"
        : "Active";

  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    city: dto.city,
    address: dto.address || "",
    phone: dto.phone,
    email: dto.email || "",
    manager: dto.manager?.name || "Unassigned",
    staffCount: 0,
    openLeads: 0,
    activeProjects: 0,
    monthlyRevenue: 0,
    status,
    openedOn: toIsoDate(dto.openedOn) || "",
  };
};
const statusColor: Record<StoreStatus, "success" | "error" | "warning"> = {
  Active: "success",
  Inactive: "error",
  "Coming Soon": "warning",
};

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function StoresManager() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [statusFilter, setStatusFilter] = useState<"All" | StoreStatus>("All");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await storesApi.list({ limit: 100 });
        if (!cancelled) setStores(data.items.map(mapStore));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stores");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(
    () => ["All Cities", ...Array.from(new Set(stores.map((s) => s.city)))],
    [stores]
  );

  const filtered = useMemo(() => {
    return stores.filter((store) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        store.name.toLowerCase().includes(q) ||
        store.code.toLowerCase().includes(q) ||
        store.city.toLowerCase().includes(q) ||
        store.manager.toLowerCase().includes(q) ||
        store.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""));

      const matchesCity =
        cityFilter === "All Cities" || store.city === cityFilter;
      const matchesStatus =
        statusFilter === "All" || store.status === statusFilter;

      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [stores, search, cityFilter, statusFilter]);

  const totals = useMemo(() => {
    const active = stores.filter((s) => s.status === "Active");
    return {
      stores: stores.length,
      active: active.length,
      leads: active.reduce((sum, s) => sum + s.openLeads, 0),
      projects: active.reduce((sum, s) => sum + s.activeProjects, 0),
      revenue: active.reduce((sum, s) => sum + s.monthlyRevenue, 0),
      staff: active.reduce((sum, s) => sum + s.staffCount, 0),
    };
  }, [stores]);

  const selected = selectedId
    ? stores.find((s) => s.id === selectedId) || null
    : null;

  const updateStatus = async (id: string, status: StoreStatus) => {
    const prev = stores;
    setStores((current) =>
      current.map((s) => (s.id === id ? { ...s, status } : s))
    );
    try {
      await storesApi.update(id, { status: labelToEnum(status) });
    } catch {
      setStores(prev);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading stores...</div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Stores
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage Santoshi Interior multi-store locations, managers & performance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={`px-3 py-2 text-sm font-medium ${
                view === "cards"
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 dark:bg-transparent dark:text-gray-400"
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`px-3 py-2 text-sm font-medium ${
                view === "table"
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 dark:bg-transparent dark:text-gray-400"
              }`}
            >
              Table
            </button>
          </div>
          <Link href="/stores/new">
            <Button size="sm">+ Add Store</Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          { label: "Total Stores", value: String(totals.stores) },
          { label: "Active", value: String(totals.active) },
          { label: "Open Leads", value: String(totals.leads) },
          { label: "Active Projects", value: String(totals.projects) },
          {
            label: "Monthly Revenue",
            value: formatINR(totals.revenue),
            wide: true,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03] ${
              kpi.wide ? "col-span-2 xl:col-span-1" : ""
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {kpi.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          type="text"
          placeholder="Search store, city, manager, phone..."
          defaultValue={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className={selectClass}
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "All" | StoreStatus)
          }
          className={selectClass}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Coming Soon">Coming Soon</option>
        </select>
      </div>

      {/* Cards view */}
      {view === "cards" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((store) => (
            <div
              key={store.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500 px-5 py-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-200">
                      {store.code}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{store.name}</h3>
                    <p className="mt-0.5 text-sm text-white/70">
                      {store.city} · {store.address}
                    </p>
                  </div>
                  <Badge size="sm" color={statusColor[store.status]}>
                    {store.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <div>
                  <p className="text-[11px] text-gray-400">Leads</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {store.openLeads}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Projects</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {store.activeProjects}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Staff</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {store.staffCount}
                  </p>
                </div>
              </div>

              <div className="space-y-2 px-4 py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Manager</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {store.manager}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Phone</span>
                  <span className="text-gray-800 dark:text-white/90">{store.phone}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Revenue / mo</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {formatINR(store.monthlyRevenue)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedId(store.id)}
                  className="text-sm font-medium text-brand-500 hover:text-brand-600"
                >
                  View
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <Link
                  href={`/stores/new?edit=${store.id}`}
                  className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                >
                  Edit
                </Link>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <Link
                  href="/sales/leads"
                  className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                >
                  Leads
                </Link>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <Link
                  href="/settings/team"
                  className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                >
                  Team
                </Link>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700">
              No stores match your filters.{" "}
              <Link href="/stores/new" className="font-medium text-brand-500">
                Add a store
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Table view */}
      {view === "table" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1100px]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    {[
                      "Store",
                      "City / Address",
                      "Manager",
                      "Leads",
                      "Projects",
                      "Revenue",
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
                  {filtered.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="px-4 py-3 text-start">
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {store.name}
                        </span>
                        <span className="block text-theme-xs text-gray-500">
                          {store.code} · {store.id}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <span className="block text-gray-800 text-theme-sm dark:text-white/90">
                          {store.city}
                        </span>
                        <span className="block text-theme-xs text-gray-500">
                          {store.address}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <span className="block text-gray-800 text-theme-sm dark:text-white/90">
                          {store.manager}
                        </span>
                        <span className="block text-theme-xs text-gray-500">
                          {store.phone}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                        {store.openLeads}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                        {store.activeProjects}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {formatINR(store.monthlyRevenue)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <div className="flex flex-col gap-2">
                          <Badge size="sm" color={statusColor[store.status]}>
                            {store.status}
                          </Badge>
                          <select
                            value={store.status}
                            onChange={(e) =>
                              updateStatus(
                                store.id,
                                e.target.value as StoreStatus
                              )
                            }
                            className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Coming Soon">Coming Soon</option>
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedId(store.id)}
                            className="text-left text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            View
                          </button>
                          <Link
                            href={`/stores/new?edit=${store.id}`}
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                          >
                            Edit
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell className="px-4 py-10 text-center text-gray-500">
                        No stores found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-[99999] flex justify-end bg-black/40">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-300">
                  {selected.code}
                </p>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  {selected.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selected.city}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mb-5">
              <Badge size="sm" color={statusColor[selected.status]}>
                {selected.status}
              </Badge>
            </div>

            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              {[
                ["Address", selected.address],
                ["Manager", selected.manager],
                ["Phone", selected.phone],
                ["Email", selected.email],
                ["Staff", String(selected.staffCount)],
                ["Open Leads", String(selected.openLeads)],
                ["Active Projects", String(selected.activeProjects)],
                ["Monthly Revenue", formatINR(selected.monthlyRevenue)],
                ["Opened On", formatDate(selected.openedOn)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-right font-medium text-gray-800 dark:text-white/90">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link href={`/stores/new?edit=${selected.id}`}>
                <Button size="sm" className="w-full">
                  Edit Store
                </Button>
              </Link>
              <Link href="/sales/leads">
                <Button size="sm" variant="outline" className="w-full">
                  View Store Leads
                </Button>
              </Link>
              <Link href="/settings/team">
                <Button size="sm" variant="outline" className="w-full">
                  Manage Team
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setSelectedId(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
