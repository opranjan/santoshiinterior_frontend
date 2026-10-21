"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toastError, toastWarning } from "@/components/ui/toast/ToastHost";
import { invoicesApi, projectsApi } from "@/services/crmApi";

type ProjectOption = {
  id: string;
  name: string;
  clientName?: string | null;
  address?: string | null;
};

export default function NewInvoiceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProjectId("");
    setBillTo("");
    setShipTo("");
    projectsApi
      .list({ limit: 200 })
      .then((data) =>
        setProjects(
          (data.items || []).map((row) => ({
            id: String(row.id),
            name: String(row.name || "Untitled"),
            clientName: (row.clientName as string | null) || null,
            address: (row.address as string | null) || null,
          }))
        )
      )
      .catch(() => setProjects([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const create = async () => {
    if (!projectId) {
      toastWarning("Select a project.");
      return;
    }
    if (!billTo.trim()) {
      toastWarning("Enter the bill to address.");
      return;
    }
    if (!shipTo.trim()) {
      toastWarning("Enter the ship to address.");
      return;
    }
    const project = projects.find((row) => row.id === projectId);
    setSaving(true);
    try {
      const created = await invoicesApi.create({
        projectId,
        projectName: project?.name || "",
        clientName: project?.clientName || project?.name || "",
        billTo: billTo.trim(),
        shipTo: shipTo.trim(),
        status: "DRAFT",
        items: [],
      });
      onClose();
      router.push(`/accounting/invoices/${created.id}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-[#1c1610]/45 p-4">
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[28px] bg-[#fbf7f1] shadow-2xl md:grid-cols-[1fr_280px]">
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <img src="/images/logo/santoshi-interiors.jpg" alt="Santoshi Interiors" className="h-10 w-10 rounded-lg object-contain" />
            <div>
              <p className="font-serif text-lg leading-tight text-[#6b3e1f]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Santoshi Interiors
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">
                Design Your Dream Space
              </p>
            </div>
          </div>

          <h2
            className="font-serif text-3xl text-[#1c1610]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            New Invoice
          </h2>
          <p className="mt-1 text-sm text-[#8a7b68]">Create a new invoice for your project</p>

          <div className="mt-6 space-y-3">
            <label className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white px-4 py-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6efe4] text-[#9a7748]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M4 7h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">
                  Select project *
                </span>
                <select
                  value={projectId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setProjectId(id);
                    const project = projects.find((row) => row.id === id);
                    const address = project?.address || "";
                    if (address) {
                      if (!billTo.trim()) setBillTo(address);
                      if (!shipTo.trim()) setShipTo(address);
                    }
                  }}
                  className="mt-0.5 w-full bg-transparent text-sm text-[#1c1610] outline-none"
                >
                  <option value="">Choose a project</option>
                  {projects.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-[#eadfcf] bg-white px-4 py-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6efe4] text-[#9a7748]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M8 7h8M8 11h8M8 15h5M6 3h12a2 2 0 012 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">
                  Bill to (address) *
                </span>
                <textarea
                  value={billTo}
                  onChange={(e) => setBillTo(e.target.value)}
                  rows={2}
                  placeholder="Enter billing address"
                  className="mt-1 w-full resize-none bg-transparent text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594]"
                />
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-[#eadfcf] bg-white px-4 py-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6efe4] text-[#9a7748]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">
                  Ship to (address) *
                </span>
                <textarea
                  value={shipTo}
                  onChange={(e) => setShipTo(e.target.value)}
                  rows={2}
                  placeholder="Enter shipping address"
                  className="mt-1 w-full resize-none bg-transparent text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594]"
                />
              </span>
            </label>
          </div>

          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-[#eadfcf] bg-white px-5 text-sm font-medium text-[#6b645b]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void create()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7a4a24] px-5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#6b3e1f]"
            >
              {saving ? "Creating..." : "Create Invoice"}
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>

        <div className="relative hidden min-h-[420px] md:block">
          <img
            src="/images/casual/hero-living-room.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#6b3e1f] shadow"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
