"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vendorsApi, type VendorDto } from "@/services/crmApi";
import VendorFilterMenu from "./VendorFilterMenu";

function statusClass(status: string) {
  if (status === "Verified" || status === "Onboarded") {
    return "bg-[#1c1610] text-[#e8d5b5]";
  }
  if (status === "Blacklisted") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200";
  }
  if (status === "Deactivated" || status === "Inactive") {
    return "bg-[#efe8dc] text-[#8a7b68] dark:bg-white/10 dark:text-[#b5aa9c]";
  }
  return "bg-[#f6efe4] text-[#9a7748] dark:bg-[#c4a574]/15 dark:text-[#e8d5b5]";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function VendorsTable() {
  const router = useRouter();
  const [items, setItems] = useState<VendorDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [workingModel, setWorkingModel] = useState<string[]>([]);
  const [created, setCreated] = useState<string[]>([]);
  const [country, setCountry] = useState<string[]>([]);
  const [state, setState] = useState<string[]>([]);
  const [city, setCity] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    category: string[];
    workingModel: string[];
    country: string[];
    state: string[];
    city: string[];
    created: Array<{ value: string; label: string }>;
  }>({
    category: [],
    workingModel: [],
    country: [],
    state: [],
    city: [],
    created: [],
  });
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, workingModel, created, country, state, city]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await vendorsApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        category: category.length ? JSON.stringify(category) : undefined,
        workingModel: workingModel.length ? workingModel.join(",") : undefined,
        created: created.length ? created.join(",") : undefined,
        country: country.length ? country.join(",") : undefined,
        state: state.length ? state.join(",") : undefined,
        city: city.length ? city.join(",") : undefined,
      });
      setItems(data.items || []);
      setTotal(data.meta?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, limit, debouncedSearch, category, workingModel, created, country, state, city]);

  useEffect(() => {
    void vendorsApi.filters().then(setFilterOptions).catch(() => undefined);
  }, [total]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuId(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const activeFilterCount =
    category.length +
    workingModel.length +
    created.length +
    country.length +
    state.length +
    city.length;

  const resetFilters = () => {
    setSearch("");
    setCategory([]);
    setWorkingModel([]);
    setCreated([]);
    setCountry([]);
    setState([]);
    setCity([]);
  };

  const openAdd = () => {
    router.push("/operations/vendors/new");
  };

  const openVendor = (row: VendorDto) => {
    router.push(`/operations/vendors/${row.id}`);
  };

  const openEdit = (row: VendorDto) => {
    router.push(`/operations/vendors/${row.id}/basic`);
  };

  const remove = async (row: VendorDto) => {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    try {
      await vendorsApi.remove(row.id);
      setItems((prev) => prev.filter((item) => item.id !== row.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setMenuId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vendor");
    }
  };

  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f4efe6]"
          >
            <span aria-hidden>←</span>
            Home
          </Link>
          <h1 className="font-serif text-3xl text-[#1c1610] dark:text-[#f4efe6]">My vendors</h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            {loading ? "Loading directory…" : `${total} vendor${total === 1 ? "" : "s"} in your directory`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search name, phone or city"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] pl-10 pr-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:bg-white focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6] dark:focus:bg-[#161411]"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="h-11 rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] hover:bg-black"
          >
            + New vendor
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-3 py-3 dark:border-[#3a342c] dark:bg-[#161411]">
        <span className="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#9a7748] dark:bg-[#1c1914]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" />
          </svg>
        </span>
        <VendorFilterMenu
          label="Category"
          selected={category}
          onChange={setCategory}
          options={filterOptions.category.map((item) => ({ value: item, label: item }))}
        />
        <VendorFilterMenu
          label="Working Model"
          selected={workingModel}
          onChange={setWorkingModel}
          options={filterOptions.workingModel.map((item) => ({ value: item, label: item }))}
        />
        <VendorFilterMenu
          label="Created"
          selected={created}
          onChange={setCreated}
          options={
            filterOptions.created.length
              ? filterOptions.created
              : [
                  { value: "today", label: "Today" },
                  { value: "this_week", label: "This week" },
                  { value: "this_month", label: "This month" },
                  { value: "last_3_months", label: "Last 3 months" },
                ]
          }
        />
        <VendorFilterMenu
          label="Country"
          selected={country}
          onChange={setCountry}
          options={filterOptions.country.map((item) => ({ value: item, label: item }))}
        />
        <VendorFilterMenu
          label="State"
          selected={state}
          onChange={setState}
          options={filterOptions.state.map((item) => ({ value: item, label: item }))}
        />
        <VendorFilterMenu
          label="City"
          selected={city}
          onChange={setCity}
          options={filterOptions.city.map((item) => ({ value: item, label: item }))}
        />
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-[#9a7748] hover:bg-white dark:hover:bg-white/10"
          >
            Reset · {activeFilterCount}
          </button>
        ) : (
          <span className="text-xs text-[#8a7b68]">Filter by records already in the directory</span>
        )}
      </div>

      <div className="vendor-form-card overflow-visible rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="max-w-full overflow-x-auto rounded-2xl">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                {["Vendor", "Phone", "City", "Category", "Working model", "Status", ""].map((heading) => (
                  <th key={heading || "actions"} className="whitespace-nowrap px-4 py-3.5">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                    Loading vendors...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="font-serif text-xl text-[#1c1610] dark:text-[#f4efe6]">No vendors yet</p>
                    <p className="mt-1 text-sm text-[#8a7b68]">Add a vendor to start procurement and payouts.</p>
                    <button
                      type="button"
                      onClick={openAdd}
                      className="mt-4 h-10 rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
                    >
                      + New vendor
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#f0e8db] last:border-0 hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                  >
                    <td className="min-w-[240px] px-4 py-3.5">
                      <button type="button" onClick={() => openVendor(row)} className="flex min-w-0 items-center gap-3 text-left">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1c1610] text-[11px] font-semibold text-[#e8d5b5]">
                          {initials(row.name || "V")}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[#1c1610] dark:text-[#f4efe6]">
                            {row.name}
                          </span>
                          <span className="block truncate text-xs text-[#8a7b68]">
                            {row.contactPerson || row.email || "Open profile"}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#6f6254] dark:text-[#b5aa9c]">
                      {row.phone || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#6f6254] dark:text-[#b5aa9c]">
                      {row.city || "—"}
                    </td>
                    <td className="max-w-[220px] px-4 py-3.5">
                      <span className="line-clamp-2 text-[#6f6254] dark:text-[#b5aa9c]">
                        {row.category || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#6f6254] dark:text-[#b5aa9c]">
                      {row.workingModel || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusClass(row.status)}`}
                      >
                        {row.status || "Created"}
                      </span>
                    </td>
                    <td className="relative px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#8a7b68] hover:bg-[#f6efe4] hover:text-[#1c1610] dark:hover:bg-white/10 dark:hover:text-[#f4efe6]"
                        aria-label="Vendor actions"
                      >
                        ⋮
                      </button>
                      {menuId === row.id ? (
                        <div
                          ref={menuRef}
                          className="absolute right-4 z-30 mt-1 w-36 overflow-hidden rounded-xl border border-[#eadfcf] bg-white py-1 shadow-xl dark:border-[#3a342c] dark:bg-[#161411]"
                        >
                          <button
                            type="button"
                            onClick={() => openVendor(row)}
                            className="block w-full px-3 py-2 text-left text-sm text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f4efe6] dark:hover:bg-white/5"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="block w-full px-3 py-2 text-left text-sm text-[#1c1610] hover:bg-[#fbf8f3] dark:text-[#f4efe6] dark:hover:bg-white/5"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(row)}
                            className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-[#f0e8db] px-4 py-3 text-sm text-[#8a7b68] sm:flex-row sm:items-center sm:justify-between dark:border-[#3a342c]">
          <div className="flex items-center gap-2">
            <span>Rows</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-[#eadfcf] bg-[#fdfbf7] px-2 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6]"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>
              {from} – {to} of {total}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 rounded-lg px-3 disabled:opacity-40 hover:bg-[#fbf8f3] dark:hover:bg-white/5"
            >
              Prev
            </button>
            {pageButtons.map((n, index) => {
              const prev = pageButtons[index - 1];
              return (
                <React.Fragment key={n}>
                  {prev && n - prev > 1 ? <span className="px-1">…</span> : null}
                  <button
                    type="button"
                    onClick={() => setPage(n)}
                    className={`h-9 min-w-9 rounded-lg px-2 ${
                      n === page
                        ? "bg-[#1c1610] text-[#e8d5b5]"
                        : "hover:bg-[#fbf8f3] dark:hover:bg-white/5"
                    }`}
                  >
                    {n}
                  </button>
                </React.Fragment>
              );
            })}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 rounded-lg px-3 disabled:opacity-40 hover:bg-[#fbf8f3] dark:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
