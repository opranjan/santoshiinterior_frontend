"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { vendorsApi, type VendorDto } from "@/services/crmApi";
import VendorFilterMenu from "./VendorFilterMenu";

function statusColor(status: string): "success" | "info" | "light" | "error" | "warning" {
  if (status === "Verified" || status === "Onboarded") return "success";
  if (status === "Blacklisted") return "error";
  if (status === "Deactivated" || status === "Inactive") return "light";
  if (status === "Created") return "warning";
  return "info";
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

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Vendors
          </h2>
          <Link
            href="/operations/vendors/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14l-7-3-7 3V6a2 2 0 012-2z" />
            </svg>
            Vendor Form
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <Input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={openAdd} className="bg-[#E85D75] hover:bg-[#d64c66]">
            + New Vendor
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#F4D0D6] bg-[#fff7f8] px-3 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
        <span className="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#E85D75] shadow-theme-xs">
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
            className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-[#E85D75] hover:bg-white"
          >
            Reset · {activeFilterCount}
          </button>
        ) : (
          <span className="text-xs text-gray-400">Options come from vendor records</span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                {[
                  "Vendor Name",
                  "Phone no.",
                  "City",
                  "Category",
                  "Working Model",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    isHeader
                    className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-4 py-8 text-sm text-gray-500">
                    Loading vendors...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-8 text-sm text-gray-500">
                    No vendors yet. Add one with New Vendor.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openVendor(row)}
                        className="text-left text-sm font-medium uppercase tracking-wide text-gray-800 hover:text-brand-500 dark:text-white/90"
                      >
                        {row.name}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {row.phone || "â€”"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {row.city || "â€”"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {row.category || "â€”"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {row.workingModel || "â€”"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge size="sm" color={statusColor(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="relative px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Vendor actions"
                      >
                        â‹®
                      </button>
                      {menuId === row.id ? (
                        <div
                          ref={menuRef}
                          className="absolute right-4 z-20 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(row)}
                            className="block w-full px-3 py-2 text-left text-sm text-error-500 hover:bg-error-50"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
          <div className="flex items-center gap-2">
            <span>Items per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 rounded-md border border-gray-200 bg-transparent px-2 text-sm dark:border-gray-700"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>
              {from} â€“ {to} of {total}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="rounded-md px-2 py-1 disabled:opacity-40"
            >
              Â«
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md px-2 py-1 disabled:opacity-40"
            >
              â€¹
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md px-2 py-1 disabled:opacity-40"
            >
              â€º
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="rounded-md px-2 py-1 disabled:opacity-40"
            >
              Â»
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
