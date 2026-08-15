"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import {
  leadsApi,
  type LeadWorkspaceDto,
} from "@/services/crmApi";
import { enumToLabel, formatDate, labelToEnum } from "@/lib/mappers";
import { mapQuotation } from "@/lib/crmMappers";
import type { Quotation } from "@/components/quotations/QuotationsTable";
import { getLeadProjectName } from "@/lib/leadProjectLabel";
import {
  LEAD_MODULES,
  leadModuleHref,
  normalizeLeadModule,
  type LeadModuleId,
} from "@/lib/leadModules";
import LeadExplorerModal from "./LeadExplorerModal";
import LeadQuotationsPanel from "./LeadQuotationsPanel";
import LeadCommunicationPanel from "./LeadCommunicationPanel";
import ConvertLeadToProjectModal from "./ConvertLeadToProjectModal";

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-white/[0.02]">
      <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</p>
      <p className="mt-2 text-sm text-gray-500">This module is coming soon.</p>
    </div>
  );
}

export default function LeadWorkspace({ leadId }: { leadId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get("module");
  const activeModule = normalizeLeadModule(moduleParam);

  const [data, setData] = useState<LeadWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);

  const [detailsForm, setDetailsForm] = useState({
    clientName: "",
    phone: "",
    email: "",
    projectName: "",
    projectType: "",
    budget: "",
    scope: "",
    description: "",
    status: "New",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const ws = await leadsApi.getWorkspace(leadId);
      setData(ws);
      const lead = ws.lead;
      setDetailsForm({
        clientName: lead.clientName || "",
        phone: lead.phone || "",
        email: lead.email || "",
        projectName: getLeadProjectName(lead.projectName, lead.project?.name),
        projectType: lead.projectType || "",
        budget: lead.budget || "",
        scope: lead.scope || "",
        description: lead.description || "",
        status: enumToLabel(lead.status) || "New",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead workspace");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (moduleParam === "quotations-v2") {
      router.replace(leadModuleHref(leadId, "quotations"));
    }
  }, [moduleParam, leadId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const lead = data?.lead;
  const statusLabel = lead ? enumToLabel(lead.status) : "New";

  const detailsDirty = useMemo(() => {
    if (!lead) return false;
    return (
      detailsForm.clientName !== (lead.clientName || "") ||
      detailsForm.phone !== (lead.phone || "") ||
      detailsForm.email !== (lead.email || "") ||
      detailsForm.projectType !== (lead.projectType || "") ||
      detailsForm.budget !== (lead.budget || "") ||
      detailsForm.scope !== (lead.scope || "") ||
      detailsForm.description !== (lead.description || "") ||
      detailsForm.status !== (enumToLabel(lead.status) || "New")
    );
  }, [detailsForm, lead]);

  const quotationRows: Quotation[] = useMemo(() => {
    if (!data?.quotations) return [];
    return data.quotations.map((q) =>
      mapQuotation({
        ...q,
        leadId,
        sourceType: "LEAD",
        phone: lead?.phone || "",
        email: lead?.email || "",
        storeId: lead?.storeId,
        store: lead?.store,
        projectType: lead?.projectType || "",
        items: [],
      } as Record<string, unknown>)
    );
  }, [data?.quotations, lead, leadId]);

  const saveDetails = async () => {
    if (!lead) return;
    try {
      setSavingDetails(true);
      await leadsApi.update(leadId, {
        clientName: detailsForm.clientName.trim(),
        phone: detailsForm.phone.trim(),
        email: detailsForm.email || null,
        projectName: getLeadProjectName(lead.projectName, lead.project?.name) || null,
        projectType: detailsForm.projectType || null,
        budget: detailsForm.budget || null,
        scope: detailsForm.scope || null,
        description: detailsForm.description || null,
        status: labelToEnum(detailsForm.status),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save details");
    } finally {
      setSavingDetails(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      setNoteBusy(true);
      await leadsApi.addFollowUp(leadId, {
        type: "OTHER",
        note: noteText.trim(),
        date: new Date().toISOString(),
      });
      setNoteText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setNoteBusy(false);
    }
  };

  const setModule = (module: LeadModuleId) => {
    router.push(leadModuleHref(leadId, module));
  };

  if (loading && !data) {
    return <div className="py-10 text-sm text-gray-500">Loading lead workspace…</div>;
  }

  if (!lead) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
        Lead not found.{" "}
        <Link href="/sales/leads" className="font-medium text-brand-500">
          Back to leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {error ? (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-t-2xl bg-gradient-to-r from-[#7a2940] via-[#9e3350] to-[#b83a5c] text-white">
        <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["CLIENT", lead.clientName],
            ["PROJECT", lead.project ? lead.project.name : "Not assigned"],
            ["STARTED ON", lead.tentativeStart ? formatDate(lead.tentativeStart) : "—"],
            ["EXPECTED HANDOVER", "—"],
            ["STATUS", statusLabel],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
                {label}
              </p>
              <p className="mt-0.5 font-medium text-white/95">{value}</p>
            </div>
          ))}
          <div className="flex flex-wrap items-end justify-start gap-2 lg:justify-end">
            {lead.project ? (
              <Link
                href="/projects"
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20"
              >
                View project
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setConvertOpen(true)}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20"
              >
                Assign Project
              </button>
            )}
            <button
              type="button"
              onClick={() => setExplorerOpen(true)}
              className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20"
            >
              Modules
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex gap-1 overflow-x-auto px-2">
          {LEAD_MODULES.filter((m) => m.ready).map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => setModule(mod.id)}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition ${
                activeModule === mod.id
                  ? "border-[#E85D75] text-[#E85D75]"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400"
              }`}
            >
              {mod.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-b-2xl border border-t-0 border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-transparent sm:p-5">
        {activeModule === "summary" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-400">Quotations</p>
                <p className="mt-2 text-2xl font-semibold">{data?.counts.quotations ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-400">Follow-ups</p>
                <p className="mt-2 text-2xl font-semibold">{data?.counts.followUps ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-400">Budget</p>
                <p className="mt-2 text-lg font-semibold">{lead.budget || "—"}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-400">Store</p>
                <p className="mt-2 text-lg font-semibold">{lead.store?.name || "—"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">Latest activity</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {lead.latestRemark || "No remarks yet."}
              </p>
            </div>
          </div>
        ) : null}

        {activeModule === "details" ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Client Name</Label>
                <Input value={detailsForm.clientName} onChange={(e) => setDetailsForm((f) => ({ ...f, clientName: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={detailsForm.phone} onChange={(e) => setDetailsForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={detailsForm.email} onChange={(e) => setDetailsForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={detailsForm.status}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, status: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm"
                >
                  {["Created", "New", "Contacted", "Site Visit", "Quotation", "Negotiation", "Won", "Lost"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                {lead.project ? (
                  <>
                    <Label>Assigned project</Label>
                    <div className="mt-1">
                      <Link
                        href="/projects"
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        {lead.project.name}
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <Label>Project assignment</Label>
                    <p className="mt-1 text-sm text-gray-500">
                      No project linked yet.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setConvertOpen(true)}
                    >
                      Assign Project
                    </Button>
                  </>
                )}
              </div>
              <div>
                <Label>Project Type</Label>
                <Input value={detailsForm.projectType} onChange={(e) => setDetailsForm((f) => ({ ...f, projectType: e.target.value }))} />
              </div>
              <div>
                <Label>Budget</Label>
                <Input value={detailsForm.budget} onChange={(e) => setDetailsForm((f) => ({ ...f, budget: e.target.value }))} />
              </div>
              <div>
                <Label>Scope</Label>
                <Input value={detailsForm.scope} onChange={(e) => setDetailsForm((f) => ({ ...f, scope: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <TextArea rows={4} value={detailsForm.description} onChange={(v) => setDetailsForm((f) => ({ ...f, description: v }))} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm" disabled={savingDetails || !detailsDirty} onClick={() => void saveDetails()}>
                {savingDetails ? "Saving…" : "Save Details"}
              </Button>
              {detailsDirty ? (
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  You have unsaved changes
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeModule === "details" && detailsDirty ? (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Unsaved changes to lead details
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingDetails}
                  onClick={() => {
                    if (!lead) return;
                    setDetailsForm({
                      clientName: lead.clientName || "",
                      phone: lead.phone || "",
                      email: lead.email || "",
                      projectName: getLeadProjectName(lead.projectName, lead.project?.name),
                      projectType: lead.projectType || "",
                      budget: lead.budget || "",
                      scope: lead.scope || "",
                      description: lead.description || "",
                      status: enumToLabel(lead.status) || "New",
                    });
                  }}
                >
                  Discard
                </Button>
                <Button size="sm" disabled={savingDetails} onClick={() => void saveDetails()}>
                  {savingDetails ? "Saving…" : "Save Details"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {activeModule === "notes" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <Label>Add note</Label>
              <TextArea rows={3} value={noteText} onChange={setNoteText} />
              <div className="mt-3">
                <Button size="sm" disabled={noteBusy} onClick={() => void addNote()}>
                  {noteBusy ? "Saving…" : "Save Note"}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {(data?.followUps || []).map((f) => (
                <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-2">
                    <Badge size="sm" color="light">{enumToLabel(f.type)}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(f.date)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{f.note || "—"}</p>
                  <p className="mt-1 text-xs text-gray-400">By {f.by?.name || "System"}</p>
                </div>
              ))}
              {!data?.followUps?.length ? (
                <p className="text-sm text-gray-500">No notes or follow-ups yet.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeModule === "communication" && lead ? (
          <LeadCommunicationPanel
            leadId={leadId}
            clientName={lead.clientName}
            phone={lead.phone}
            assignedToId={lead.assignedToId}
            salesOwnerId={lead.salesOwnerId}
            initialMessages={data?.messages || []}
            onRefresh={() => void load()}
          />
        ) : null}

        {activeModule === "quotations" && data && lead ? (
          <LeadQuotationsPanel
            leadId={leadId}
            leadContext={{
              leadId,
              clientName: lead.clientName,
              projectName: lead.projectName,
              phone: lead.phone,
              email: lead.email,
              storeId: lead.storeId,
              projectType: lead.projectType,
            }}
            rows={quotationRows}
            loading={loading}
            summary={data.quotationSummary}
            onRefresh={() => void load()}
          />
        ) : null}

        {!["summary", "details", "notes", "quotations", "communication"].includes(activeModule) ? (
          <PlaceholderPanel title={LEAD_MODULES.find((m) => m.id === activeModule)?.label || "Module"} />
        ) : null}
      </div>

      <ConvertLeadToProjectModal
        lead={
          convertOpen && lead
            ? {
                id: lead.id,
                clientName: lead.clientName,
                projectName: lead.projectName || undefined,
              }
            : null
        }
        onClose={() => setConvertOpen(false)}
        onSuccess={() => {
          setConvertOpen(false);
          void load();
        }}
      />

      <LeadExplorerModal
        lead={{ id: lead.id, clientName: lead.clientName, projectName: lead.projectName || undefined }}
        open={explorerOpen}
        onClose={() => setExplorerOpen(false)}
      />
    </div>
  );
}
