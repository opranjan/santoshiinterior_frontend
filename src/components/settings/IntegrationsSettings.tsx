"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Badge from "@/components/ui/badge/Badge";
import { messagingApi, type WhatsAppStatusDto } from "@/services/crmApi";

export default function IntegrationsSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatusDto | null>(null);
  const [statusError, setStatusError] = useState("");

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

  const isLocalhost =
    webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");
  const webhookReceived = Boolean(status?.webhookActivity?.lastReceivedAt);
  const hasInbound = (status?.inboundMessageCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          WhatsApp (Meta Cloud API — Production)
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Outbound messages use Meta API directly. Customer replies only arrive via
          webhook — Meta cannot POST to <code>localhost</code>.
        </p>

        {status ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge size="sm" color={status.configured ? "success" : "error"}>
              {status.configured ? "API configured" : "API not configured"}
            </Badge>
            <Badge size="sm" color={status.templateCheck.ok ? "success" : "warning"}>
              {status.templateCheck.ok ? "Template OK" : "Template issue"}
            </Badge>
            <Badge size="sm" color={status.webhookReady ? "success" : "light"}>
              Webhook token {status.webhookReady ? "set" : "missing"}
            </Badge>
            <Badge size="sm" color={webhookReceived ? "success" : "warning"}>
              Webhook {webhookReceived ? "received" : "not received yet"}
            </Badge>
            <Badge size="sm" color={hasInbound ? "success" : "light"}>
              {hasInbound
                ? `${status.inboundMessageCount} inbound saved`
                : "No inbound messages yet"}
            </Badge>
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
            <Label>Webhook URL (Meta App → WhatsApp → Configuration)</Label>
            <div className="mt-1.5 flex gap-2">
              <Input value={webhookUrl} disabled />
              <Button size="sm" variant="outline" onClick={() => void copy()}>
                {saved ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Verify token: <code>santoshi_crm_verify</code> (must match{" "}
              <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> in backend `.env`)
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/[0.04]">
          <p className="font-medium text-gray-800 dark:text-white/90">
            Backend `.env` (production)
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600 dark:text-gray-300">
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

      <div className="rounded-2xl border border-dashed border-gray-200 p-6 dark:border-gray-700">
        <h3 className="font-medium text-gray-800 dark:text-white/90">How replies work</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>Employee sends from lead Communication tab (works via Meta API)</li>
          <li>Customer replies on WhatsApp</li>
          <li>Meta POSTs to your webhook URL → CRM saves inbound message</li>
          <li>Communication tab auto-refreshes every 3 seconds (or click Fetch replies)</li>
        </ol>
        <p className="mt-3 text-sm text-gray-500">
          <strong>Fetch replies</strong> does not call Meta — it only reloads messages
          already saved by the webhook.
        </p>
      </div>
    </div>
  );
}
