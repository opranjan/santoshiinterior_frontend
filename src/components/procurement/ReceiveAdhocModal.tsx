"use client";

import React, { useEffect, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  projectsApi,
  purchaseOrdersApi,
  vendorsApi,
  type VendorDto,
} from "@/services/crmApi";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ReceiveAdhocModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayYmd());
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setProjectId("");
    setVendorId("");
    setDeliveryDate(todayYmd());
    setScanFile(null);
    projectsApi
      .list({ limit: 100 })
      .then((data) =>
        setProjects((data.items || []).map((row) => ({ id: String(row.id), name: String(row.name || "Untitled") })))
      )
      .catch(() => setProjects([]));
    vendorsApi
      .list({ limit: 100 })
      .then((data) => setVendors(data.items || []))
      .catch(() => setVendors([]));
  }, [open]);

  const create = async () => {
    if (!name.trim()) {
      toastWarning("Delivery name is required.");
      return;
    }
    if (!projectId) {
      toastWarning("Please select a project.");
      return;
    }
    if (!deliveryDate) {
      toastWarning("Delivery date is required.");
      return;
    }
    const vendor = vendors.find((row) => row.id === vendorId);
    try {
      setSaving(true);
      const created = await purchaseOrdersApi.create({
        isAdhoc: true,
        kind: "PO",
        title: name.trim(),
        projectId,
        vendorId: vendorId || null,
        vendor: vendor?.name || "Unknown",
        expectedDate: deliveryDate,
      });
      if (scanFile) {
        await purchaseOrdersApi.uploadFiles(created.id, [scanFile], "SCAN");
      }
      toastSuccess("Delivery created.");
      onCreated(created.id);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create delivery");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      className="w-full max-w-lg overflow-hidden border border-[#eadfcf] bg-[#fdfbf7] p-0 dark:border-[#3a342c] dark:bg-[#161411]"
      showCloseButton={false}
    >
      <div className="border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c] dark:bg-[#1c1914]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">Receive</p>
        <h3
          className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Ad-hoc delivery
        </h3>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className={labelClass}>
            Delivery name <span className="text-[#c4a574]">*</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Write here" className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>
            Select project <span className="text-[#c4a574]">*</span>
          </label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldClass}>
            <option value="">Select</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Select vendor</label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={fieldClass}>
            <option value="">Select</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>
            Delivery date <span className="text-[#c4a574]">*</span>
          </label>
          <DatePickerField id="adhoc-delivery-date" value={deliveryDate} onChange={setDeliveryDate} />
        </div>
        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#c4a574]/70 bg-white text-sm font-medium text-[#9a7748] hover:bg-[#fbf8f3] dark:bg-[#1a1714]">
          + Add item list for AI scanning
          <input
            type="file"
            className="hidden"
            onChange={(e) => setScanFile(e.target.files?.[0] || null)}
          />
        </label>
        {scanFile ? <p className="text-xs text-[#8a7b68]">{scanFile.name}</p> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-[#eadfcf] px-6 py-4 dark:border-[#3a342c]">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border border-[#eadfcf] px-5 text-sm font-medium text-[#6b645b] dark:border-[#3a342c]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void create()}
          className="h-11 rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          {saving ? "Creating..." : "Create delivery"}
        </button>
      </div>
    </Modal>
  );
}
