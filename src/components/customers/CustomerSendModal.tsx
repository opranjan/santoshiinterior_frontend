"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import {
  customersApi,
  messagingApi,
  type CustomerMessageKind,
  type WhatsAppStatusDto,
} from "@/services/crmApi";
import WhatsAppTemplatePreview, {
  OFFER_SERVICES_LINE,
} from "@/components/customers/WhatsAppTemplatePreview";

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
    "Uses the interior_design_offer template: image header, {{1}} first name, {{2}} services list.",
  broadcast:
    "Sends the same WhatsApp template to every selected customer. Defaults to interior_design_offer.",
  marketing:
    "Send from this customer list. Default is interior_design_offer (image header, {{1}} name, {{2}} services). If WhatsApp does not deliver it, switch the template below to start_chat_ut or followup (Utility).",
};

const OFFER_TEMPLATE = "interior_design_offer";
const SERVICE_TEMPLATES = ["interior_design_services", "interior_design_service"];
const UTILITY_TEMPLATES = ["start_chat_ut", "followup"];
const MARKETING_PREFERRED = [
  OFFER_TEMPLATE,
  ...SERVICE_TEMPLATES,
  ...UTILITY_TEMPLATES,
];

type TemplateRow = WhatsAppStatusDto["approvedTemplates"][number];

