"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import {
  customersApi,
  messagingApi,
  type CustomerMessageKind,
} from "@/services/crmApi";

export type SendTarget = {
  id: string;
  name: string;
  phone: string;
};

type Props = {
  open: boolean;
  kind: CustomerMessageKind;
  customers: SendTarget[];
  onClose: () => void;
  onSent: (lastContactIso: string) => void;
};

const titles: Record<CustomerMessageKind, string> = {
  whatsapp: "Send WhatsApp",
  broadcast: "Broadcast message",
  marketing: "Marketing message",
};

const hints: Record<CustomerMessageKind, string> = {
  whatsapp:
    "Sends a chat message to this customer. If the 24-hour window is closed, an approved template is used.",
  broadcast:
    "Sends the same WhatsApp template/message to every selected customer.",
  marketing:
    "Sends a marketing template (offers, collections, showroom updates). Meta requires an approved marketing template.",
};

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function waMeUrl(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  if (!full) return "";
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${full}${q}`;
}

export default function CustomerSendModal({
  open,
  kind,
  customers,
  onClose,
  onSent,
}: Props) {
  const [body, setBody] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [templates, setTemplates] = useState<
    Array<{ name: string; language: string; category?: string | null }>
  >([]);
  const [configured, setConfigured] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    setBody("");
    setTemplateKey("");
    setError("");
    setNotice("");
    setSaving(false);
    messagingApi
      .getStatus()
      .then((status) => {
        setConfigured(Boolean(status.configured));
        const rows = status.approvedTemplates || [];
        setTemplates(rows);
        const marketingFirst = rows.find(
          (row) => String(row.category || "").toUpperCase() === "MARKETING"
        );
        const pick =
          kind === "marketing"
            ? marketingFirst || rows[0]
            : rows[0];
        if (pick) setTemplateKey(`${pick.name}::${pick.language || ""}`);
      })
      .catch(() => undefined);
  }, [open, kind]);

  const visibleTemplates = useMemo(() => {
    if (kind !== "marketing") return templates;
    const marketing = templates.filter(
      (row) => String(row.category || "").toUpperCase() === "MARKETING"
    );
    return marketing.length ? marketing : templates;
  }, [kind, templates]);

  if (!open) return null;

  const [templateName, languageCode] = templateKey.split("::");
  const preview = customers.slice(0, 8);
  const extra = Math.max(0, customers.length - preview.length);

  const submit = async () => {
    setError("");
    setNotice("");
    if (!customers.length) {
      setError("Select at least one customer.");
      return;
    }
    if (kind === "whatsapp" && !body.trim()) {
      setError("Write a WhatsApp message.");
      return;
    }
    try {
      setSaving(true);
      const result = await customersApi.sendMessages({
        customerIds: customers.map((c) => c.id),
        kind,
        body: body.trim() || undefined,
        templateName: templateName || undefined,
        languageCode: languageCode || undefined,
      });
      const failed = result.results.filter((row) => !row.ok);
      if (result.sent > 0) {
        onSent(new Date().toISOString());
      }
      if (failed.length && result.sent === 0) {
        setError(failed[0]?.error || "Send failed");
        return;
      }
      setNotice(
        failed.length
          ? `Sent to ${result.sent}. Failed for ${failed.length}: ${failed
              .map((row) => row.name)
              .join(", ")}`
          : `Sent to ${result.sent} customer${result.sent === 1 ? "" : "s"}.`
      );
      if (!failed.length) {
        setTimeout(onClose, 700);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSaving(false);
    }
  };

  const single = customers.length === 1 ? customers[0] : null;
  const chatUrl = single ? waMeUrl(single.phone, body) : "";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {titles[kind]}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{hints[kind]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Recipients ({customers.length})
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {preview.map((c) => c.name).join(", ")}
            {extra ? ` +${extra} more` : ""}
          </p>
        </div>

        {!configured ? (
          <p className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-700">
            WhatsApp Cloud API is not configured. You can still open a chat for
            one customer, or add credentials in Settings → Integrations.
          </p>
        ) : null}

        {kind !== "whatsapp" || visibleTemplates.length ? (
          <div className="mb-4">
            <Label>WhatsApp template</Label>
            <select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              className={fieldClass}
            >
              <option value="">Default template</option>
              {visibleTemplates.map((row) => (
                <option
                  key={`${row.name}-${row.language}`}
                  value={`${row.name}::${row.language || ""}`}
                >
                  {row.name}
                  {row.category ? ` · ${row.category}` : ""}
                  {row.language ? ` (${row.language})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <Label>
            {kind === "whatsapp" ? "Message" : "Message / template text"}
          </Label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              kind === "marketing"
                ? "Offer copy. Use {{name}} or {{city}} to personalise."
                : "Type the message. Use {{name}} or {{city}} to personalise."
            }
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        {error ? (
          <p className="mt-3 text-sm text-error-500">{error}</p>
        ) : null}
        {notice ? (
          <p className="mt-3 text-sm text-success-600">{notice}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {chatUrl && kind === "whatsapp" ? (
            <a href={chatUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">
                Open WhatsApp
              </Button>
            </a>
          ) : null}
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={saving || !customers.length}
          >
            {saving ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
