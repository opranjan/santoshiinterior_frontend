"use client";

import React, { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Badge from "@/components/ui/badge/Badge";
import {
  telephonyApi,
  type CallLogDto,
  type TelephonyStatusDto,
} from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

function formatPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "—";
  const local = digits.slice(-10);
  return `+91 ${local}`;
}

function statusColor(status: string) {
  if (status === "COMPLETED" || status === "ANSWERED") return "success" as const;
  if (status === "FAILED" || status === "BUSY" || status === "MISSED") return "error" as const;
  if (status === "RINGING" || status === "INITIATED") return "warning" as const;
  return "light" as const;
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
  const [extension, setExtension] = useState(user?.sipExtension || "");

  const load = useCallback(async () => {
    try {
      setError("");
      const [st, list] = await Promise.all([
        telephonyApi.getStatus(),
        telephonyApi.listCalls({ limit: 40 }),
      ]);
      setStatus(st);
      setCalls(list.items || []);
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
    if (user?.sipExtension && !extension) setExtension(user.sipExtension);
  }, [user?.sipExtension, extension]);

  const clickToCall = async () => {
    if (!phone.trim() || dialing) return;
    setDialing(true);
    setError("");
    setNotice("");
    try {
      const result = await telephonyApi.clickToCall({
        to: phone.trim(),
        extension: extension.trim() || undefined,
      });
      setNotice(result.originate.message || "Call originated");
      if (result.originate.mode === "manual" && result.originate.dialFallback) {
        window.location.href = result.originate.dialFallback;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Click-to-call failed");
    } finally {
      setDialing(false);
    }
  };

  const webhookReceived = Boolean(status?.webhookActivity?.lastReceivedAt);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Cloud telephony · Jio SIP trunk
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Click-to-call rings your SIP extension, then dials the customer through the Jio trunk.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {status ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge size="sm" color={status.configured ? "success" : "error"}>
              {status.configured ? "Telephony configured" : "Not configured"}
            </Badge>
            <Badge size="sm" color={status.sipConfigured ? "success" : "warning"}>
              SIP {status.sipConfigured ? "host set" : "host missing"}
            </Badge>
            <Badge size="sm" color={status.clickToCallReady ? "success" : "warning"}>
              Click-to-call {status.clickToCallReady ? "ready" : "not ready"}
            </Badge>
            <Badge size="sm" color={status.amiConfigured ? "success" : "light"}>
              AMI {status.amiConfigured ? "connected config" : "off"}
            </Badge>
            <Badge size="sm" color={status.httpConfigured ? "success" : "light"}>
              HTTP CPaaS {status.httpConfigured ? "on" : "off"}
            </Badge>
            <Badge size="sm" color={webhookReceived ? "success" : "light"}>
              CDR webhook {webhookReceived ? "received" : "waiting"}
            </Badge>
          </div>
        ) : null}

        {status?.sipHost ? (
          <p className="mt-3 text-xs text-gray-500">
            Trunk {status.sipTrunkName} · {status.sipHost}:{status.sipPort} · DID{" "}
            {status.sipDid || "not set"} · codecs {status.sipCodecs}
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-200">
            Add Jio SIP details in backend <code>.env</code> (see Settings → Integrations).
          </p>
        )}
      </div>

      {canCall ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Click to call</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_160px_auto]">
            <div>
              <Label>Customer number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
              />
            </div>
            <div>
              <Label>Your extension</Label>
              <Input
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                placeholder={status?.defaultExtension || "101"}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void clickToCall()} disabled={dialing || !phone.trim()}>
                {dialing ? "Calling…" : "Call"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-error-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Recent calls</h2>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-gray-400">Loading call logs…</p>
        ) : calls.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400">No calls yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
                <tr>
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-5 py-2.5 font-medium">Lead</th>
                  <th className="px-5 py-2.5 font-medium">To</th>
                  <th className="px-5 py-2.5 font-medium">Agent</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                      {new Date(call.startedAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3 text-gray-800 dark:text-white/90">
                      {call.lead?.clientName || "—"}
                    </td>
                    <td className="px-5 py-3">{formatPhone(call.toNumber)}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                      {call.user?.name || call.agentExtension || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge size="sm" color={statusColor(call.status)}>
                        {call.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {call.durationSec != null ? `${call.durationSec}s` : "—"}
                      {call.recordingUrl ? (
                        <a
                          href={call.recordingUrl}
                          className="ml-2 text-[#128c7e] hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Recording
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
