"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

export default function IntegrationsSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const base = window.location.origin.replace(":3000", ":5000");
      setWebhookUrl(`${base}/api/webhooks/interakt`);
    }
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          WhatsApp (Interakt)
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Configure Interakt on the backend server using environment variables.
          Employees send messages from the lead Communication tab; customer replies
          arrive via webhook.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Webhook URL (paste in Interakt Developer Settings)</Label>
            <div className="mt-1.5 flex gap-2">
              <Input value={webhookUrl} disabled />
              <Button size="sm" variant="outline" onClick={() => void copy()}>
                {saved ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/[0.04]">
          <p className="font-medium text-gray-800 dark:text-white/90">
            Backend `.env` variables
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600 dark:text-gray-300">
            <li>
              <code>INTERAKT_API_KEY</code> — from Interakt Developer Settings
            </li>
            <li>
              <code>INTERAKT_WEBHOOK_SECRET</code> — secret you set in Interakt
            </li>
            <li>
              <code>INTERAKT_DEFAULT_TEMPLATE</code> — approved template with one
              body variable for free-text CRM messages
            </li>
            <li>
              <code>INTERAKT_DEFAULT_LANGUAGE</code> — e.g. <code>en</code>
            </li>
          </ul>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Enable webhooks for <strong>message_received</strong> and delivery status
          events in{" "}
          <a
            href="https://app.interakt.ai/settings/developer-setting"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:underline"
          >
            Interakt Developer Settings
          </a>
          .
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-200 p-6 dark:border-gray-700">
        <h3 className="font-medium text-gray-800 dark:text-white/90">Flow</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>Create lead and assign to employee</li>
          <li>Employee opens lead → Communication tab → Send WhatsApp</li>
          <li>Customer receives message on WhatsApp</li>
          <li>Customer replies → Interakt webhook → saved on lead</li>
          <li>Employee sees reply; managers with permission see full thread</li>
        </ol>
      </div>
    </div>
  );
}
