"use client";

import React, { useEffect, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import { paymentsApi, usersApi } from "@/services/crmApi";
import { toIsoDateOrNull } from "@/lib/crmMappers";
import {
  COLLECTION_MODES,
  paymentFieldClass,
  paymentLabelClass,
  paymentSerif,
  todayYmd,
} from "@/components/payments/paymentMoney";

export default function AddFundModal({
  open,
  onClose,
  onCreated,
  projectId,
  projectLabel,
  clientName,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectId: string;
  projectLabel: string;
  clientName?: string;
}) {
  const [collectionDate, setCollectionDate] = useState(todayYmd());
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [collectedBy, setCollectedBy] = useState("");
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([]);
  const [amount, setAmount] = useState("");
  const [contractName, setContractName] = useState("Contract - 1");
  const [fileName, setFileName] = useState("");
  const [petty, setPetty] = useState(false);
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCollectionDate(todayYmd());
    setMethod("BANK_TRANSFER");
    setAmount("");
    setContractName("Contract - 1");
    setFileName("");
    setPetty(false);
    setRemark("");
    usersApi
      .list({ limit: 100 })
      .then((data) => {
        const rows = (data.items || []).map((user) => ({ id: user.id, name: user.name || "User" }));
        setStaff(rows);
        setCollectedBy((current) => current || rows[0]?.name || "");
      })
      .catch(() => setStaff([]));
  }, [open]);

  const save = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toastWarning("Enter a valid amount.");
      return;
    }
    if (!collectionDate) {
      toastWarning("Collection date is required.");
      return;
    }
    try {
      setSaving(true);
      const paidDate = toIsoDateOrNull(collectionDate);
      const body = {
        projectId,
        clientName,
        type: "ADVANCE",
        method,
        amount: value,
        paidAmount: value,
        status: "PAID",
        paidDate,
        collectedBy,
        contractName,
        source: petty ? "PettyCash" : "CompanyAccount",
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
          clientName,
          type: "ADVANCE",
          method,
          amount: value,
          paidAmount: value,
          status: "PAID",
          paidDate,
          remark: [remark, collectedBy && `Collected by: ${collectedBy}`, contractName && `Contract: ${contractName}`]
            .filter(Boolean)
            .join(" · "),
        });
      }
      toastSuccess("Fund added.");
      onCreated();
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to add fund");
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
          Add fund
        </h3>
        <p className="mt-1 text-xs text-[#8a7b68]">{projectLabel}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className={paymentLabelClass}>Collection date *</label>
          <DatePickerField id="fund-date" value={collectionDate} onChange={setCollectionDate} />
        </div>
        <div>
          <label className={paymentLabelClass}>Collection mode *</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={paymentFieldClass}>
            {COLLECTION_MODES.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={paymentLabelClass}>Collected by *</label>
          <select value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} className={paymentFieldClass}>
            <option value="">Select</option>
            {staff.map((row) => (
              <option key={row.id} value={row.name}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={paymentLabelClass}>Amount *</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className={paymentFieldClass} />
        </div>
        <div>
          <label className={paymentLabelClass}>Contract *</label>
          <select value={contractName} onChange={(e) => setContractName(e.target.value)} className={paymentFieldClass}>
            <option value="Contract - 1">Contract - 1</option>
            <option value="Contract - 2">Contract - 2</option>
          </select>
        </div>
        <div>
          <label className={paymentLabelClass}>Attachment</label>
          <label className={`${paymentFieldClass} flex cursor-pointer items-center gap-2`}>
            <span className="text-[#8a7b68]">{fileName || "Upload attachment"}</span>
            <input type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#6b645b] sm:col-span-2">
          <input type="checkbox" checked={petty} onChange={(e) => setPetty(e.target.checked)} />
          Add this amount to my petty fund
        </label>
        <div className="sm:col-span-2">
          <label className={paymentLabelClass}>Remarks {remark.length}/250</label>
          <textarea
            maxLength={250}
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Enter remarks here"
            className="w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714]"
          />
        </div>
      </div>
      <div className="border-t border-[#eadfcf] px-6 py-4 dark:border-[#3a342c]">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="h-11 w-full rounded-xl bg-[#1c1610] text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50"
        >
          {saving ? "Saving..." : "+ Add fund"}
        </button>
      </div>
    </Modal>
  );
}
