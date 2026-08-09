"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import MyQuotationsList from "@/components/quotations/MyQuotationsList";
import CreateQuotationModal, {
  type LeadQuotationContext,
} from "@/components/quotations/CreateQuotationModal";
import type { Quotation } from "@/components/quotations/QuotationsTable";
import type { LeadQuotationSummaryBucket } from "@/services/crmApi";
import { useRouter } from "next/navigation";

function MetricCard({
  title,
  count,
  amount,
  color,
}: {
  title: string;
  count: number;
  amount: number;
  color: string;
}) {
  const inr = (n: number) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
        {count} {count === 1 ? "Quote" : "Quotes"}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
        {inr(amount)}
      </p>
      <div
        className="mt-4 h-1 rounded-full"
        style={{ backgroundColor: `${color}33` }}
      >
        <div
          className="h-1 rounded-full"
          style={{ width: "55%", backgroundColor: color }}
        />
      </div>
    </div>
  );
}

type Summary = {
  total: LeadQuotationSummaryBucket;
  internalPending: LeadQuotationSummaryBucket;
  clientNegotiation: LeadQuotationSummaryBucket;
  clientAccepted: LeadQuotationSummaryBucket;
};

export default function LeadQuotationsPanel({
  leadId,
  leadContext,
  rows,
  loading,
  summary,
  onRefresh,
}: {
  leadId: string;
  leadContext: LeadQuotationContext;
  rows: Quotation[];
  loading?: boolean;
  summary: Summary;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<"quotations" | "site">("quotations");
  const [createOpen, setCreateOpen] = useState(false);

  const context = useMemo(
    () => leadContext ?? { leadId, clientName: "Client" },
    [leadContext, leadId]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Quotation Generator
          </h2>
          <div className="mt-2 inline-flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setSubTab("quotations")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                subTab === "quotations"
                  ? "bg-[#E85D75] text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Quotations
            </button>
            <button
              type="button"
              onClick={() => setSubTab("site")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                subTab === "site"
                  ? "bg-[#E85D75] text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Site Measurements
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-white dark:border-gray-700"
          >
            Refresh
          </button>
          <Button
            size="sm"
            className="bg-[#E85D75] hover:bg-[#d94c65]"
            onClick={() => setCreateOpen(true)}
          >
            + Quotation
          </Button>
        </div>
      </div>

      {subTab === "quotations" ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Quotations"
              count={summary.total.count}
              amount={summary.total.amount}
              color="#2563EB"
            />
            <MetricCard
              title="Internal Approval Pending"
              count={summary.internalPending.count}
              amount={summary.internalPending.amount}
              color="#F97316"
            />
            <MetricCard
              title="Under Client Negotiation"
              count={summary.clientNegotiation.count}
              amount={summary.clientNegotiation.amount}
              color="#7C3AED"
            />
            <MetricCard
              title="Client Accepted"
              count={summary.clientAccepted.count}
              amount={summary.clientAccepted.amount}
              color="#16A34A"
            />
          </div>

          <MyQuotationsList
            rows={rows}
            loading={loading}
            mode="all"
            onRefresh={onRefresh}
            leadContext={context}
            onCreateClick={() => setCreateOpen(true)}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Site Measurements
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Manage site measurement settings from quotation configuration.
          </p>
          <Link
            href="/settings/quotations/site-measurements"
            className="mt-4 inline-block text-sm font-medium text-[#E85D75] hover:underline"
          >
            Open Site Measurements settings
          </Link>
        </div>
      )}
      <CreateQuotationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        leadContext={context}
        onCreated={(id) => {
          setCreateOpen(false);
          if (id) {
            router.push(`/quotations/${id}`);
            return;
          }
          onRefresh();
        }}
      />
    </div>
  );
}
