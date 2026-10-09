"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { hrApi } from "@/services/crmApi";
import { mapEmployee } from "@/lib/crmMappers";
import { deptLabel, empCode, inr } from "./hrDisplay";
import { printSalarySlipPdf } from "@/lib/salarySlipPrint";
import HrPageHeader from "./HrPageHeader";

type Emp = ReturnType<typeof mapEmployee>;
type Components = {
  basicSalary: number;
  hra: number;
  otherAllowance: number;
  incentive: number;
  employeePf: number;
  employerPf: number;
  noticeRetention: number;
  lopDays: number;
  lopAmount: number;
};
type Slip = {
  employee: {
    id: string;
    name: string;
    employeeCode?: string | null;
    department?: string;
    roleTitle?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
  };
  month: string;
  payPeriod: { from: string; to: string };
  paymentDate: string;
  status: string;
  saved: boolean;
  components: Components;
  totals: { gross: number; ctc: number; deductions: number; net: number; paid: number };
};

const emptyComponents: Components = {
  basicSalary: 0,
  hra: 0,
  otherAllowance: 0,
  incentive: 0,
  employeePf: 0,
  employerPf: 0,
  noticeRetention: 0,
  lopDays: 0,
  lopAmount: 0,
};

function money(n: unknown) {
  return Number(n || 0);
}

function fmtDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(month: string) {
  return new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function maskAccount(value?: string | null) {
  const s = String(value || "").replace(/\s+/g, "");
  if (!s) return "—";
  if (s.length <= 4) return s;
  return `${"X".repeat(s.length - 4)}${s.slice(-4)}`;
}

function MiniIcon({ name }: { name: string }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    className: "h-4 w-4",
  };
  if (name === "ctc")
    return (
      <svg {...p}>
        <ellipse cx="12" cy="8" rx="7" ry="3" />
        <path d="M5 8v4c0 1.7 3.1 3 7 3s7-1.3 7-3V8M5 12v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
      </svg>
    );
  if (name === "gross")
    return (
      <svg {...p}>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  if (name === "notice")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M12 3v18M8 8c0-2 8-2 8 2s-8 1.5-8 4 8 2 8 0" />
    </svg>
  );
}

