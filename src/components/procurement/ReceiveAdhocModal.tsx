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

const PINK = "#E85D75";
const fieldClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#E85D75]";

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
    <Modal isOpen={open} onClose={onClose} className="w-full max-w-lg p-6" showCloseButton>
      <h3 className="mb-4 text-lg font-semibold">Ad-hoc Delivery</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            Delivery Name<span className="text-[#E85D75]">*</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Write here" className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            Select Project<span className="text-[#E85D75]">*</span>
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
          <label className="mb-1 block text-xs text-gray-500">Select Vendor</label>
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
          <label className="mb-1 block text-xs text-gray-500">
            Delivery Date<span className="text-[#E85D75]">*</span>
          </label>
          <DatePickerField id="adhoc-delivery-date" value={deliveryDate} onChange={setDeliveryDate} />
        </div>
        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#E85D75] text-sm font-medium text-[#E85D75]">
          📎 Add item list for AI scanning
          <input
            type="file"
            className="hidden"
            onChange={(e) => setScanFile(e.target.files?.[0] || null)}
          />
        </label>
        {scanFile ? <p className="text-xs text-gray-500">{scanFile.name}</p> : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => void create()}
          className="h-11 w-full rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: PINK }}
        >
          {saving ? "Creating..." : "Create Delivery"}
        </button>
      </div>
    </Modal>
  );
}
