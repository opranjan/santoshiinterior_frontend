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

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";

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
      className="w-full max-w-2xl overflow-hidden border border-[#eadfcf] bg-[#fdfbf7] p-0 shadow-xl dark:border-[#3a342c] dark:bg-[#161411]"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/40"
    >
      <div className="border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c] dark:bg-[#1c1914]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
          Step {step} of 2
        </p>
        <h3
          className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          New {orderType === "WO" ? "work order" : "purchase order"}
        </h3>
      </div>

      {step === 1 ? (
        <div className="space-y-4 px-6 py-5">
          {!request ? (
            <div>
              <label className={labelClass}>Select project</label>
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
            <label className={labelClass}>
              Order type <span className="text-[#c4a574]">*</span>
            </label>
            <select value={orderType} onChange={(e) => setOrderType(e.target.value as "PO" | "WO")} className={fieldClass}>
              <option value="PO">Purchase order</option>
              <option value="WO">Work order</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Select vendor <span className="text-[#c4a574]">*</span>
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
          <div className="-mx-6 mt-2 flex justify-end gap-2 border-t border-[#eadfcf] px-6 pt-4 dark:border-[#3a342c]">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-[#eadfcf] px-5 text-sm font-medium text-[#6b645b] dark:border-[#3a342c]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={goNext}
              className="h-11 rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className={labelClass}>
              Title <span className="text-[#c4a574]">*</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Delivery date <span className="text-[#c4a574]">*</span>
              </label>
              <DatePickerField id="create-order-delivery" value={deliveryDate} onChange={setDeliveryDate} placeholder="Select date" />
            </div>
            <div>
              <label className={labelClass}>Shipping address</label>
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
              <label className={labelClass}>Payment terms</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={fieldClass}>
                {PAYMENT_TERMS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Terms & conditions</label>
              <select value={terms} onChange={(e) => setTerms(e.target.value)} className={fieldClass}>
                {TERMS_AND_CONDITIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="-mx-6 mt-2 flex justify-end gap-2 border-t border-[#eadfcf] px-6 pt-4 dark:border-[#3a342c]">
            <button type="button" onClick={() => setStep(1)} className="h-11 rounded-xl border border-[#eadfcf] px-4 text-sm font-medium text-[#6b645b] dark:border-[#3a342c]">
              Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void create()}
              className="h-11 rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
            >
              {saving ? "Creating..." : "Generate order"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
