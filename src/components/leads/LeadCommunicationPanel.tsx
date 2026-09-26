"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  leadsApi,
  messagingApi,
  telephonyApi,
  type LeadMessageDto,
  type WhatsAppStatusDto,
} from "@/services/crmApi";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

type Props = {
  leadId: string;
  clientName: string;
  phone: string;
  assignedToId?: string | null;
  salesOwnerId?: string | null;
  assigneeName?: string | null;
  hideCustomerPhone?: boolean;
  leadOwnerName?: string | null;
  projectName?: string | null;
  initialMessages?: LeadMessageDto[];
  onRefresh?: () => void;
  embedded?: boolean;
  onBack?: () => void;
};

type ChatTemplateId = "start_chat" | "start_chat_ut" | "followup" | "interior_lead_followup";

const CHAT_TEMPLATES: Array<{
  id: ChatTemplateId;
  label: string;
  params: 0 | 1 | 2;
  body: string | null;
}> = [
  {
    id: "start_chat_ut",
    label: "start_chat_ut — Utility follow-up",
    params: 1,
    body: `Hi {{1}}

Thank you for contacting Santoshi Interiors.

We’re following up regarding your previous enquiry. If you still need assistance, simply reply to this message and our team will be happy to help.

Regards,
Santoshi Interiors`,
  },
  {
    id: "followup",
    label: "followup — Enquiry follow-up",
    params: 1,
    body: `Hi {{1}}, just following up on your enquiry with Santoshi Interiors.
Are you still looking for interior design services? We’d be happy to assist you. 😊`,
  },
  {
    id: "start_chat",
    label: "start_chat — Hi",
    params: 0,
    body: null,
  },
  {
    id: "interior_lead_followup",
    label: "interior_lead_followup — Lead follow-up",
    params: 2,
    body: `Hi {{1}},

Thank you for your interest in Santoshi Interior.

We received your requirement for {{2}} and would be happy to help you with your interior design needs.

Our team is available to discuss your requirement and the next steps.

Regards,
Santoshi Interior`,
  },
];

function firstName(name: string) {
  const raw = String(name || "there").trim();
  return raw.split(/\s+/)[0] || "there";
}

function fillPlaceholders(body: string, values: string[]) {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => values[Number(n) - 1] || "");
}

type MessageGroup = {
  key: string;
  label: string;
  items: LeadMessageDto[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";
}

function formatBubbleTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function dateKey(iso: string) {
  try {
    return new Date(iso).toDateString();
  } catch {
    return iso;
  }
}

function formatDateLabel(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return iso;
  }
}

function groupMessagesByDate(messages: LeadMessageDto[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const key = dateKey(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(msg);
    } else {
      groups.push({
        key,
        label: formatDateLabel(msg.createdAt),
        items: [msg],
      });
    }
  }
  return groups;
}

function hasActiveWaSession(messages: LeadMessageDto[]) {
  const lastIn = [...messages].reverse().find((m) => m.direction === "INBOUND");
  if (!lastIn) return false;
  const at = new Date(lastIn.createdAt).getTime();
  return Number.isFinite(at) && Date.now() - at < 24 * 60 * 60 * 1000;
}

function formatSendError(err: unknown) {
  const message =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Failed to send message";
  if (message.includes("131030") || message.includes("not in allowed list")) {
    return `${message} For development, add the number in Meta test recipients. In production, use a valid customer WhatsApp number.`;
  }
  if (message.includes("131058") || message.includes("Public Test Numbers")) {
    return `${message} Use the approved start_chat template on this WhatsApp account — not hello_world.`;
  }
  if (message.includes("132001") || message.includes("Template not found")) {
    return `${message} The selected template must exist and be APPROVED on the connected WhatsApp account (start_chat_ut, followup, start_chat, or interior_lead_followup).`;
  }
  if (message.includes("131049") || message.includes("healthy ecosystem")) {
    return "WhatsApp blocked this marketing template (131049). Do not send again to this number for 24 hours. Use start_chat_ut or followup (UTILITY), or recategorize the template in WhatsApp Manager.";
  }
  if (message.includes("131047") || message.includes("Re-engagement") || message.includes("24 hours")) {
    return "WhatsApp blocked this text because the customer has not replied in 24 hours. Choose a UTILITY template (start_chat_ut or followup) and send that first.";
  }
  if (message.includes("190") || message.includes("Access token")) {
    return `${message} Regenerate the permanent token in Meta and update WHATSAPP_ACCESS_TOKEN.`;
  }
  return message;
}

function CallIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function RefreshIcon({ className = "h-4 w-4", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg
      className={`${className}${spinning ? " animate-spin" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function TrashIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function SendIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function MessageStatus({ status }: { status: string }) {
  const isRead = status === "READ";
  const isDelivered = status === "DELIVERED" || isRead;
  const isFailed = status === "FAILED";
  const color = isRead ? "text-sky-500" : isFailed ? "text-red-400" : "text-[#8696a0]";

  if (isFailed) {
    return (
      <span className={`inline-flex ${color}`} title="Failed">
        !
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${color}`} title={status}>
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 15" fill="currentColor">
        <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 00-.063-.51z" />
      </svg>
      {isDelivered ? (
        <svg className="-ml-1.5 h-3.5 w-3.5" viewBox="0 0 16 15" fill="currentColor">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 00-.063-.51z" />
        </svg>
      ) : null}
    </span>
  );
}

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  ).replace(/\/api$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

function ImageIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DocumentIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function MediaAttachment({
  msg,
  outbound,
}: {
  msg: LeadMessageDto;
  outbound: boolean;
}) {
  const href = resolveMediaUrl(msg.mediaUrl);
  if (!href) return null;

  if (msg.mediaType === "image" || /\.(jpe?g|png|gif|webp|bmp)$/i.test(msg.mediaUrl || "")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="mb-2 block overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={href}
          alt={msg.body || "Shared image"}
          className="max-h-56 w-auto max-w-full object-contain transition hover:opacity-95"
        />
      </a>
    );
  }

  const filename = msg.mediaFilename || msg.body || "Document";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`mb-2 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition hover:opacity-90 ${
        outbound
          ? "border-white/20 bg-white/10"
          : "border-[#e9edef] bg-[#f0f2f5] dark:border-gray-600 dark:bg-[#2a3942]"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          outbound ? "bg-white/15 text-white" : "bg-[#25d366]/15 text-[#128c7e]"
        }`}
      >
        <DocumentIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${outbound ? "text-white" : "text-[#111b21] dark:text-[#e9edef]"}`}>
          {filename}
        </p>
        <p className={`text-[11px] ${outbound ? "text-white/70" : "text-[#667781]"}`}>
          Tap to download
        </p>
      </div>
    </a>
  );
}

function AttachmentPreview({
  file,
  previewUrl,
  onRemove,
}: {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
}) {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl border border-[#25d366]/30 bg-white px-3 py-2 dark:bg-[#2a3942]">
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#25d366]/10 text-[#128c7e]">
          <DocumentIcon />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
          {file.name}
        </p>
        <p className="text-[11px] text-[#667781]">{formatFileSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full px-2 py-1 text-xs text-[#667781] hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Remove
      </button>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex justify-center">
      <span className="rounded-lg bg-[#ffffffd9] px-3 py-1 text-[11px] font-medium tracking-wide text-[#54656f] shadow-sm backdrop-blur-sm dark:bg-gray-800/90 dark:text-gray-300">
        {label}
      </span>
    </div>
  );
}

function deliveryError(msg: LeadMessageDto) {
  if (msg.status !== "FAILED") return "";
  const err = msg.rawPayload?.errors?.[0];
  const details = err?.error_data?.details || err?.message || err?.title;
  const code = Number(err?.code);
  if (code === 131049 || /healthy ecosystem/i.test(String(details))) {
    return "WhatsApp blocked this as a marketing template (131049). Wait 24 hours before retrying this number. Use start_chat_ut or followup (UTILITY).";
  }
  if (code === 131047 || /24 hour|re-engagement/i.test(String(details))) {
    return "Not delivered. Customer must reply within 24 hours before free text can be sent.";
  }
  return details || "Not delivered";
}

function isMarketingLimitFailure(msg: LeadMessageDto) {
  if (msg.status !== "FAILED" || msg.direction !== "OUTBOUND") return false;
  const err = msg.rawPayload?.errors?.[0];
  const details = String(err?.error_data?.details || err?.message || err?.title || "");
  return Number(err?.code) === 131049 || /healthy ecosystem/i.test(details);
}

function templateCategorySuffix(status: WhatsAppStatusDto | null, name: string) {
  const category = status?.approvedTemplates?.find((row) => row.name === name)?.category;
  return category ? ` (${category})` : "";
}

function ChatBubble({
  msg,
  clientName,
  canDelete,
  onDelete,
}: {
  msg: LeadMessageDto;
  clientName: string;
  canDelete?: boolean;
  onDelete?: (msg: LeadMessageDto) => void;
}) {
  const outbound = msg.direction === "OUTBOUND";
  const hasMedia = Boolean(msg.mediaUrl);
  const failed = msg.status === "FAILED";
  const failText = deliveryError(msg);
  const body =
    msg.body ||
    (msg.templateName ? `[Template: ${msg.templateName}]` : "");
  const showBody =
    body &&
    !(hasMedia && msg.mediaType === "document" && body === msg.mediaFilename);

  return (
    <div className={`group flex items-end gap-1 ${outbound ? "justify-end" : "justify-start"}`}>
      {canDelete && outbound ? (
        <button
          type="button"
          title="Delete message"
          onClick={() => onDelete?.(msg)}
          className={`mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#667781] transition hover:bg-black/10 hover:text-red-600 dark:hover:bg-white/10 ${
            failed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <TrashIcon />
        </button>
      ) : null}
      <div
        className={`relative max-w-[min(85%,560px)] rounded-lg px-3 py-1.5 shadow-sm ${
          failed
            ? "rounded-tr-none border border-red-200 bg-red-50 text-[#111b21] dark:border-red-500/40 dark:bg-red-500/10 dark:text-white"
            : outbound
            ? "rounded-tr-none bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-white"
            : "rounded-tl-none bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]"
        }`}
      >
        {!outbound ? (
          <p className="mb-0.5 text-[11px] font-semibold text-[#25d366]">
            {clientName}
          </p>
        ) : null}

          {hasMedia ? <MediaAttachment msg={msg} outbound={outbound} /> : null}

          {showBody ? (
            <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
              {body}
            </p>
          ) : null}

          {!hasMedia && !showBody ? (
            <p className="text-[13.5px] leading-relaxed opacity-80">—</p>
          ) : null}

          {failText ? (
            <p className="mt-1 text-[11px] leading-snug text-red-600 dark:text-red-300">
              {failText}
            </p>
          ) : null}

          <div
            className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
              failed
                ? "text-red-500"
                : outbound
                  ? "text-[#667781] dark:text-white/70"
                  : "text-[#667781] dark:text-gray-400"
            }`}
          >
            {outbound && msg.sentBy?.name ? (
              <span className="mr-1 max-w-[80px] truncate">{msg.sentBy.name.split(" ")[0]}</span>
            ) : null}
            <span>{formatBubbleTime(msg.createdAt)}</span>
            {outbound ? <MessageStatus status={msg.status} /> : null}
          </div>
      </div>
      {canDelete && !outbound ? (
        <button
          type="button"
          title="Delete message"
          onClick={() => onDelete?.(msg)}
          className={`mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#667781] transition hover:bg-black/10 hover:text-red-600 dark:hover:bg-white/10 ${
            failed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <TrashIcon />
        </button>
      ) : null}
    </div>
  );
}