export default function HrSalarySlipPage() {
  const params = useSearchParams();
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [employeeId, setEmployeeId] = useState(params.get("employee") || "");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [slip, setSlip] = useState<Slip | null>(null);
  const [form, setForm] = useState<Components>(emptyComponents);
  const [bank, setBank] = useState({ employeeCode: "", bankName: "", accountNumber: "", ifscCode: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }),
    []
  );

  useEffect(() => {
    hrApi.listEmployees({ limit: 200 }).then((data) => {
      const rows = (data.items || []).map((row) => mapEmployee(row));
      setEmployees(rows);
      setEmployeeId((id) => id || rows[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    if (!employeeId || !month) return;
    let live = true;
    setLoading(true);
    setError("");
    hrApi
      .getSalarySlip({ employeeId, month })
      .then((row) => {
        if (!live) return;
        const data = row as unknown as Slip;
        setSlip(data);
        setForm({
          basicSalary: money(data.components?.basicSalary),
          hra: money(data.components?.hra),
          otherAllowance: money(data.components?.otherAllowance),
          incentive: money(data.components?.incentive),
          employeePf: money(data.components?.employeePf),
          employerPf: money(data.components?.employerPf),
          noticeRetention: money(data.components?.noticeRetention),
          lopDays: money(data.components?.lopDays),
          lopAmount: money(data.components?.lopAmount),
        });
        setBank({
          employeeCode: data.employee?.employeeCode || "",
          bankName: data.employee?.bankName || "",
          accountNumber: data.employee?.accountNumber || "",
          ifscCode: data.employee?.ifscCode || "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load salary slip"))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [employeeId, month]);

  const empIndex = Math.max(0, employees.findIndex((e) => e.id === employeeId));
  const emp = employees[empIndex];
  const live = useMemo(() => {
    const basic = money(form.basicSalary);
    const hra = money(form.hra);
    const other = money(form.otherAllowance);
    const incentive = money(form.incentive);
    const pf = money(form.employeePf);
    const employerPf = money(form.employerPf);
    const notice = money(form.noticeRetention);
    const lop = money(form.lopAmount);
    const gross = basic + hra + other + incentive;
    const deductions = pf + lop;
    const net = Math.max(0, gross - deductions);
    const ctc = gross + employerPf;
    const paid = Math.max(0, ctc - notice);
    return { gross, deductions, net, ctc, paid };
  }, [form]);

  const save = async () => {
    if (!employeeId) return;
    setSaving(true);
    setError("");
    try {
      const row = await hrApi.saveSalarySlip({
        employeeId,
        month,
        ...form,
        ...bank,
        status: slip?.status || "PENDING",
        paymentDate: slip?.paymentDate,
      });
      const data = row as unknown as Slip;
      setSlip(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save salary slip");
    } finally {
      setSaving(false);
    }
  };

  const setAmt = (key: keyof Components, value: string) => {
    setForm((prev) => ({ ...prev, [key]: Number(value || 0) }));
  };

  const paid = slip?.status === "PAID";
  const code = bank.employeeCode || (emp ? empCode(emp.id, empIndex) : "—");

  const downloadPdf = () => {
    if (!emp) return;
    const amt = (n: number) => n.toLocaleString("en-IN");
    printSalarySlipPdf({
      title: `Salary-Slip-${emp.name.replace(/\s+/g, "-")}-${month}`,
      monthLabel: monthLabel(month),
      employeeName: emp.name,
      employeeCode: code,
      department: deptLabel(slip?.employee.department || emp.department),
      designation: slip?.employee.roleTitle || emp.role || "—",
      payPeriod: `${fmtDate(slip?.payPeriod.from)} – ${fmtDate(slip?.payPeriod.to)}`,
      paymentDate: fmtDate(slip?.paymentDate),
      status: paid ? "Paid" : "Pending",
      amountPaid: inr(live.paid),
      ctc: inr(live.ctc),
      gross: inr(live.gross),
      notice: inr(form.noticeRetention),
      netPaid: inr(live.paid),
      netSalary: inr(live.net),
      earnings: [
        { label: "Basic Salary", amount: amt(form.basicSalary) },
        { label: "House Rent Allowance (HRA)", amount: amt(form.hra) },
        { label: "Other Allowance", amount: amt(form.otherAllowance) },
        { label: "Incentive (Variable)", amount: amt(form.incentive) },
      ],
      deductions: [
        { label: "Employee PF", amount: amt(form.employeePf) },
        ...(form.lopAmount > 0
          ? [{ label: `Loss of Pay (${form.lopDays} days)`, amount: amt(form.lopAmount) }]
          : []),
      ],
      totalDeductions: amt(live.deductions),
      ctcRows: [
        { label: "Basic Salary", amount: amt(form.basicSalary) },
        { label: "House Rent Allowance (HRA)", amount: amt(form.hra) },
        { label: "Other Allowance", amount: amt(form.otherAllowance) },
        { label: "Incentive (Variable)", amount: amt(form.incentive) },
        { label: "Employer PF", amount: amt(form.employerPf) },
      ],
      employerPf: amt(form.employerPf),
      bankName: bank.bankName || "—",
      accountNumber: maskAccount(bank.accountNumber),
      ifsc: bank.ifscCode || "—",
      logoUrl: `${window.location.origin}/images/logo/santoshi-interiors.jpg`,
    });
  };

  return (
    <div className="space-y-5">
      <div className="no-print">
      <HrPageHeader
        crumb="Payroll › Salary Slip"
        title="Salary Slip"
        subtitle="Amounts come from the employee’s pay setup, this month’s attendance (LOP), and any saved slip."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
            >
              {monthOptions.map((value) => (
                <option key={value} value={value}>
                  {monthLabel(value)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !employeeId}
              className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save pay setup"}
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white hover:bg-[#b3915f]"
            >
              Download PDF
            </button>
          </div>
        }
      />
      </div>

      {error ? <p className="no-print text-sm text-error-600">{error}</p> : null}
      {loading ? <p className="text-sm text-[#8a7b68]">Loading salary slip…</p> : null}

      {!emp ? (
        <p className="text-sm text-[#8a7b68]">Add employees first, then set their salary on this page.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <article className="salary-slip-sheet overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
            <header className="flex items-center justify-between bg-[#c4a574] px-5 py-3 text-[#1c1610]">
              <span className="text-sm font-semibold">Salary Slip</span>
              <span className="text-xs font-medium">{monthLabel(month)}</span>
            </header>

            <div className="space-y-5 p-5">
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="no-print h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-3">
                <img src="/images/logo/santoshi-interiors.jpg" alt="" className="h-11 w-11 rounded-md object-contain" />
                <div>
                  <p className="text-base font-semibold text-[#1c1610] dark:text-[#f3ece2]">Santoshi Interiors</p>
                  <p className="text-sm text-[#8a7b68]">Mumbai, Maharashtra</p>
                </div>
              </div>

              <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5 text-sm">
                {[
                  ["Employee Name", emp.name],
                  ["Employee ID", code],
                  ["Department", deptLabel(slip?.employee.department || emp.department)],
                  ["Designation", slip?.employee.roleTitle || emp.role || "—"],
                  ["Pay Period", `${fmtDate(slip?.payPeriod.from)} – ${fmtDate(slip?.payPeriod.to)}`],
                  ["Payment Date", fmtDate(slip?.paymentDate)],
                ].map(([label, value]) => (
                  <React.Fragment key={label}>
                    <dt className="text-[#8a7b68]">{label}</dt>
                    <dd className="font-medium text-[#1c1610] dark:text-[#f3ece2]">: {value}</dd>
                  </React.Fragment>
                ))}
              </dl>

              <div>
                <p className="text-sm text-[#8a7b68]">Amount Paid</p>
                <p className="flex flex-wrap items-center gap-3 text-[2rem] font-semibold leading-none text-[#1c1610] dark:text-[#f3ece2]">
                  {inr(live.paid)}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${paid ? "bg-[#e7f6ec] text-[#2f7a45]" : "bg-[#f4ead8] text-[#9a7748]"}`}>
                    {paid ? "Paid" : "Pending"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-[#8a7b68]">
                  {paid ? "Credited to the employee bank account" : "Will credit on the payment date after you save"}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Total CTC", live.ctc, "ctc", "bg-[#f4ead8] text-[#9a7748]"],
                  ["Gross Salary", live.gross, "gross", "bg-[#efe4d2] text-[#6b4f24]"],
                  ["Notice Retention", form.noticeRetention, "notice", "bg-[#fff3e6] text-[#c47a2b]"],
                  ["Net Paid", live.paid, "paid", "bg-[#eaf8ef] text-[#2f7a45]"],
                ].map(([label, amt, icon, color]) => (
                  <div key={String(label)} className="rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 py-3">
                    <span className={`mb-2 grid h-8 w-8 place-items-center rounded-lg ${color}`}>
                      <MiniIcon name={String(icon)} />
                    </span>
                    <p className="text-[11px] text-[#8a7b68]">{label}</p>
                    <p className="text-sm font-semibold">{inr(Number(amt))}</p>
                  </div>
                ))}
              </div>

              <section className="overflow-hidden rounded-xl border border-[#eadfcf] bg-[#fbf8f3]">
                <h3 className="px-4 pt-3 text-sm font-semibold text-[#9a7748]">Earnings</h3>
                {[
                  ["Basic Salary", form.basicSalary],
                  ["House Rent Allowance (HRA)", form.hra],
                  ["Other Allowance", form.otherAllowance],
                  ["Incentive (Variable)", form.incentive],
                ].map(([label, amt]) => (
                  <div key={String(label)} className="flex justify-between border-t border-[#eadfcf] px-4 py-2 text-sm">
                    <span>{label}</span>
                    <span>{Number(amt).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#eadfcf] bg-[#efe4d2] px-4 py-2.5 text-sm font-semibold text-[#6b4f24]">
                  <span>Gross Earnings (A)</span>
                  <span>{live.gross.toLocaleString("en-IN")}</span>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#eadfcf] bg-[#fbf8f3]">
                <h3 className="px-4 pt-3 text-sm font-semibold text-[#8a5a48]">Deductions</h3>
                <div className="flex justify-between border-t border-[#eadfcf] px-4 py-2 text-sm">
                  <span>Employee PF</span>
                  <span>{form.employeePf.toLocaleString("en-IN")}</span>
                </div>
                {form.lopAmount > 0 ? (
                  <div className="flex justify-between border-t border-[#eadfcf] px-4 py-2 text-sm">
                    <span>Loss of Pay ({form.lopDays} days)</span>
                    <span>{form.lopAmount.toLocaleString("en-IN")}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-[#eadfcf] bg-[#efe4d2] px-4 py-2.5 text-sm font-semibold text-[#8a5a48]">
                  <span>Total Deductions (B)</span>
                  <span>{live.deductions.toLocaleString("en-IN")}</span>
                </div>
              </section>

              <div className="flex justify-between rounded-xl bg-[#e8f7ee] px-4 py-3 text-sm font-semibold text-[#2f7a45]">
                <span>Net Salary (A − B)</span>
                <span>{inr(live.net)}</span>
              </div>
            </div>
          </article>

          <aside className="space-y-4">
            <section className="no-print rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
              <h3 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">Pay setup (saved on employee)</h3>
              <p className="mt-1 text-xs text-[#8a7b68]">Edit these numbers, then Save. Next months reuse the same CTC unless you change them. Incentive and LOP can differ each month.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["basicSalary", "Basic"],
                  ["hra", "HRA"],
                  ["otherAllowance", "Other"],
                  ["incentive", "Incentive"],
                  ["employeePf", "Employee PF"],
                  ["employerPf", "Employer PF"],
                  ["noticeRetention", "Notice hold"],
                  ["lopAmount", "LOP amount"],
                ].map(([key, label]) => (
                  <label key={key} className="text-[11px] text-[#8a7b68]">
                    {label}
                    <input
                      type="number"
                      min={0}
                      value={form[key as keyof Components]}
                      onChange={(e) => setAmt(key as keyof Components, e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-2 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                    />
                  </label>
                ))}
                <label className="text-[11px] text-[#8a7b68]">
                  Employee ID
                  <input value={bank.employeeCode} onChange={(e) => setBank((b) => ({ ...b, employeeCode: e.target.value }))} placeholder="EMP001" className="mt-1 h-10 w-full rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-2 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" />
                </label>
                <label className="text-[11px] text-[#8a7b68]">
                  Bank
                  <input value={bank.bankName} onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-2 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" />
                </label>
                <label className="text-[11px] text-[#8a7b68]">
                  Account
                  <input value={bank.accountNumber} onChange={(e) => setBank((b) => ({ ...b, accountNumber: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-2 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" />
                </label>
                <label className="text-[11px] text-[#8a7b68]">
                  IFSC
                  <input value={bank.ifscCode} onChange={(e) => setBank((b) => ({ ...b, ifscCode: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-2 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" />
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3]">
              <h3 className="px-5 pt-4 text-sm font-semibold text-[#9a7748]">CTC Breakdown (Monthly)</h3>
              {[
                ["Basic Salary", form.basicSalary],
                ["House Rent Allowance (HRA)", form.hra],
                ["Other Allowance", form.otherAllowance],
                ["Incentive (Variable)", form.incentive],
                ["Employer PF", form.employerPf],
              ].map(([label, amt]) => (
                <div key={String(label)} className="flex justify-between border-t border-[#eadfcf] px-5 py-2 text-sm">
                  <span>{label}</span>
                  <span>{Number(amt).toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="flex justify-between bg-[#efe4d2] px-5 py-3 text-sm font-semibold text-[#6b4f24]">
                <span>Total CTC</span>
                <span>{inr(live.ctc)}</span>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#f4ead8] p-5">
              <h3 className="text-sm font-semibold text-[#9a7748]">Notice Period Retention</h3>
              <div className="mt-2 flex justify-between text-sm">
                <span>Hold by company</span>
                <span>{form.noticeRetention.toLocaleString("en-IN")}</span>
              </div>
              <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-[#8a6a20]">
                Released in Full & Final as per policy. LOP this month is taken from attendance (absent / half day).
              </p>
            </section>

            <section className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
              <h3 className="mb-3 text-sm font-semibold">Payment Details</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ["Bank Name", bank.bankName || "—"],
                  ["Account Number", maskAccount(bank.accountNumber)],
                  ["IFSC Code", bank.ifscCode || "—"],
                  ["Payment Date", fmtDate(slip?.paymentDate)],
                  ["Amount Paid", inr(live.paid)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-[#8a7b68]">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
