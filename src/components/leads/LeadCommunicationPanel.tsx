"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  leadsApi,
  messagingApi,
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
  initialMessages?: LeadMessageDto[];
  onRefresh?: () => void;
};

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
    return `${message} Use WHATSAPP_DEFAULT_TEMPLATE=3p_direct_integration_test_template or your own approved business template — not hello_world.`;
  }
  if (message.includes("132001") || message.includes("Template not found")) {
    return `${message} Update WHATSAPP_DEFAULT_TEMPLATE in backend .env to an approved template on your production WhatsApp account (see Settings → Integrations).`;
  }
  if (message.includes("132000")) {
    return `${message} Set WHATSAPP_TEMPLATE_BODY_PARAM_COUNT in .env to match your template variables.`;
  }
  if (message.includes("190") || message.includes("Access token")) {
    return `${message} Regenerate the permanent token in Meta and update WHATSAPP_ACCESS_TOKEN.`;
  }
  return message;
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
  const color = isRead ? "text-sky-400" : isFailed ? "text-red-400" : "text-white/70";

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
          className="max-h-64 w-full object-cover transition hover:opacity-95"
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

function ChatBubble({
  msg,
  clientName,
}: {
  msg: LeadMessageDto;
  clientName: string;
}) {
  const outbound = msg.direction === "OUTBOUND";
  const hasMedia = Boolean(msg.mediaUrl);
  const body =
    msg.body ||
    (msg.templateName ? `[Template: ${msg.templateName}]` : "");
  const showBody =
    body &&
    !(hasMedia && msg.mediaType === "document" && body === msg.mediaFilename);

  return (
    <div className={`flex ${outbound ? "justify-end" : "justify-start"} px-1`}>
      <div className={`flex max-w-[min(85%,420px)] gap-2 ${outbound ? "flex-row-reverse" : "flex-row"}`}>
        {!outbound ? (
          <div
            className="mt-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-xs font-semibold text-[#54656f] ring-2 ring-white dark:bg-gray-700 dark:text-gray-200 dark:ring-[#0b141a]"
            aria-hidden
          >
            {initials(clientName)}
          </div>
        ) : null}

        <div
          className={`relative rounded-xl px-3 py-2 shadow-sm ${
            outbound
              ? "rounded-tr-sm bg-[#005c4b] text-white dark:bg-[#005c4b]"
              : "rounded-tl-sm border border-white/60 bg-white text-[#111b21] dark:border-gray-700 dark:bg-[#202c33] dark:text-[#e9edef]"
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

          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
              outbound ? "text-white/75" : "text-[#667781] dark:text-gray-400"
            }`}
          >
            {outbound && msg.sentBy?.name ? (
              <span className="mr-1 max-w-[80px] truncate">{msg.sentBy.name.split(" ")[0]}</span>
            ) : null}
            <span>{formatBubbleTime(msg.createdAt)}</span>
            {outbound ? <MessageStatus status={msg.status} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadCommunicationPanel({
  leadId,
  clientName,
  phone,
  assignedToId,
  salesOwnerId,
  initialMessages = [],
  onRefresh,
}: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<LeadMessageDto[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [waStatus, setWaStatus] = useState<WhatsAppStatusDto | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

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

  const loadMessages = useCallback(async (showSpinner = false) => {
    if (showSpinner) setFetching(true);
    try {
      const rows = await leadsApi.listMessages(leadId);
      setMessages(rows);
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
  }, [initialMessages]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const send = async () => {
    const body = text.trim();
    if ((!body && !attachment) || sending || !canSend) return;
    setSending(true);
    setError("");
    try {
      const created = await leadsApi.sendMessage(leadId, {
        body: body || undefined,
        file: attachment || undefined,
      });
      setMessages((prev) => [...prev, created]);
      setText("");
      clearAttachment();
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

  const hasInbound = messages.some((m) => m.direction === "INBOUND");
  const hasOutbound = messages.some((m) => m.direction === "OUTBOUND");
  const webhookMissing =
    waStatus &&
    !waStatus.webhookActivity?.lastReceivedAt &&
    (waStatus.inboundMessageCount ?? 0) === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/50 dark:border-gray-800 dark:bg-[#111b21] dark:shadow-none">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-[#075e54] via-[#128c7e] to-[#075e54] px-4 py-3 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-sm font-bold ring-2 ring-white/20 backdrop-blur-sm">
              {initials(clientName)}
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#075e54] bg-[#25d366]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{clientName}</h3>
            <p className="flex items-center gap-1.5 truncate text-xs text-white/80">
              <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
              {phone ? `+91 ${phone.replace(/\D/g, "").slice(-10)}` : "No phone number"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {canViewAll ? (
              <span className="mr-1 hidden rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium sm:inline">
                Manager
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void loadMessages(true)}
              disabled={fetching}
              title="Refresh messages"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 disabled:opacity-50"
            >
              <RefreshIcon spinning={fetching} />
            </button>
          </div>
        </div>

        {lastFetchedAt ? (
          <p className="relative mt-1.5 text-[10px] text-white/60">
            Live sync · updated {lastFetchedAt.toLocaleTimeString()}
          </p>
        ) : null}
      </div>

      {webhookMissing ? (
        <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-[11px] text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          Webhook not detected yet — customer replies appear after Meta webhook is configured.
        </div>
      ) : null}

      {/* Chat area */}
      <div
        className="relative flex h-[min(58vh,520px)] flex-col overflow-hidden"
        style={{
          backgroundColor: "#e5ddd5",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bc' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        <div className="absolute inset-0 bg-[#e5ddd5]/90 dark:bg-[#0b141a]/95 dark:opacity-100" />

        <div className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#25d366]/15 text-[#25d366]">
                <WhatsAppIcon className="h-10 w-10" />
              </div>
              <p className="text-base font-semibold text-[#111b21] dark:text-white/90">
                Start the conversation
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#667781] dark:text-gray-400">
                Send a WhatsApp message to {clientName}. Replies appear here automatically once the webhook is active.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {messageGroups.map((group) => (
                <div key={group.key}>
                  <DateDivider label={group.label} />
                  <div className="space-y-2">
                    {group.items.map((msg) => (
                      <ChatBubble key={msg.id} msg={msg} clientName={clientName} />
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
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-100 bg-[#f0f2f5] px-3 py-3 dark:border-gray-800 dark:bg-[#202c33] sm:px-4">
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

            <div className="flex items-end gap-2">
              <div className="flex shrink-0 items-center gap-1 pb-1">
                <button
                  type="button"
                  title="Send image"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#54656f] transition hover:bg-white dark:text-gray-300 dark:hover:bg-[#2a3942]"
                >
                  <ImageIcon />
                </button>
                <button
                  type="button"
                  title="Send document"
                  onClick={() => docInputRef.current?.click()}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#54656f] transition hover:bg-white dark:text-gray-300 dark:hover:bg-[#2a3942]"
                >
                  <AttachIcon />
                </button>
              </div>

              <div className="min-w-0 flex-1 rounded-3xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus-within:border-[#25d366]/50 focus-within:ring-2 focus-within:ring-[#25d366]/20 dark:border-gray-700 dark:bg-[#2a3942]">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={attachment ? "Add a caption (optional)" : "Type a message"}
                  className="max-h-32 min-h-[24px] w-full resize-none bg-transparent text-sm text-[#111b21] placeholder:text-[#8696a0] focus:outline-none dark:text-[#e9edef]"
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white shadow-md transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none dark:disabled:bg-gray-600"
              >
                {sending ? (
                  <RefreshIcon className="h-5 w-5" spinning />
                ) : (
                  <SendIcon className="h-5 w-5 translate-x-0.5" />
                )}
              </button>
            </div>
          </>
        )}

        {canSend ? (
          <p className="mt-2 text-center text-[10px] text-[#8696a0] dark:text-gray-500">
            Images &amp; documents require customer reply first (24h window) · Max 16 MB
          </p>
        ) : null}
      </div>
    </div>
  );
}
