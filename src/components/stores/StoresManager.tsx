"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  quotationCount: number;
  monthlyRevenue: number;
  status: StoreStatus;
  openedOn: string;
};

type ConfirmAction = {
  type: "delete" | "close" | "reopen";
  storeId: string;
  storeName: string;
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
    staffCount: dto._count?.users ?? 0,
    openLeads: dto._count?.leads ?? 0,
    activeProjects: dto._count?.projects ?? 0,
    quotationCount: dto._count?.quotations ?? 0,
    monthlyRevenue: 0,
    status,
    openedOn: toIsoDate(dto.openedOn) || "",
  };
};

const statusPill: Record<StoreStatus, string> = {
  Active: "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]",
  Inactive: "bg-[#eadfcf] text-[#8a7b68] dark:bg-[#2a251f] dark:text-[#a89880]",
  "Coming Soon": "bg-[#e8d5b5] text-[#1c1610]",
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
  "h-11 w-full appearance-none rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const actionLink =
  "inline-flex h-8 items-center rounded-lg px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68] transition hover:bg-[#eadfcf] hover:text-[#1c1610] dark:hover:bg-[#2a251f] dark:hover:text-[#f3ece2]";
const drawerBtn =
  "inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#eadfcf] bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] transition hover:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

export default function StoresManager() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [statusFilter, setStatusFilter] = useState<"All" | StoreStatus>("All");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );
  const [actionBusy, setActionBusy] = useState(false);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 2500);
  };

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
      flash(
        status === "Inactive"
          ? "Store closed"
          : status === "Active"
            ? "Store reopened"
            : "Store status updated"
      );
    } catch (err) {
      setStores(prev);
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    setActionBusy(true);
    setError("");
    const { type, storeId, storeName } = confirmAction;
    const prev = stores;
    try {
      if (type === "delete") {
        await storesApi.remove(storeId);
        setStores((current) => current.filter((s) => s.id !== storeId));
        if (selectedId === storeId) setSelectedId(null);
        flash(`Deleted “${storeName}”`);
      } else {
        const nextStatus: StoreStatus =
          type === "close" ? "Inactive" : "Active";
        setStores((current) =>
          current.map((s) =>
            s.id === storeId ? { ...s, status: nextStatus } : s
          )
        );
        await storesApi.update(storeId, { status: labelToEnum(nextStatus) });
        flash(
          type === "close"
            ? `Closed “${storeName}”`
            : `Reopened “${storeName}”`
        );
      }
      setConfirmAction(null);
    } catch (err) {
      setStores(prev);
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionBusy(false);
    }
  };

  const storeLeadsHref = (id: string) => `/sales/leads?storeId=${id}`;
  const storeTeamHref = (id: string) => `/settings/team?storeId=${id}`;

  const renderStoreActions = (store: Store) => (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => setSelectedId(store.id)}
        className="inline-flex h-8 items-center rounded-lg bg-[#1c1610] px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
      >
        View
      </button>
      <Link href={`/stores/new?edit=${store.id}`} className={actionLink}>
        Edit
      </Link>
      <Link href={storeLeadsHref(store.id)} className={actionLink}>
        Leads
      </Link>
      <Link href={storeTeamHref(store.id)} className={actionLink}>
        Team
      </Link>
      {store.status !== "Inactive" ? (
        <button
          type="button"
          onClick={() =>
            setConfirmAction({
              type: "close",
              storeId: store.id,
              storeName: store.name,
            })
          }
          className={actionLink}
        >
          Close
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            setConfirmAction({
              type: "reopen",
              storeId: store.id,
              storeName: store.name,
            })
          }
          className={actionLink}
        >
          Reopen
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          setConfirmAction({
            type: "delete",
            storeId: store.id,
            storeName: store.name,
          })
        }
        className="inline-flex h-8 items-center rounded-lg px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        Delete
      </button>
    </div>
  );

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "S";

  return (
    <div className="space-y-6">
      <div className="store-hero relative rounded-2xl px-5 py-5 text-[#e8d5b5] sm:px-7 sm:py-6">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#c4a574]">
              Santoshi interiors · network
            </p>
            <h1
              className="mt-2 font-serif text-[2rem] leading-none text-[#f3ece2] sm:text-[2.35rem]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              All stores
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#c4b49a]">
              {loading
                ? "Loading locations…"
                : `${totals.stores} location${totals.stores === 1 ? "" : "s"} · ${totals.active} active · ${totals.leads} open leads`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-xl border border-[#e8d5b5]/25 bg-black/20">
              <button
                type="button"
                onClick={() => setView("cards")}
                className={`h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
                  view === "cards"
                    ? "bg-[#e8d5b5] text-[#1c1610]"
                    : "text-[#c4b49a] hover:text-[#e8d5b5]"
                }`}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
                  view === "table"
                    ? "bg-[#e8d5b5] text-[#1c1610]"
                    : "text-[#c4b49a] hover:text-[#e8d5b5]"
                }`}
              >
                Table
              </button>
            </div>
            <Link
              href="/stores/new"
              className="inline-flex h-11 items-center rounded-xl bg-[#e8d5b5] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] transition hover:bg-[#f3ece2]"
            >
              Add store
            </Link>
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#eadfcf] xl:grid-cols-5 xl:divide-y-0 dark:divide-[#3a342c]">
          {[
            { label: "Total stores", value: String(totals.stores), hint: "All locations" },
            { label: "Active", value: String(totals.active), hint: "Trading now" },
            { label: "Open leads", value: String(totals.leads), hint: "In pipeline" },
            { label: "Active projects", value: String(totals.projects), hint: "On site" },
            { label: "Monthly revenue", value: formatINR(totals.revenue), hint: "This month" },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className={`store-kpi px-4 py-4 sm:px-5 ${i === 4 ? "col-span-2 xl:col-span-1" : ""}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                {kpi.label}
              </p>
              <p
                className="mt-1.5 font-serif text-[1.65rem] leading-none text-[#1c1610] dark:text-[#f3ece2]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {kpi.value}
              </p>
              <p className="mt-1.5 text-xs text-[#a89880]">{kpi.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <input
            type="text"
            placeholder="Search store, city, manager, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={selectClass}
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
            <option value="All">All status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Coming Soon">Coming Soon</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-5 py-14 text-center text-sm text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#161411]">
          Loading stores...
        </div>
      ) : null}

      {view === "cards" && !loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((store, i) => (
            <article
              key={store.id}
              className="store-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="px-5 pb-2 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1c1610] text-xs font-semibold tracking-[0.08em] text-[#e8d5b5] shadow-[0_8px_18px_rgba(28,22,16,0.18)] dark:bg-[#e8d5b5] dark:text-[#1c1610]">
                      {initials(store.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
                        {store.code}
                      </p>
                      <h3
                        className="mt-1 truncate font-serif text-[1.35rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                      >
                        {store.name}
                      </h3>
                      <p className="mt-1 truncate text-sm text-[#8a7b68]">
                        {store.city}
                        {store.address ? ` · ${store.address}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusPill[store.status]}`}
                  >
                    {store.status}
                  </span>
                </div>
              </div>

              <div className="mx-5 mt-3 grid grid-cols-3 gap-2">
                {[
                  ["Leads", store.openLeads],
                  ["Projects", store.activeProjects],
                  ["Staff", store.staffCount],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-[#eadfcf] bg-white px-2.5 py-2.5 text-center dark:border-[#3a342c] dark:bg-[#1a1714]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                      {label}
                    </p>
                    <p
                      className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mx-5 mt-3 space-y-2 border-t border-[#eadfcf] py-3 text-sm dark:border-[#3a342c]">
                <div className="flex justify-between gap-2">
                  <span className="text-[#8a7b68]">Manager</span>
                  <span className="truncate font-medium text-[#1c1610] dark:text-[#f3ece2]">
                    {store.manager}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8a7b68]">Phone</span>
                  <span className="text-[#1c1610] dark:text-[#f3ece2]">{store.phone}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8a7b68]">Revenue / mo</span>
                  <span className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                    {formatINR(store.monthlyRevenue)}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#eadfcf] px-4 py-3 dark:border-[#3a342c]">
                {renderStoreActions(store)}
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f3] px-6 py-16 text-center dark:border-[#3a342c] dark:bg-[#161411]">
              <p
                className="font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                No stores match
              </p>
              <p className="mt-2 text-sm text-[#8a7b68]">
                Adjust filters or add a new location.
              </p>
              <Link
                href="/stores/new"
                className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              >
                Add a store
              </Link>
            </div>
          )}
        </div>
      )}

      {view === "table" && !loading && (
        <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1100px]">
              <Table>
                <TableHeader className="border-b border-[#eadfcf] bg-[#f6efe4] dark:border-[#3a342c] dark:bg-[#1a1714]">
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
                        className="px-4 py-3.5 text-start text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#eadfcf] dark:divide-[#3a342c]">
                  {filtered.map((store) => (
                    <TableRow key={store.id} className="store-row">
                      <TableCell className="px-4 py-3.5 text-start">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1c1610] text-[10px] font-semibold text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]">
                            {initials(store.name)}
                          </div>
                          <div>
                            <span className="block font-medium text-[#1c1610] dark:text-[#f3ece2]">
                              {store.name}
                            </span>
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c4a574]">
                              {store.code}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <span className="block text-sm text-[#1c1610] dark:text-[#f3ece2]">
                          {store.city}
                        </span>
                        <span className="block text-xs text-[#8a7b68]">
                          {store.address}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <span className="block text-sm text-[#1c1610] dark:text-[#f3ece2]">
                          {store.manager}
                        </span>
                        <span className="block text-xs text-[#8a7b68]">
                          {store.phone}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-[#1c1610] dark:text-[#f3ece2]">
                        {store.openLeads}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-[#1c1610] dark:text-[#f3ece2]">
                        {store.activeProjects}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                        {formatINR(store.monthlyRevenue)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusPill[store.status]}`}
                          >
                            {store.status}
                          </span>
                          <select
                            value={store.status}
                            onChange={(e) =>
                              updateStatus(
                                store.id,
                                e.target.value as StoreStatus
                              )
                            }
                            className="h-9 rounded-lg border border-[#eadfcf] bg-[#fdfbf7] px-2 text-xs text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Coming Soon">Coming Soon</option>
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        {renderStoreActions(store)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell className="px-4 py-10 text-center text-sm text-[#8a7b68]">
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

      {selected && (
        <div
          className="fixed inset-0 z-[99999] flex justify-end bg-black/40"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-[#eadfcf] bg-[#fbf8f3] shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="store-hero px-6 py-6">
              <div className="relative z-[1] mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
                    {selected.code}
                  </p>
                  <h3
                    className="mt-1 font-serif text-[1.7rem] leading-tight text-[#f3ece2]"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {selected.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#c4b49a]">{selected.city}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e8d5b5]/25 text-[#c4b49a] hover:bg-white/10 hover:text-[#e8d5b5]"
                >
                  ✕
                </button>
              </div>
              <span
                className={`relative z-[1] inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusPill[selected.status]}`}
              >
                {selected.status}
              </span>
            </div>

            <div className="p-6">
            <div className="mb-4 grid grid-cols-2 gap-2">
              {[
                ["Leads", selected.openLeads],
                ["Projects", selected.activeProjects],
                ["Staff", selected.staffCount],
                ["Quotes", selected.quotationCount],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-[#eadfcf] bg-white px-3 py-3 dark:border-[#3a342c] dark:bg-[#1a1714]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                    {label}
                  </p>
                  <p
                    className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#1a1714]">
              {[
                ["Address", selected.address],
                ["Manager", selected.manager],
                ["Phone", selected.phone],
                ["Email", selected.email],
                ["Monthly Revenue", formatINR(selected.monthlyRevenue)],
                ["Opened On", formatDate(selected.openedOn)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-sm">
                  <span className="text-[#8a7b68]">{label}</span>
                  <span className="text-right font-medium text-[#1c1610] dark:text-[#f3ece2]">
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link href={`/stores/new?edit=${selected.id}`} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#1c1610] text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]">
                Edit store
              </Link>
              <Link href={storeLeadsHref(selected.id)} className={drawerBtn}>
                View store leads ({selected.openLeads})
              </Link>
              <Link href={storeTeamHref(selected.id)} className={drawerBtn}>
                Manage team ({selected.staffCount})
              </Link>
              {selected.status !== "Inactive" ? (
                <button
                  type="button"
                  className={drawerBtn}
                  onClick={() =>
                    setConfirmAction({
                      type: "close",
                      storeId: selected.id,
                      storeName: selected.name,
                    })
                  }
                >
                  Close store
                </button>
              ) : (
                <button
                  type="button"
                  className={drawerBtn}
                  onClick={() =>
                    setConfirmAction({
                      type: "reopen",
                      storeId: selected.id,
                      storeName: selected.name,
                    })
                  }
                >
                  Reopen store
                </button>
              )}
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-red-200 text-xs font-semibold uppercase tracking-[0.12em] text-red-700 dark:border-red-500/30 dark:text-red-400"
                onClick={() =>
                  setConfirmAction({
                    type: "delete",
                    storeId: selected.id,
                    storeName: selected.name,
                  })
                }
              >
                Delete store
              </button>
              <button
                type="button"
                className={drawerBtn}
                onClick={() => setSelectedId(null)}
              >
                Dismiss
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {confirmAction ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]">
            <h3
              className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {confirmAction.type === "delete"
                ? "Delete store?"
                : confirmAction.type === "close"
                  ? "Close store?"
                  : "Reopen store?"}
            </h3>
            <p className="mt-2 text-sm text-[#8a7b68]">
              {confirmAction.type === "delete" ? (
                <>
                  Permanently delete <strong className="text-[#1c1610] dark:text-[#f3ece2]">{confirmAction.storeName}</strong>?
                  This only works if the store has no leads, projects,
                  quotations, or team members.
                </>
              ) : confirmAction.type === "close" ? (
                <>
                  Close <strong className="text-[#1c1610] dark:text-[#f3ece2]">{confirmAction.storeName}</strong>? It will be
                  marked inactive and hidden from active operations. You can
                  reopen it later.
                </>
              ) : (
                <>
                  Reopen <strong className="text-[#1c1610] dark:text-[#f3ece2]">{confirmAction.storeName}</strong> and mark it
                  active again?
                </>
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setConfirmAction(null)}
                className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-[#8a7b68] hover:bg-[#eadfcf]/50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void runConfirmAction()}
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmAction.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirmAction.type === "close"
                      ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
                      : "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
                }`}
              >
                {actionBusy
                  ? "Please wait…"
                  : confirmAction.type === "delete"
                    ? "Delete store"
                    : confirmAction.type === "close"
                      ? "Close store"
                      : "Reopen store"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