export default function LeadCommunicationPanel({
  leadId,
  clientName,
  phone,
  assignedToId,
  salesOwnerId,
  assigneeName,
  hideCustomerPhone = false,
  leadOwnerName,
  projectName,
  initialMessages = [],
  onRefresh,
  embedded = false,
  onBack,
}: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<LeadMessageDto[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [waStatus, setWaStatus] = useState<WhatsAppStatusDto | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const lastCountRef = useRef(initialMessages.length);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [chatTemplate, setChatTemplate] = useState<ChatTemplateId>("start_chat_ut");
  const [requirement, setRequirement] = useState(projectName || "");

  const canViewAll = hasAnyPermission(user, [
    "messages.view.all",
    "sales.full",
    "users.manage",
  ]);
  const isAssignee =
    user?.id === assignedToId ||
    user?.id === salesOwnerId ||
    user?.role === "SUPER_ADMIN";
  const canSend =
    hasAnyPermission(user, [
      "messages.send",
      "leads.manage",
      "sales.manage",
      "sales.full",
    ]) &&
    (isAssignee || canViewAll);
  const canCall = hasAnyPermission(user, [
    "calls.make",
    "sales.full",
    "sales.manage",
    "leads.manage",
  ]);

  const loadMessages = useCallback(async (showSpinner = false) => {
    if (showSpinner) setFetching(true);
    try {
      const rows = await leadsApi.listMessages(leadId);
      setMessages((prev) => {
        if (
          prev.length === rows.length &&
          prev[prev.length - 1]?.id === rows[rows.length - 1]?.id &&
          prev[0]?.id === rows[0]?.id &&
          prev.every((row, i) => row.status === rows[i]?.status)
        ) {
          return prev;
        }
        return rows;
      });
      setLastFetchedAt(new Date());
    } catch {
      // keep existing
    } finally {
      if (showSpinner) setFetching(false);
    }
  }, [leadId]);

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  useEffect(() => {
    setMessages(initialMessages);
    stickToBottomRef.current = true;
    lastCountRef.current = initialMessages.length;
  }, [leadId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    setChatTemplate("start_chat_ut");
    setRequirement(projectName || "");
  }, [leadId, projectName]);

  useEffect(() => {
    (async () => {
      try {
        const status = await messagingApi.getStatus();
        setWaStatus(status);
      } catch {
        // ignore
      }
    })();
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const onChatScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    const added = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;
    if (!stickToBottomRef.current && !added) return;
    if (stickToBottomRef.current || added) {
      requestAnimationFrame(() => scrollToBottom(added && messages.length > 1));
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!leadId) return;
    const timer = setInterval(() => {
      void loadMessages();
    }, 3000);
    return () => clearInterval(timer);
  }, [leadId, loadMessages]);

  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  const clearAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachment(null);
    setAttachmentPreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const pickAttachment = (file: File | null) => {
    clearAttachment();
    if (!file) return;
    setAttachment(file);
    if (file.type.startsWith("image/")) {
      setAttachmentPreview(URL.createObjectURL(file));
    }
  };

  const removeChatMessage = async (msg: LeadMessageDto) => {
    if (
      !window.confirm(
        "Delete this message from the CRM chat? It will not be removed from the customer's WhatsApp."
      )
    ) {
      return;
    }
    setError("");
    try {
      await leadsApi.deleteMessage(leadId, msg.id);
      setMessages((prev) => prev.filter((row) => row.id !== msg.id));
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete message");
    }
  };

  const send = async () => {
    const body = text.trim();
    const inSession = hasActiveWaSession(messages);
    const selectedMeta = waStatus?.approvedTemplates?.find((row) => row.name === chatTemplate);
    const selectedCat = String(selectedMeta?.category || "").toUpperCase();
    const blockedMarketing =
      selectedCat === "MARKETING" &&
      messages.some(
        (msg) =>
          isMarketingLimitFailure(msg) &&
          Date.now() - new Date(msg.createdAt).getTime() < 24 * 60 * 60 * 1000
      );
    if ((!body && !attachment && inSession) || sending || !canSend) return;
    if (!inSession && !attachment && blockedMarketing) {
      setError(
        "WhatsApp already blocked marketing templates to this number (131049). Wait 24 hours, or recategorize this template as UTILITY in WhatsApp Manager."
      );
      return;
    }
    setSending(true);
    setError("");
    setNotice("");
    try {
      const selectedSpec = CHAT_TEMPLATES.find((row) => row.id === chatTemplate);
      const followupValues =
        selectedSpec?.params === 2
          ? [
              firstName(clientName),
              requirement.trim() || projectName || "interior design",
            ]
          : selectedSpec?.params === 1
            ? [firstName(clientName)]
            : [];
      const created = await leadsApi.sendMessage(leadId, {
        body: body || undefined,
        file: attachment || undefined,
        ...( !inSession && !attachment
          ? {
              templateName: chatTemplate,
              languageCode: "en",
              useTemplate: true,
              bodyValues: followupValues,
            }
          : {}),
      });
      setMessages((prev) => [...prev, created]);
      setText("");
      clearAttachment();
      if (created.warning) setNotice(created.warning);
      else setNotice("");
      void loadMessages();
      onRefresh?.();
      inputRef.current?.focus();
    } catch (err) {
      setError(formatSendError(err));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const startCall = async () => {
    if (!phone || calling || !canCall) return;
    setCalling(true);
    setError("");
    try {
      const result = await telephonyApi.clickToCall({
        to: phone,
        leadId,
        extension: user?.sipExtension || undefined,
      });
      if (result.originate.mode === "manual" && result.originate.dialFallback) {
        window.location.href = result.originate.dialFallback;
      }
      onRefresh?.();
    } catch (err) {
      const digits = String(phone).replace(/\D/g, "");
      const fallback = `tel:+${digits.length === 10 ? `91${digits}` : digits}`;
      window.location.href = fallback;
      setError(err instanceof Error ? err.message : "Cloud call failed; opened device dialer");
    } finally {
      setCalling(false);
    }
  };

  const hasInbound = messages.some((m) => m.direction === "INBOUND");
  const hasOutbound = messages.some((m) => m.direction === "OUTBOUND");
  const inSession = hasActiveWaSession(messages);
  const selectedTemplateMeta = waStatus?.approvedTemplates?.find(
    (row) => row.name === chatTemplate
  );
  const selectedCategory = String(selectedTemplateMeta?.category || "").toUpperCase();
  const marketingBlocked = messages.some(
    (msg) =>
      isMarketingLimitFailure(msg) &&
      Date.now() - new Date(msg.createdAt).getTime() < 24 * 60 * 60 * 1000
  );
  const webhookMissing =
    waStatus &&
    !waStatus.webhookActivity?.lastReceivedAt &&
    (waStatus.inboundMessageCount ?? 0) === 0;

  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-[#111b21]"
          : "flex max-h-[min(80vh,720px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/50 dark:border-gray-800 dark:bg-[#111b21] dark:shadow-none"
      }
    >
      {/* Header */}
      <div className="relative shrink-0 bg-[#075e54] px-3 py-2.5 text-white sm:px-4">
        <div className="relative flex items-center gap-2 sm:gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to chats"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 md:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              {initials(clientName)}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#075e54] bg-[#25d366]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold leading-tight">{clientName}</h3>
            <p className="truncate text-[12px] text-white/75">
              {hideCustomerPhone
                ? assigneeName
                  ? `Assigned to ${assigneeName}`
                  : "Unassigned"
                : [phone ? `+91 ${phone.replace(/\D/g, "").slice(-10)}` : "", leadOwnerName ? `Lead owner ${leadOwnerName}` : ""]
                    .filter(Boolean)
                    .join(" · ") || "No phone number"}
            </p>
          </div>

          {canCall && phone && !hideCustomerPhone ? (
            <button
              type="button"
              onClick={() => void startCall()}
              disabled={calling}
              title="Call via Jio SIP / cloud telephony"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 disabled:opacity-50"
            >
              <CallIcon className="h-[18px] w-[18px]" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void loadMessages(true)}
            disabled={fetching}
            title={lastFetchedAt ? `Refresh · ${lastFetchedAt.toLocaleTimeString()}` : "Refresh messages"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshIcon spinning={fetching} />
          </button>
        </div>
      </div>

      {webhookMissing ? (
        <div className="shrink-0 bg-amber-50 px-4 py-1.5 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          Replies appear after the WhatsApp webhook is connected.
        </div>
      ) : null}
      {!inSession ? (
        <div className="shrink-0 bg-amber-50 px-4 py-1.5 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {marketingBlocked
            ? "WhatsApp blocked marketing templates to this number (131049). Do not retry for 24 hours. Use start_chat_ut or followup (UTILITY)."
            : selectedCategory === "MARKETING"
              ? `${chatTemplate} is a MARKETING template. WhatsApp often will not deliver it until the customer replies. Change it to UTILITY in WhatsApp Manager for openers.`
              : "This number has not replied yet. Choose an approved template. UTILITY templates deliver; MARKETING templates may be blocked."}
        </div>
      ) : null}

      {/* Chat area */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          backgroundColor: "#e5ddd5",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bc' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[#e5ddd5]/90 dark:bg-[#0b141a]/95 dark:opacity-100" />

        <div
          ref={scrollRef}
          onScroll={onChatScroll}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar px-3 py-4 sm:px-8 sm:py-5 lg:px-12"
        >
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366]/15 text-[#25d366]">
                <WhatsAppIcon className="h-8 w-8" />
              </div>
              <p className="text-[15px] font-semibold text-[#111b21] dark:text-white/90">
                Start the conversation
              </p>
              <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-[#667781] dark:text-gray-400">
                {inSession
                  ? `Send a WhatsApp message to ${clientName}.`
                  : `Pick start_chat_ut or followup (UTILITY), then send. After ${clientName} replies, you can type freely for 24 hours.`}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {messageGroups.map((group) => (
                <div key={group.key}>
                  <DateDivider label={group.label} />
                  <div className="space-y-2">
                    {group.items.map((msg) => (
                      <ChatBubble
                        key={msg.id}
                        msg={msg}
                        clientName={clientName}
                        canDelete={canSend}
                        onDelete={(row) => void removeChatMessage(row)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {!hasInbound && hasOutbound ? (
                <div className="mt-4 flex justify-center">
                  <span className="rounded-lg bg-white/80 px-3 py-1.5 text-[11px] text-[#667781] shadow-sm dark:bg-gray-800/80 dark:text-gray-400">
                    Waiting for customer reply…
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 bg-[#f0f2f5] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:bg-[#202c33] sm:px-4 sm:py-2.5">
        {notice ? (
          <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {!canSend ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-[#667781] dark:bg-[#2a3942] dark:text-gray-400">
            <WhatsAppIcon className="h-5 w-5 shrink-0 opacity-50" />
            <span>View only — assigned employee or managers can send messages.</span>
          </div>
        ) : (
          <>
            {attachment ? (
              <AttachmentPreview
                file={attachment}
                previewUrl={attachmentPreview}
                onRemove={clearAttachment}
              />
            ) : null}

            {!inSession ? (
              <div className="mb-2 space-y-2 rounded-2xl bg-white px-3 py-2.5 dark:bg-[#2a3942]">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-[#667781] dark:text-gray-400">
                  Template
                </label>
                <select
                  value={chatTemplate}
                  onChange={(e) => setChatTemplate(e.target.value as ChatTemplateId)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#111b21] focus:border-[#25d366] focus:outline-none dark:border-gray-600 dark:bg-[#111b21] dark:text-[#e9edef]"
                >
                  {CHAT_TEMPLATES.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                      {templateCategorySuffix(waStatus, row.id)}
                    </option>
                  ))}
                </select>
                {chatTemplate === "interior_lead_followup" ? (
                  <>
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-[#667781] dark:text-gray-400">
                      Requirement
                    </label>
                    <input
                      type="text"
                      value={requirement}
                      onChange={(e) => setRequirement(e.target.value)}
                      placeholder="e.g. 3 BHK living room + kitchen"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#111b21] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none dark:border-gray-600 dark:bg-[#111b21] dark:text-[#e9edef]"
                    />
                    <div className="whitespace-pre-wrap rounded-xl bg-[#efeae2] px-3 py-2 text-[12px] leading-5 text-[#111b21] dark:bg-[#0b141a] dark:text-[#e9edef]">
                      {fillPlaceholders(
                        CHAT_TEMPLATES.find((row) => row.id === "interior_lead_followup")?.body || "",
                        [
                          firstName(clientName),
                          requirement.trim() || projectName || "interior design",
                        ]
                      )}
                    </div>
                  </>
                ) : CHAT_TEMPLATES.find((row) => row.id === chatTemplate)?.body ? (
                  <div className="whitespace-pre-wrap rounded-xl bg-[#efeae2] px-3 py-2 text-[12px] leading-5 text-[#111b21] dark:bg-[#0b141a] dark:text-[#e9edef]">
                    {fillPlaceholders(
                      CHAT_TEMPLATES.find((row) => row.id === chatTemplate)?.body || "",
                      [firstName(clientName)]
                    )}
                  </div>
                ) : (
                  <p className="text-[12px] text-[#667781] dark:text-gray-400">
                    Sends the approved Hi opener. No extra body text is needed.
                  </p>
                )}
              </div>
            ) : null}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => pickAttachment(e.target.files?.[0] || null)}
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf"
              className="hidden"
              onChange={(e) => pickAttachment(e.target.files?.[0] || null)}
            />

            {inSession ? (
            <div className="flex items-end gap-1 sm:gap-1.5">
              <div className="flex shrink-0 items-center pb-0.5">
                <button
                  type="button"
                  title="Send image (customer must reply first, max 16 MB)"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] transition hover:bg-white dark:text-gray-300 dark:hover:bg-[#2a3942] sm:h-10 sm:w-10"
                >
                  <ImageIcon />
                </button>
                <button
                  type="button"
                  title="Send document (customer must reply first, max 16 MB)"
                  onClick={() => docInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] transition hover:bg-white dark:text-gray-300 dark:hover:bg-[#2a3942] sm:h-10 sm:w-10"
                >
                  <AttachIcon />
                </button>
              </div>

              <div className="min-w-0 flex-1 rounded-[24px] bg-white px-4 py-2 dark:bg-[#2a3942]">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    attachment
                      ? "Add a caption (optional)"
                      : "Type a message"
                  }
                  className="max-h-32 min-h-[22px] w-full resize-none bg-transparent text-[15px] leading-snug text-[#111b21] placeholder:text-[#8696a0] focus:outline-none dark:text-[#e9edef]"
                  style={{ height: "auto" }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                  }}
                />
              </div>

              <button
                type="button"
                disabled={sending || (!text.trim() && !attachment)}
                onClick={() => void send()}
                title="Send message"
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600 sm:h-10 sm:w-10"
              >
                {sending ? (
                  <RefreshIcon className="h-5 w-5" spinning />
                ) : (
                  <SendIcon className="h-5 w-5 translate-x-0.5" />
                )}
              </button>
            </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={sending || (selectedCategory === "MARKETING" && marketingBlocked)}
                  onClick={() => void send()}
                  title={`Send ${chatTemplate}`}
                  className="flex h-10 items-center gap-2 rounded-full bg-[#25d366] px-4 text-sm font-semibold text-white transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {sending ? (
                    <RefreshIcon className="h-5 w-5" spinning />
                  ) : (
                    <SendIcon className="h-4 w-4" />
                  )}
                  Send template
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