function pickTemplate(kind: CustomerMessageKind, rows: TemplateRow[]) {
  const preferred =
    kind === "marketing" ? MARKETING_PREFERRED : [OFFER_TEMPLATE, ...UTILITY_TEMPLATES];
  for (const name of preferred) {
    const match = rows.find((row) => row.name === name);
    if (match) return match;
  }
  if (kind === "marketing") {
    const marketing = rows.find(
      (row) => String(row.category || "").toUpperCase() === "MARKETING"
    );
    if (marketing) return marketing;
  }
  return rows[0];
}

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
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [servicesLine, setServicesLine] = useState(OFFER_SERVICES_LINE);
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
    setTemplates([]);
    setHeaderFile(null);
    setHeaderPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    messagingApi
      .getStatus()
      .then((status) => {
        setConfigured(Boolean(status.configured));
        const rows = status.approvedTemplates || [];
        setTemplates(rows);
        setHeaderImage(status.templatePreviewDefaults?.headerImage || null);
        setServicesLine(
          status.templatePreviewDefaults?.servicesLine || OFFER_SERVICES_LINE
        );
        const pick = pickTemplate(kind, rows);
        if (pick) setTemplateKey(`${pick.name}::${pick.language || ""}`);
      })
      .catch(() => {
        setTemplates([]);
      });
  }, [open, kind]);

  const visibleTemplates = useMemo(() => {
    const preferred =
      kind === "marketing" ? MARKETING_PREFERRED : [OFFER_TEMPLATE, ...UTILITY_TEMPLATES];
    const ranked = [...templates].sort((a, b) => {
      const ai = preferred.indexOf(a.name);
      const bi = preferred.indexOf(b.name);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    if (kind !== "marketing") return ranked;
    const marketing = ranked.filter(
      (row) =>
        String(row.category || "").toUpperCase() === "MARKETING" ||
        preferred.includes(row.name)
    );
    return marketing.length ? marketing : ranked;
  }, [kind, templates]);

  if (!open) return null;

  const [templateName, languageCode] = templateKey.split("::");
  const selectedTemplate =
    visibleTemplates.find(
      (row) => `${row.name}::${row.language || ""}` === templateKey
    ) ||
    visibleTemplates.find((row) => row.name === templateName) ||
    null;
  const preview = customers.slice(0, 8);
  const extra = Math.max(0, customers.length - preview.length);
  const previewName = customers[0]?.name || "Customer";
  const needsHeaderImage =
    String(selectedTemplate?.headerFormat || "").toUpperCase() === "IMAGE" ||
    selectedTemplate?.name === OFFER_TEMPLATE;

  const pickHeaderFile = (file: File | null) => {
    setHeaderPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setHeaderFile(file);
  };

  const submit = async () => {
    setError("");
    setNotice("");
    if (!customers.length) {
      setError("Select at least one customer.");
      return;
    }
    if (kind === "whatsapp" && !body.trim() && !templateName) {
      setError("Choose a WhatsApp template or write a message.");
      return;
    }
    if (needsHeaderImage && !headerFile) {
      setError("Upload a header image (JPG or PNG) for this template.");
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
        headerImage: headerFile || undefined,
      });
      const failed = result.results.filter((row) => !row.ok);
      const pending = result.results.filter(
        (row) =>
          row.ok &&
          row.deliveryStatus !== "DELIVERED" &&
          row.deliveryStatus !== "READ" &&
          row.deliveryStatus !== "SENT"
      );
      if (result.sent > 0 && !pending.length) {
        onSent(new Date().toISOString());
      }
      if (failed.length && result.sent === 0) {
        setError(failed[0]?.error || "Send failed");
        return;
      }
      const firstWarning = result.results.find((row) => row.warning)?.warning;
      if (failed.length) {
        setError(failed[0]?.error || "WhatsApp did not deliver the message");
      }
      setNotice(
        firstWarning ||
          (failed.length
            ? `Queued for ${result.sent}. Failed for ${failed.length}: ${failed
                .map((row) => row.name)
                .join(", ")}`
            : pending.length
              ? "Meta accepted the template, but WhatsApp has not confirmed delivery yet."
              : `Delivered to ${result.sent} customer${result.sent === 1 ? "" : "s"}.`)
      );
      if (!failed.length && !pending.length && !firstWarning) {
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
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

        <div className="grid items-start gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_280px]">
          <div>
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
                WhatsApp Cloud API is not configured. You can still open a chat
                for one customer, or add credentials in Settings → Integrations.
              </p>
            ) : null}

            {configured &&
            templates.length > 0 &&
            !(kind === "marketing" ? MARKETING_PREFERRED : [OFFER_TEMPLATE]).some(
              (name) => templates.some((row) => row.name === name)
            ) ? (
              <p className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-700">
                {kind === "marketing"
                  ? "interior_design_offer"
                  : "interior_design_offer"}{" "}
                is not on the connected Cloud API WhatsApp account. Create that
                template in Meta for this same number, then it will appear here.
              </p>
            ) : null}

            {visibleTemplates.length ? (
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

            {needsHeaderImage ? (
              <div className="mb-4">
                <Label>Header image</Label>
                <p className="mb-2 text-xs text-gray-500">
                  interior_design_offer uses an IMAGE header. Upload a JPG or PNG
                  (max 5 MB). This image is sent with the template.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => pickHeaderFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600"
                />
                {headerFile ? (
                  <p className="mt-1 text-xs text-gray-500">
                    {headerFile.name} · {(headerFile.size / 1024).toFixed(0)} KB
                    <button
                      type="button"
                      className="ml-2 text-brand-600 hover:underline"
                      onClick={() => pickHeaderFile(null)}
                    >
                      Remove
                    </button>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-warning-600">
                    Required before send. The previous default image URL is not reachable.
                  </p>
                )}
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
                  needsHeaderImage || selectedTemplate?.name === OFFER_TEMPLATE
                    ? "Optional {{2}} services text. Leave blank to use the default services line."
                    : UTILITY_TEMPLATES.includes(selectedTemplate?.name || "")
                      ? "{{1}} is filled with the customer first name. No extra text is required."
                      : "Optional extra body text for this template."
                }
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            {error ? (
              <p className="mt-3 text-sm text-error-500">{error}</p>
            ) : null}
            {notice ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{notice}</p>
            ) : null}
          </div>

          <div className="min-[900px]:sticky min-[900px]:top-0 order-first min-[900px]:order-none">
            <WhatsAppTemplatePreview
              template={selectedTemplate}
              customerName={previewName}
              servicesText={body || servicesLine}
              headerImage={headerPreview || headerImage}
            />
          </div>
        </div>

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
            disabled={saving || !customers.length || (needsHeaderImage && !headerFile)}
          >
            {saving ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
