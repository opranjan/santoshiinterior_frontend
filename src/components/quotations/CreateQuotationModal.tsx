"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@/lib/api";
import { tokenStorage } from "@/lib/auth";
import { leadsApi, projectsApi, quotationsApi } from "@/services/crmApi";
import { getDefaultQuotationName } from "@/lib/leadProjectLabel";

type SourceKind = "projects" | "leads";
type QuotationType = "Regular" | "Modular";

export type LeadQuotationContext = {
  leadId: string;
  clientName: string;
  projectName?: string | null;
  phone?: string | null;
  email?: string | null;
  storeId?: string | null;
  projectType?: string | null;
};

type Option = {
  id: string;
  label: string;
  clientName: string;
  phone?: string | null;
  email?: string | null;
  storeId?: string | null;
  projectType?: string | null;
  customerId?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  /** When set, shows the simplified lead-workspace create form (no source picker). */
  leadContext?: LeadQuotationContext | null;
};

const accent = "#E85D75";

function makeReferenceNumber() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `INTERIOR-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const fieldClass =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#E85D75] focus:outline-hidden focus:ring-3 focus:ring-[#E85D75]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function CreateQuotationModal({
  open,
  onClose,
  onCreated,
  leadContext = null,
}: Props) {
  const isLeadMode = Boolean(leadContext?.leadId);
  const [name, setName] = useState("");
  const [type, setType] = useState<QuotationType>("Regular");
  const [source, setSource] = useState<SourceKind>("leads");
  const [sourceId, setSourceId] = useState("");
  const [reference, setReference] = useState(makeReferenceNumber);
  const [leads, setLeads] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setType("Regular");
    setReference(makeReferenceNumber());
    setError("");
    setSubmitting(false);

    if (leadContext) {
      setName(
        getDefaultQuotationName(leadContext.leadId, leadContext.projectName)
      );
      setSource("leads");
      setSourceId(leadContext.leadId);
      return;
    }

    setName("");
    setSource("leads");
    setSourceId("");

    let cancelled = false;
    (async () => {
      try {
        setLoadingOptions(true);
        const [leadsRes, projectsRes] = await Promise.all([
          leadsApi.list({ limit: 200 }),
          projectsApi.list({ limit: 200 }),
        ]);
        if (cancelled) return;
        setLeads(
          (leadsRes.items || []).map((l) => ({
            id: l.id,
            label: l.clientName || l.projectName || "Lead",
            clientName: l.clientName,
            phone: l.phone,
            email: l.email,
            storeId: l.storeId,
            projectType: l.projectType,
          }))
        );
        setProjects(
          (projectsRes.items || []).map((p) => {
            const row = p as Record<string, unknown>;
            const customer = row.customer as { id?: string } | null | undefined;
            return {
              id: String(row.id),
              label: String(row.name || row.clientName || "Project"),
              clientName: String(row.clientName || row.name || "Client"),
              phone: (row.phone as string | null) || null,
              email: null,
              storeId: (row.storeId as string | null) || null,
              projectType: (row.projectType as string | null) || null,
              customerId:
                (row.customerId as string | null) || customer?.id || null,
            };
          })
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load leads/projects"
          );
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, leadContext]);

  const options = source === "leads" ? leads : projects;
  const selected = useMemo(() => {
    if (leadContext) {
      return {
        id: leadContext.leadId,
        label: leadContext.clientName,
        clientName: leadContext.clientName,
        phone: leadContext.phone,
        email: leadContext.email,
        storeId: leadContext.storeId,
        projectType: leadContext.projectType,
      } satisfies Option;
    }
    return options.find((o) => o.id === sourceId) || null;
  }, [leadContext, options, sourceId]);

  const canCreate =
    name.trim().length > 0 &&
    Boolean(selected) &&
    (isLeadMode || Boolean(sourceId)) &&
    !submitting;

  const handleSourceChange = (next: SourceKind) => {
    setSource(next);
    setSourceId("");
  };

  const handleCreate = async () => {
    if (!canCreate || !selected) return;
    const user = tokenStorage.getUser();
    try {
      setSubmitting(true);
      setError("");
      const body: Record<string, unknown> = {
        title: name.trim(),
        sourceType: source === "leads" ? "LEAD" : "CLIENT",
        leadId: source === "leads" ? selected.id : null,
        customerId:
          source === "projects" ? selected.customerId || null : null,
        clientName: selected.clientName,
        phone: selected.phone || null,
        email: selected.email || null,
        storeId: selected.storeId || user?.store?.id || null,
        projectType: type === "Modular" ? "Modular" : selected.projectType || type,
        amount: 0,
        status: "DRAFT",
        version: 1,
        notes: `Ref: ${reference}${type === "Modular" ? " | Modular" : ""}`,
        createdById: user?.id || null,
      };
      const created = await quotationsApi.create(body);
      const id =
        created && typeof created === "object" && "id" in created
          ? String((created as { id: string }).id)
          : "";
      if (!id) {
        throw new ApiError("Quotation created but no id returned", 500);
      }
      onCreated?.(id);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create quotation"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100002] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-quotation-title"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-[440px] rounded-[20px] bg-white p-6 shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2
            id="create-quotation-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Create Quotation
          </h2>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.08] dark:text-gray-300"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-500">
              Quotation Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project - 4683"
              autoComplete="off"
              name="quotation-title"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-500">Type</label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuotationType)}
                className={`${fieldClass} pr-10`}
              >
                <option value="Regular">Regular</option>
                <option value="Modular">Modular</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>

          {!isLeadMode ? (
            <>
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-sm text-gray-500">Source:</span>
                <div className="inline-flex rounded-full border border-gray-300 p-0.5 dark:border-gray-600">
                  {(
                    [
                      { key: "projects", label: "Projects" },
                      { key: "leads", label: "Leads" },
                    ] as const
                  ).map((item) => {
                    const active = source === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSourceChange(item.key)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                          active
                            ? "text-white"
                            : "bg-transparent text-gray-700 hover:bg-gray-50 dark:text-gray-300"
                        }`}
                        style={active ? { backgroundColor: accent } : undefined}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-gray-500">
                  {source === "leads" ? "Leads" : "Project"}
                </label>
                <div className="relative">
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    disabled={loadingOptions}
                    className={`${fieldClass} pr-10`}
                  >
                    <option value="">
                      {source === "leads" ? "Select a lead" : "Select a project"}
                    </option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm text-gray-500">
              Reference number
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={fieldClass}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!canCreate}
          onClick={() => void handleCreate()}
          className={`mt-6 h-12 w-full rounded-full text-base font-medium text-white transition ${
            canCreate
              ? "bg-[#E85D75] hover:bg-[#d94c65]"
              : "cursor-not-allowed bg-gray-300"
          }`}
        >
          {submitting ? "Creating…" : "Create"}
        </button>
      </div>
    </div>,
    document.body
  );
}
