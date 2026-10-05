"use client";

import React, { useEffect, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import { paymentsApi, vendorsApi, type VendorDto } from "@/services/crmApi";
import { toIsoDateOrNull } from "@/lib/crmMappers";
import {
  EXPENSE_TYPES,
  PAYMENT_SOURCES,
  paymentFieldClass,
  paymentLabelClass,
  paymentSerif,
  todayYmd,
} from "@/components/payments/paymentMoney";

export default function AddExpenseModal({
  open,
  onClose,
  onCreated,
  projectId,
  projectLabel,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectId: string;
  projectLabel: string;
}) {
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayYmd());
  const [source, setSource] = useState("CompanyAccount");
  const [expenseType, setExpenseType] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [contractName, setContractName] = useState("");
  const [category, setCategory] = useState("");
  const [remark, setRemark] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setExpenseDate(todayYmd());
    setSource("CompanyAccount");
    setExpenseType("");
    setVendorId("");
    setContractName("");
    setCategory("");
    setRemark("");
    setFileName("");
    vendorsApi
      .list({ limit: 100 })
      .then((data) => setVendors(data.items || []))
      .catch(() => setVendors([]));
    vendorsApi
      .categories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]));
  }, [open]);

  const save = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toastWarning("Enter a valid amount.");
      return;
    }
    if (!expenseDate) {
      toastWarning("Expense date is required.");
      return;
    }
    const vendor = vendors.find((row) => row.id === vendorId);
    const paidDate = toIsoDateOrNull(expenseDate);
    try {
      setSaving(true);
      const body = {
        projectId,
        type: "MATERIAL",
        method: source === "Cash" || source === "PettyCash" ? "CASH" : "BANK_TRANSFER",
        amount: value,
        paidAmount: value,
        status: "PAID",
        paidDate,
        source,
        expenseType,
        vendorName: vendor?.name || "",
        contractName,
        category,
        remark,
        attachmentUrl: fileName || undefined,
      };
      try {
        await paymentsApi.create(body);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (!/Unknown|does not exist|column/i.test(message)) throw err;
        await paymentsApi.create({
          projectId,
          type: "MATERIAL",
          method: source === "Cash" || source === "PettyCash" ? "CASH" : "BANK_TRANSFER",
          amount: value,
          paidAmount: value,
          status: "PAID",
          paidDate,
          remark: [remark, vendor?.name && `Vendor: ${vendor.name}`, category && `Category: ${category}`]
            .filter(Boolean)
            .join(" · "),
        });
      }
      toastSuccess("Expense added.");
      onCreated();
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      showCloseButton
      className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#eadfcf] bg-white p-0 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]"
    >
      <div className="border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c] dark:bg-[#1c1914]">
        <h3 className="font-serif text-lg text-[#1c1610] dark:text-[#f3ece2]" style={paymentSerif}>
          Add expense
        </h3>
        <p className="mt-1 text-xs text-[#8a7b68]">{projectLabel}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className={paymentLabelClass}>Amount *</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className={paymentFieldClass} />
        </div>
        <div>
          <label className={paymentLabelClass}>Expense date *</label>
          <DatePickerField id="expense-date" value={expenseDate} onChange={setExpenseDate} />
        </div>
        <div>
          <label className={paymentLabelClass}>Source *</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={paymentFieldClass}>
            {PAYMENT_SOURCES.map((row) => (
              <option key={row} value={row}>
                {row}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={paymentLabelClass}>Expense type</label>
          <select value={expenseType} onChange={(e) => setExpenseType(e.target.value)} className={paymentFieldClass}>
            <option value="">Select type</option>
            {EXPENSE_TYPES.map((row) => (
              <option key={row} value={row}>
                {row}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={paymentLabelClass}>Vendor</label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={paymentFieldClass}>
            <option value="">Choose vendor</option>
            {vendors.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={paymentLabelClass}>Contract</label>
          <select value={contractName} onChange={(e) => setContractName(e.target.value)} className={paymentFieldClass}>
            <option value="">Select contract</option>
            <option value="Contract - 1">Contract - 1</option>
            <option value="Contract - 2">Contract - 2</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={paymentLabelClass}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={paymentFieldClass}>
            <option value="">Select category</option>
            {categories.map((row) => (
              <option key={row.id} value={row.name}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={paymentLabelClass}>Receipt</label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#eadfcf] bg-[#fdfbf7] px-4 py-6 text-center dark:border-[#3a342c] dark:bg-[#1a1714]">
            <span className="text-sm font-medium text-[#9a7748]">Click to upload or drag and drop</span>
            <span className="mt-1 text-xs text-[#b3a594]">PDF, PNG, JPG up to 10MB</span>
            {fileName ? <span className="mt-2 text-xs text-[#1c1610]">{fileName}</span> : null}
            <input
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
            />
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className={paymentLabelClass}>Remarks {remark.length}/250</label>
          <textarea
            maxLength={250}
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Notes"
            className="w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[#eadfcf] px-6 py-4 dark:border-[#3a342c]">
        <button type="button" onClick={onClose} className="h-11 rounded-xl border border-[#eadfcf] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="h-11 rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add expense"}
        </button>
      </div>
    </Modal>
  );
}
