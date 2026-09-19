"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { vendorsApi, type VendorDto } from "@/services/crmApi";

export function vendorDisplayId(id: string) {
  const hex = id.replace(/-/g, "").slice(-5);
  const n = Number.parseInt(hex, 16) % 100000;
  return String(Number.isFinite(n) ? n : 0).padStart(5, "0");
}

export function VendorDataHeader({
  vendor,
  backHref = "/operations/vendors",
}: {
  vendor?: VendorDto | null;
  backHref?: string;
}) {
  return (
    <div className="space-y-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white/90"
      >
        <span className="text-2xl font-normal text-gray-500">‹</span>
        Vendor Data
      </Link>
      <div className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
        <span className="font-medium text-gray-800 dark:text-white/80">
          ID: {vendor ? vendorDisplayId(vendor.id) : "—"}
        </span>
        {" / "}
        <span>
          Name: {vendor?.name || "—"}
        </span>
        {" / "}
        <span>Category: {vendor?.category || "—"}</span>
      </div>
    </div>
  );
}

export function useVendorRecord(vendorId?: string) {
  const [vendor, setVendor] = useState<VendorDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(vendorId));

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await vendorsApi.get(vendorId);
        if (!cancelled) setVendor(row);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load vendor");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  return { vendor, error, loading };
}
