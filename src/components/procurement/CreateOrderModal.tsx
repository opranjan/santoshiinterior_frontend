"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DatePickerField from "@/components/form/DatePickerField";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  purchaseOrdersApi,
  procurementRequestsApi,
  projectsApi,
  storesApi,
  vendorsApi,
  type ProcurementRequestDto,
  type ProcurementRequestItemDto,
  type StoreDto,
  type VendorDto,
} from "@/services/crmApi";

const PINK = "#E85D75";
const fieldClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#E85D75] dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const PAYMENT_TERMS = ["None", "PAYMENT PLAN", "Advance 50%", "Net 15 days", "Net 30 days"];
const TERMS_AND_CONDITIONS = ["None", "Terms & Conditions for Payment", "Standard Terms & Conditions"];

function formatAddress(parts: Array<string | null | undefined>) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(", ");
}

function toYmd(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CreateOrderModal({
  open,
  onClose,
  request,
  selectedItems = [],
  createdByName,
}: {
  open: boolean;
  onClose: () => void;
  request?: ProcurementRequestDto | null;
  selectedItems?: ProcurementRequestItemDto[];
  createdByName?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [orderType, setOrderType] = useState<"PO" | "WO">(request?.type === "SERVICE" ? "WO" : "PO");
  const [projectId, setProjectId] = useState(request?.projectId || "");
  const [projects, setProjects] = useState<Array<{ id: string; name: string; address?: string | null }>>([]);
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [title, setTitle] = useState(request?.name || "");
  const [deliveryDate, setDeliveryDate] = useState(toYmd(request?.expectedDelivery));
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("None");
  const [terms, setTerms] = useState("None");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setVendorId("");
    setOrderType(request?.type === "SERVICE" ? "WO" : "PO");
    setProjectId(request?.projectId || "");
    setTitle(request?.name || "");
    setDeliveryDate(toYmd(request?.expectedDelivery));
    setPaymentTerms("None");
    setTerms("None");
    vendorsApi
      .list({ limit: 100 })
      .then((data) => setVendors(data.items || []))
      .catch(() => toastError("Failed to load vendors"));
    storesApi
      .list({ limit: 100 })
      .then((data) => setStores(data.items || []))
      .catch(() => setStores([]));
    if (!request) {
      projectsApi
        .list({ limit: 100 })
        .then((data) =>
          setProjects(
            (data.items || []).map((row) => ({
              id: String(row.id),
              name: String(row.name || "Untitled"),
              address: (row.address as string | null) || null,
            }))
          )
        )
        .catch(() => setProjects([]));
    }
  }, [open, request]);

  const projectAddress = request?.project?.address || projects.find((row) => row.id === projectId)?.address || "";

  const shippingOptions = useMemo(() => {
    const values = new Set<string>();
    const list: string[] = [];
    const add = (value?: string | null) => {
      const text = String(value || "").trim();
      if (!text || values.has(text)) return;
      values.add(text);
      list.push(text);
    };
    add(projectAddress);
    const vendor = vendors.find((row) => row.id === vendorId);
    if (vendor) add(formatAddress([vendor.address, vendor.city, vendor.state, vendor.pincode]));
    stores.forEach((store) => add(formatAddress([store.address, store.city, store.state, store.pincode])));
    return list;
  }, [projectAddress, stores, vendorId, vendors]);

  const goNext = () => {
    if (!orderType) {
      toastWarning("Order type is required.");
      return;
    }
    if (!vendorId) {
      toastWarning("Please select a vendor.");
      return;
    }
    setShippingAddress(String(projectAddress || "").trim() || shippingOptions[0] || "");
    setStep(2);
  };

  const create = async () => {
    const vendor = vendors.find((row) => row.id === vendorId);
    if (!vendor) {
      toastWarning("Please select a vendor.");
      return;
    }
    if (!title.trim()) {
      toastWarning("Title is required.");
      return;
    }
    if (!deliveryDate) {
      toastWarning("Delivery date is required.");
      return;
    }
    const items = selectedItems.filter((item) => item.name.trim());
    const billing = formatAddress([vendor.address, vendor.city, vendor.state, vendor.pincode]);
    try {
      setSaving(true);
      const created = await purchaseOrdersApi.create({
        kind: orderType,
        title: title.trim(),
        vendor: vendor.name,
        vendorId: vendor.id,
        projectId: projectId || request?.projectId || null,
        expectedDate: deliveryDate,
        shippingAddress: shippingAddress || null,
        vendorBillingAddress: billing || null,
        paymentTerms: paymentTerms === "None" ? null : paymentTerms,
        termsAndConditions: terms === "None" ? null : terms,
        items: items.map((item) => ({
          name: item.name.trim(),
          qty: Number(item.qty || 1),
          unit: item.uom || null,
          rate: 0,
        })),
      });
      if (request?.id) {
        await procurementRequestsApi.update(request.id, { stage: "ORDERED" });
      }
      toastSuccess(orderType === "WO" ? "Work order created." : "Purchase order created.");
      onClose();
      router.push(`/operations/procurement/orders/${created.id}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      className="w-full max-w-2xl p-6 shadow-xl"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/35"
    >
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">New Purchase Order</h3>

      {step === 1 ? (
        <div className="space-y-4">
          {!request ? (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Select Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldClass}>
                <option value="">Select</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Order Type <span className="text-[#E85D75]">*</span>
            </label>
            <select value={orderType} onChange={(e) => setOrderType(e.target.value as "PO" | "WO")} className={fieldClass}>
              <option value="PO">Purchase Order</option>
              <option value="WO">Work Order</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Select Vendor <span className="text-[#E85D75]">*</span>
            </label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={fieldClass}>
              <option value="">Select</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={goNext}
              className="h-10 rounded-lg px-5 text-sm font-medium text-white"
              style={{ backgroundColor: PINK }}
            >
              Next (1/2)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Title <span className="text-[#E85D75]">*</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Delivery Date <span className="text-[#E85D75]">*</span>
              </label>
              <DatePickerField id="create-order-delivery" value={deliveryDate} onChange={setDeliveryDate} placeholder="Select date" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Shipping Address</label>
              <select value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className={fieldClass}>
                <option value="">Select</option>
                {shippingOptions.map((address) => (
                  <option key={address} value={address}>
                    {address}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Payment Terms</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={fieldClass}>
                {PAYMENT_TERMS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Terms & Conditions</label>
              <select value={terms} onChange={(e) => setTerms(e.target.value)} className={fieldClass}>
                {TERMS_AND_CONDITIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className="h-10 rounded-lg border border-gray-200 px-4 text-sm text-gray-600">
              Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void create()}
              className="h-10 rounded-lg px-5 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: PINK }}
            >
              {saving ? "Creating..." : "Generate Order"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
