"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  telephonyApi,
  type CallLogDto,
  type TelephonyStatusDto,
} from "@/services/crmApi";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

type CallTab = "all" | "connected" | "missed" | "failed";

function digitsOnly(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function formatPhone(value?: string | null) {
  const local = digitsOnly(value);
  if (!local) return "—";
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(",", "");
}

function formatDuration(sec?: number | null) {
  if (sec == null || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function avgDurationLabel(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isConnected(status: string) {
  return ["COMPLETED", "ANSWERED"].includes(status);
}
function isMissed(status: string) {
  return ["MISSED", "NO_ANSWER"].includes(status);
}
function isFailed(status: string) {
  return ["FAILED", "BUSY"].includes(status);
}
function isRinging(status: string) {
  return ["RINGING", "INITIATED"].includes(status);
}

function statusUi(status: string) {
  if (isConnected(status))
    return { label: "Connected", chip: "bg-emerald-50 text-emerald-800 ring-emerald-100", dot: "bg-emerald-500" };
  if (isFailed(status))
    return { label: "Failed", chip: "bg-rose-50 text-rose-800 ring-rose-100", dot: "bg-rose-500" };
  if (isMissed(status))
    return { label: "Missed", chip: "bg-rose-50 text-rose-700 ring-rose-100", dot: "bg-rose-400" };
  if (isRinging(status))
    return { label: "Ringing", chip: "bg-amber-50 text-amber-800 ring-amber-100", dot: "bg-amber-400" };
  return {
    label: status.replace(/_/g, " "),
    chip: "bg-[#f6f0e6] text-[#6b645b] ring-[#eadfcf]",
    dot: "bg-[#c4b8a8]",
  };
}

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;
const lift = "shadow-[0_1px_2px_rgba(28,22,16,0.05),0_4px_10px_rgba(28,22,16,0.06)]";
const liftHover = "transition duration-200 hover:shadow-[0_2px_4px_rgba(28,22,16,0.06),0_6px_14px_rgba(28,22,16,0.08)]";

function PhoneField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">
        {label}
      </span>
      <div className="flex h-14 overflow-hidden rounded-2xl border border-[#eadfcf] bg-white transition focus-within:border-[#c4a574] focus-within:shadow-[0_0_0_3px_rgba(196,165,116,0.16)]">
        <span className="flex shrink-0 items-center gap-1.5 border-r border-[#eadfcf] bg-[#fbf8f3] px-3.5 text-sm font-medium text-[#1c1610]">
          <span aria-hidden>🇮🇳</span>
          +91
        </span>
        <input
          value={value}
          onChange={(e) => onChange(digitsOnly(e.target.value) || e.target.value.replace(/\D/g, ""))}
          placeholder={placeholder || "98765 43210"}
          inputMode="numeric"
          className="min-w-0 flex-1 bg-transparent px-4 text-[15px] tracking-wide text-[#1c1610] outline-none placeholder:text-[#c4b8a8] dark:text-[#f3ece2]"
        />
      </div>
    </label>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  delta,
  up,
}: {
  icon: React.ReactNode;
  tone: "gold" | "green" | "rose" | "amber";
  label: string;
  value: string | number;
  delta?: string;
  up?: boolean;
}) {
  const tones = {
    gold: { icon: "bg-[#f6ead8] text-[#9a7748]" },
    green: { icon: "bg-emerald-50 text-emerald-700" },
    rose: { icon: "bg-rose-50 text-rose-600" },
    amber: { icon: "bg-amber-50 text-amber-700" },
  };
  const t = tones[tone];
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-[#eadfcf] bg-white p-5 ${lift} ${liftHover}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#e8d5b5] via-[#c4a574] to-[#e8d5b5]" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#f6ead8]/50" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7748]">{label}</p>
          <p className="mt-2 font-serif text-3xl tracking-tight text-[#1c1610]" style={serif}>
            {value}
          </p>
          {delta ? (
            <p className={`mt-2 text-xs ${up ? "text-emerald-600" : "text-rose-500"}`}>
              {delta} <span className="text-[#8a7b68]">vs last 7 days</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-[#b3a594]">vs last 7 days</p>
          )}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${t.icon}`}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function Pill({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  const color = ok
    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
    : warn
      ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
      : "bg-[#f6f0e6] text-[#6b645b] ring-1 ring-[#eadfcf]";
  const dot = ok ? "bg-emerald-500" : warn ? "bg-amber-400" : "bg-[#c4b8a8]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function initials(name?: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() || "").join("");
  return letters || "•";
}

function PhoneIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

export default function TelephonyHub() {
  const { user } = useAuth();
  const canCall = hasAnyPermission(user, ["calls.make", "sales.full", "sales.manage", "leads.manage"]);
  const [status, setStatus] = useState<TelephonyStatusDto | null>(null);
  const [calls, setCalls] = useState<CallLogDto[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialing, setDialing] = useState(false);
  const [phone, setPhone] = useState("");
  const [agentNumber, setAgentNumber] = useState(digitsOnly(user?.phone) || "");
  const [exophone, setExophone] = useState("");
  const [savingExophone, setSavingExophone] = useState(false);
  const [tab, setTab] = useState<CallTab>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const [st, list] = await Promise.all([
        telephonyApi.getStatus(),
        telephonyApi.listCalls({ limit: 100 }),
      ]);
      setStatus(st);
      setCalls(list.items || []);
      const liveId = st.exotelLive?.callerId || st.exotelCallerId || "";
      if (liveId) setExophone(digitsOnly(liveId) || liveId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load telephony");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (user?.phone && !agentNumber) setAgentNumber(digitsOnly(user.phone));
  }, [user?.phone, agentNumber]);

  const connected = Boolean(status?.clickToCallReady);
  const webhookReceived = Boolean(status?.webhookActivity?.lastReceivedAt);

  const saveExophone = async () => {
    if (!exophone.trim() || savingExophone) return;
    setSavingExophone(true);
    setError("");
    setNotice("");
    try {
      const st = await telephonyApi.saveExotel({ exophone: exophone.trim() });
      setStatus(st);
      setNotice("ExoPhone saved. You can click-to-call now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save ExoPhone");
    } finally {
      setSavingExophone(false);
    }
  };

  const clickToCall = async () => {
    if (!digitsOnly(phone) || dialing) return;
    setDialing(true);
    setError("");
    setNotice("");
    try {
      const result = await telephonyApi.clickToCall({
        to: digitsOnly(phone),
        agentNumber: digitsOnly(agentNumber) || undefined,
      });
      if (result.originate.mode === "manual") {
        throw new Error(
          result.originate.message ||
            "Click-to-call is not configured on this server. Use Exotel — do not open the phone app."
        );
      }
      setNotice(result.originate.message || "Exotel is calling your mobile first.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Click-to-call failed");
    } finally {
      setDialing(false);
    }
  };

  const inRange = useCallback(
    (call: CallLogDto) => {
      const t = new Date(call.startedAt).getTime();
      if (fromDate) {
        const start = new Date(`${fromDate}T00:00:00`).getTime();
        if (t < start) return false;
      }
      if (toDate) {
        const end = new Date(`${toDate}T23:59:59`).getTime();
        if (t > end) return false;
      }
      return true;
    },
    [fromDate, toDate]
  );

  const ranged = useMemo(() => calls.filter(inRange), [calls, inRange]);

  const filtered = useMemo(() => {
    if (tab === "connected") return ranged.filter((c) => isConnected(c.status));
    if (tab === "missed") return ranged.filter((c) => isMissed(c.status));
    if (tab === "failed") return ranged.filter((c) => isFailed(c.status));
    return ranged;
  }, [ranged, tab]);

  const stats = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const current = calls.filter((c) => now - new Date(c.startedAt).getTime() <= week);
    const previous = calls.filter((c) => {
      const age = now - new Date(c.startedAt).getTime();
      return age > week && age <= week * 2;
    });
    const count = (list: CallLogDto[], pred: (c: CallLogDto) => boolean) => list.filter(pred).length;
    const total = current.length;
    const connectedN = count(current, (c) => isConnected(c.status));
    const missedN = count(current, (c) => isMissed(c.status));
    const failedN = count(current, (c) => isFailed(c.status));
    const durations = current.map((c) => c.durationSec || 0).filter((n) => n > 0);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const pct = (a: number, b: number) => {
      if (!b && !a) return undefined;
      if (!b) return { text: "↑ new", up: true };
      const d = Math.round(((a - b) / b) * 100);
      return { text: `${d >= 0 ? "↑" : "↓"} ${Math.abs(d)}%`, up: d >= 0 };
    };
    return {
      total,
      connected: connectedN,
      missed: missedN,
      failed: failedN,
      avg,
      totalDelta: pct(total, previous.length),
      connectedDelta: pct(connectedN, count(previous, (c) => isConnected(c.status))),
      missedDelta: pct(missedN, count(previous, (c) => isMissed(c.status))),
      failedDelta: pct(failedN, count(previous, (c) => isFailed(c.status))),
    };
  }, [calls]);

  const exportCsv = () => {
    const rows = [
      ["Date", "Lead", "Customer", "Agent", "Duration", "Status"],
      ...filtered.map((c) => [
        new Date(c.startedAt).toISOString(),
        c.lead?.clientName || "",
        formatPhone(c.toNumber),
        c.user?.name || c.agentExtension || "",
        formatDuration(c.durationSec),
        statusUi(c.status).label,
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exotel-calls.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: CallTab; label: string; count: number }> = [
    { id: "all", label: "All", count: ranged.length },
    { id: "connected", label: "Connected", count: ranged.filter((c) => isConnected(c.status)).length },
    { id: "missed", label: "Missed", count: ranged.filter((c) => isMissed(c.status)).length },
    { id: "failed", label: "Failed", count: ranged.filter((c) => isFailed(c.status)).length },
  ];

  return (
    <div className="space-y-6 py-1 pb-10">
      <section className={`relative overflow-hidden rounded-[28px] border border-[#eadfcf] bg-white ${lift}`}>
        <span className="absolute inset-y-0 left-0 w-1.5 bg-[#c4a574]" />
        <div className="flex flex-col gap-6 p-6 pl-7 lg:flex-row lg:items-start lg:justify-between lg:p-7 lg:pl-8">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f6e4dc] text-[#b4533a]">
              <PhoneIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#9a7748]">Santoshi Interiors · Telephony</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-3xl tracking-tight text-[#1c1610] md:text-4xl" style={serif}>
                  Exotel Cloud
                </h1>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-[#1c1610] ring-1 ring-[#eadfcf]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      connected ? "animate-pulse bg-emerald-500" : "bg-rose-400"
                    }`}
                  />
                  {connected ? "Live" : "Offline"}
                </span>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b645b]">
                Click-to-call rings your mobile first. After you answer, Exotel connects the customer on the ExoPhone.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfcf] bg-white px-4 text-sm font-medium text-[#5c5348] transition hover:bg-[#fbf8f3]"
            >
              Refresh status
            </button>
            <a
              href="https://my.exotel.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#c4a574] px-4 text-sm font-semibold text-[#1c1610] transition hover:bg-[#d4b98a]"
            >
              Manage in Exotel
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[#eadfcf]/80 px-6 py-4 pl-7 lg:px-7 lg:pl-8">
          <Pill ok={Boolean(status?.configured)} label={status?.configured ? "Telephony configured" : "Not configured"} />
          <Pill ok={Boolean(status?.exotelConfigured)} warn={!status?.exotelConfigured} label={status?.exotelConfigured ? "Exotel API ready" : "Exotel needs keys"} />
          <Pill ok={Boolean(status?.clickToCallReady)} warn={!status?.clickToCallReady} label={status?.clickToCallReady ? "Click-to-call ready" : "Click-to-call not ready"} />
          <Pill ok={false} label={status?.sipConfigured ? "SIP on" : "SIP off"} />
          <Pill ok={webhookReceived} warn={!webhookReceived} label={webhookReceived ? "CDR synced" : "CDR sync pending"} />
        </div>

        <div className="grid gap-4 border-t border-[#eadfcf]/80 bg-[#fbf8f3] px-6 py-5 pl-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-7 lg:pl-8">
          <div>
            <p className="text-xs leading-6 text-[#8a7b68]">
              Provider Exotel · {status?.exotelSubdomain || "api.exotel.com"} · ExoPhone{" "}
              <span className="font-medium text-[#1c1610]">{status?.exotelCallerId || status?.exotelLive?.callerId || "not set"}</span>
              {" · "}KYC {status?.exotelLive?.kycStatus || "—"} · Account {status?.exotelLive?.accountType || "trial"}
              {status?.exotelLive?.subdomain ? ` (${status.exotelLive.subdomain})` : ""}
            </p>
            <label className="mt-3 block max-w-md">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">
                ExoPhone
              </span>
              <input
                value={exophone}
                onChange={(e) => setExophone(e.target.value)}
                placeholder="09513886363"
                className="h-11 w-full rounded-2xl border border-[#eadfcf] bg-white px-4 text-sm text-[#1c1610] outline-none placeholder:text-[#c4b8a8] focus:border-[#c4a574]"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void saveExophone()}
            disabled={savingExophone || !exophone.trim()}
            className="h-11 rounded-2xl border border-[#eadfcf] bg-white px-5 text-sm font-medium text-[#5c5348] disabled:opacity-40"
          >
            {savingExophone ? "Saving…" : "Save ExoPhone"}
          </button>
        </div>
      </section>

      {canCall ? (
        <section className={`relative overflow-hidden rounded-[28px] border border-[#eadfcf] bg-white p-6 pl-7 ${lift}`}>
          <span className="absolute inset-y-0 left-0 w-1.5 bg-[#c4a574]" />
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f6e4dc] text-[#b4533a]">
              <PhoneIcon />
            </span>
            <div>
              <h2 className="font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]" style={serif}>
                Click to call
              </h2>
              <p className="mt-1 text-sm text-[#8a7b68]">We’ll call your mobile first, then connect you to the customer.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <PhoneField label="Customer number" value={phone} onChange={setPhone} placeholder="7905592431" />
            <PhoneField label="Your mobile (Agent number)" value={agentNumber} onChange={setAgentNumber} placeholder="9096332191" />
            <button
              type="button"
              onClick={() => void clickToCall()}
              disabled={dialing || !digitsOnly(phone)}
              className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#b4533a] px-10 text-sm font-semibold tracking-wide text-white transition hover:bg-[#9a3f2c] disabled:cursor-not-allowed disabled:bg-[#d7c4b6]"
            >
              <PhoneIcon className="h-4 w-4" />
              {dialing ? "Calling…" : "Call"}
            </button>
          </div>
          {notice ? (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p>
          ) : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p> : null}
        </section>
      ) : (
        <>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={<PhoneIcon className="h-5 w-5" />}
          tone="gold"
          label="Total calls"
          value={stats.total}
          delta={stats.totalDelta?.text}
          up={stats.totalDelta?.up}
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          tone="green"
          label="Connected calls"
          value={stats.connected}
          delta={stats.connectedDelta?.text}
          up={stats.connectedDelta?.up}
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          }
          tone="rose"
          label="Missed calls"
          value={stats.missed}
          delta={stats.missedDelta?.text}
          up={!stats.missedDelta || stats.missedDelta.up === false}
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l2.5 1.5" strokeLinecap="round" />
            </svg>
          }
          tone="amber"
          label="Avg. duration"
          value={avgDurationLabel(stats.avg)}
        />
      </div>

      <section className={`relative overflow-hidden rounded-[28px] border border-[#eadfcf] bg-white ${lift}`}>
        <span className="absolute inset-y-0 left-0 w-1.5 bg-[#c4a574]" />
        <div className="flex flex-col gap-3 border-b border-[#f0e8db] bg-[#fbf8f3] px-5 py-4 pl-7 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={serif}>
            Recent calls
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#eadfcf] bg-white px-3 text-xs text-[#5c5348]">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent outline-none" />
              <span className="text-[#b3a594]">–</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent outline-none" />
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex h-10 items-center rounded-2xl border border-[#eadfcf] bg-white px-4 text-xs font-medium text-[#5c5348]"
            >
              Filters
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-10 items-center rounded-2xl bg-[#c4a574] px-4 text-xs font-semibold text-[#1c1610]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 pl-7 pt-3">
          {tabs.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setTab(row.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === row.id
                  ? "bg-white text-[#7a5a32] ring-1 ring-[#eadfcf]"
                  : "text-[#8a7b68] hover:bg-[#f6f0e6]"
              }`}
            >
              {row.label}
              <span className={`ml-1.5 text-xs ${tab === row.id ? "text-[#9a7748]" : "text-[#b3a594]"}`}>
                {row.count}
              </span>
            </button>
          ))}
        </div>

        {showFilters ? (
          <div className="flex flex-wrap gap-2 px-5 py-3 text-xs text-[#8a7b68]">
            Showing {filtered.length} calls
            {(fromDate || toDate) && (
              <button type="button" className="font-medium text-[#9a7748]" onClick={() => { setFromDate(""); setToDate(""); }}>
                Clear dates
              </button>
            )}
          </div>
        ) : null}

        {loading ? (
          <div className="p-5">
            <TableSkeleton rows={7} cols={7} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-serif text-lg text-[#1c1610]" style={serif}>No calls in this view</p>
            <p className="mt-1 text-sm text-[#8a7b68]">Place a click-to-call and the log will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                  {["Date & time", "Lead", "Customer number", "Agent", "Duration", "Status", "Recording", "Actions"].map(
                    (h) => (
                      <th key={h} className="whitespace-nowrap px-5 py-3">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((call) => {
                  const ui = statusUi(call.status);
                  const name = call.lead?.clientName || "Unknown";
                  return (
                    <tr
                      key={call.id}
                      className="border-t border-[#f0e8db] transition hover:bg-[#fbf8f3] dark:border-[#2a241c] dark:hover:bg-white/5"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-[#5c5348]">{formatWhen(call.startedAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6ead8] text-[11px] font-semibold text-[#7a5a32]">
                            {initials(name)}
                          </span>
                          <div>
                            <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{name}</p>
                            {call.note ? <p className="text-xs text-[#8a7b68]">{call.note}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-[#1c1610] dark:text-[#e8d5b5]">
                        {formatPhone(call.toNumber)}
                      </td>
                      <td className="px-5 py-4 text-[#5c5348]">{call.user?.name || call.agentExtension || "—"}</td>
                      <td className="px-5 py-4 font-medium tabular-nums text-[#1c1610] dark:text-[#f3ece2]">
                        {formatDuration(call.durationSec)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ui.chip}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
                          {ui.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {call.recordingUrl ? (
                          <div className="flex items-center gap-2">
                            <audio controls preload="none" className="h-8 max-w-[160px]">
                              <source src={call.recordingUrl} />
                            </audio>
                            <a href={call.recordingUrl} download className="text-[#9a7748] hover:text-[#1c1610]" title="Download">
                              ⬇
                            </a>
                          </div>
                        ) : (
                          <span className="text-[#c4b8a8]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {call.leadId ? (
                          <a
                            href={`/sales/leads?lead=${call.leadId}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8a7b68] hover:bg-[#f0e8db] hover:text-[#1c1610]"
                          >
                            ⋯
                          </a>
                        ) : (
                          <span className="text-[#c4b8a8]">⋯</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
