"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { messagingApi, telephonyApi, type TelephonyStatusDto, type WhatsAppStatusDto } from "@/services/crmApi";

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        ok
          ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
          : "bg-[#eadfcf] text-[#8a7b68] dark:bg-[#2a251f] dark:text-[#a89880]"
      }`}
    >
      {label}
    </span>
  );
}

export default function IntegrationsSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatusDto | null>(null);
  const [statusError, setStatusError] = useState("");
  const [telWebhookUrl, setTelWebhookUrl] = useState("");
  const [telCopied, setTelCopied] = useState(false);
  const [telStatus, setTelStatus] = useState<TelephonyStatusDto | null>(null);
  const [telStatusError, setTelStatusError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setStatusError("");
        const data = await messagingApi.getStatus();
        setStatus(data);
        if (data.recommendedWebhookUrl) {
          setWebhookUrl(data.recommendedWebhookUrl);
        } else if (typeof window !== "undefined") {
          const base = window.location.origin.replace(":3000", ":5000");
          setWebhookUrl(`${base}/api/webhooks/whatsapp`);
        }
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : "Could not load WhatsApp status");
      }
      try {
        setTelStatusError("");
        const tel = await telephonyApi.getStatus();
        setTelStatus(tel);
        if (tel.recommendedWebhookUrl) {
          setTelWebhookUrl(tel.recommendedWebhookUrl);
        } else if (typeof window !== "undefined") {
          const base = window.location.origin.replace(":3000", ":5000");
          setTelWebhookUrl(`${base}/api/webhooks/telephony`);
        }
      } catch (err) {
        setTelStatusError(err instanceof Error ? err.message : "Could not load telephony status");
      }
    })();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  const copyTel = async () => {
    try {
      await navigator.clipboard.writeText(telWebhookUrl);
      setTelCopied(true);
      setTimeout(() => setTelCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isLocalhost =
    webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");
  const webhookReceived = Boolean(status?.webhookActivity?.lastReceivedAt);
  const hasInbound = (status?.inboundMessageCount ?? 0) > 0;
  const telWebhookReceived = Boolean(telStatus?.webhookActivity?.lastReceivedAt);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/settings"
          className="mb-2 inline-flex text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
        >
          ← Settings
        </Link>
        <h1
          className="font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Integrations
        </h1>
        <p className="mt-1 text-sm text-[#8a7b68]">
          WhatsApp Cloud API and Jio SIP telephony for this CRM.
        </p>
      </div>

      <div className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-6 dark:border-[#3a342c] dark:bg-[#161411]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">Messaging</p>
        <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          WhatsApp (Meta Cloud API — Production)
        </h2>
        <p className="mt-2 text-sm text-[#8a7b68]">
          Outbound messages use Meta API directly. Customer replies only arrive via
          webhook — Meta cannot POST to <code>localhost</code>.
        </p>

        {status ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill ok={status.configured} label={status.configured ? "API configured" : "API not configured"} />
            <Pill ok={status.templateCheck.ok} label={status.templateCheck.ok ? "Template OK" : "Template issue"} />
            <Pill ok={status.webhookReady} label={status.webhookReady ? "Webhook token set" : "Webhook token missing"} />
            <Pill ok={webhookReceived} label={webhookReceived ? "Webhook received" : "Webhook not received yet"} />
            <Pill ok={hasInbound} label={hasInbound ? `${status.inboundMessageCount} inbound saved` : "No inbound messages yet"} />
          </div>
        ) : null}

        {isLocalhost ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-medium">Customer replies will not work on localhost</p>
            <p className="mt-1">
              Meta must reach your backend over public HTTPS. For local testing:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Run <code>ngrok http 5000</code> (or Cloudflare Tunnel)
              </li>
              <li>
                Add to backend <code>.env</code>:{" "}
                <code>PUBLIC_API_URL=https://YOUR-NGROK-URL</code>
              </li>
              <li>Restart backend and copy the webhook URL below into Meta</li>
              <li>
                In Meta App → WhatsApp → Configuration → Webhook, subscribe to{" "}
                <strong>messages</strong>
              </li>
            </ol>
          </div>
        ) : null}

        {!webhookReceived && !isLocalhost ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            No webhook events received since the server started. Confirm the URL
            below is registered in Meta and the <strong>messages</strong> field is
            subscribed.
          </div>
        ) : null}

        {status && !status.templateCheck.ok ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {status.templateCheck.reason}
            {status.approvedTemplates.length ? (
              <p className="mt-2">
                Approved on this account:{" "}
                {status.approvedTemplates.map((t) => t.name).join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {statusError ? (
          <p className="mt-4 text-sm text-error-600">{statusError}</p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Webhook URL (Meta App → WhatsApp → Configuration)</label>
            <div className="mt-1.5 flex gap-2">
              <input value={webhookUrl} disabled className="h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]" />
              <button type="button" onClick={() => void copy()} className="inline-flex h-11 shrink-0 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]">
                {saved ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#8a7b68]">
              Verify token: <code>santoshi_crm_verify</code> (must match{" "}
              <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> in backend `.env`)
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#eadfcf] bg-white p-4 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]">
          <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
            Backend `.env` (production)
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[#8a7b68]">
            <li><code>PUBLIC_API_URL</code> — public HTTPS base (ngrok or live domain)</li>
            <li><code>WHATSAPP_ACCESS_TOKEN</code> — permanent system user token</li>
            <li><code>WHATSAPP_PHONE_NUMBER_ID</code> — production phone number ID</li>
            <li><code>WHATSAPP_BUSINESS_ACCOUNT_ID</code> — WABA ID</li>
            <li><code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> — must match Meta webhook</li>
            <li><code>WHATSAPP_APP_SECRET</code> — required for secure webhooks</li>
            <li><code>WHATSAPP_DEFAULT_TEMPLATE</code> — approved template on this WABA</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f3] p-6 dark:border-[#3a342c] dark:bg-[#161411]">
        <h3 className="font-serif text-lg text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>How replies work</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#8a7b68]">
          <li>Employee sends from lead Communication tab (works via Meta API)</li>
          <li>Customer replies on WhatsApp</li>
          <li>Meta POSTs to your webhook URL → CRM saves inbound message</li>
          <li>Communication tab auto-refreshes every 3 seconds (or click Fetch replies)</li>
        </ol>
        <p className="mt-3 text-sm text-[#8a7b68]">
          <strong>Fetch replies</strong> does not call Meta — it only reloads messages
          already saved by the webhook.
        </p>
      </div>

      <div className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-6 dark:border-[#3a342c] dark:bg-[#161411]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">Telephony</p>
        <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Jio SIP trunk · cloud telephony
        </h2>
        <p className="mt-2 text-sm text-[#8a7b68]">
          Jio Business SIP connects to your IP-PBX (FreePBX / Asterisk). The CRM
          originates click-to-call through AMI or a CPaaS HTTP API, then stores CDRs.
        </p>

        {telStatus ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill ok={telStatus.configured} label={telStatus.configured ? "Telephony configured" : "Not configured"} />
            <Pill ok={telStatus.sipConfigured} label={telStatus.sipConfigured ? "SIP host set" : "SIP missing"} />
            <Pill ok={telStatus.clickToCallReady} label={telStatus.clickToCallReady ? "Click-to-call ready" : "Needs AMI or HTTP"} />
            <Pill ok={telWebhookReceived} label={telWebhookReceived ? "CDR received" : "CDR waiting"} />
          </div>
        ) : null}

        {telStatusError ? (
          <p className="mt-4 text-sm text-error-600">{telStatusError}</p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">CDR webhook (PBX / JioCX → CRM)</label>
            <div className="mt-1.5 flex gap-2">
              <input value={telWebhookUrl} disabled className="h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]" />
              <button type="button" onClick={() => void copyTel()} className="inline-flex h-11 shrink-0 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]">
                {telCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#8a7b68]">
              Send header <code>x-telephony-token</code> matching{" "}
              <code>TELEPHONY_WEBHOOK_TOKEN</code>.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#eadfcf] bg-white p-4 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]">
          <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">Backend `.env` (Jio SIP)</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[#8a7b68]">
            <li><code>JIO_SIP_HOST</code> / <code>JIO_SIP_PORT</code> — registrar from Jio</li>
            <li><code>JIO_SIP_USERNAME</code> / <code>JIO_SIP_PASSWORD</code> — SIP auth if required (often IP-only)</li>
            <li><code>JIO_SIP_DID</code> — caller ID / landline DID</li>
            <li><code>JIO_SIP_TRUNK_NAME</code> — FreePBX trunk name (default jio-trunk)</li>
            <li><code>AMI_HOST</code> / <code>AMI_USERNAME</code> / <code>AMI_SECRET</code> — Asterisk click-to-call</li>
            <li><code>TELEPHONY_DEFAULT_EXTENSION</code> or user SIP extension in Users</li>
            <li><code>TELEPHONY_CLICK_TO_CALL_URL</code> — optional JioCX / CPaaS HTTP originate</li>
            <li><code>TELEPHONY_PROVIDER</code> — ami | http | manual</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
