"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";
import { leadsApi, type LeadMessageDto } from "@/services/crmApi";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/mappers";
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

function statusColor(status: string): "success" | "warning" | "error" | "light" {
  switch (status) {
    case "READ":
    case "DELIVERED":
      return "success";
    case "SENT":
      return "warning";
    case "FAILED":
      return "error";
    default:
      return "light";
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const canViewAll = hasAnyPermission(user, [
    "messages.view.all",
    "sales.full",
    "users.manage",
  ]);
  const isAssignee =
    user?.id === assignedToId || user?.id === salesOwnerId || user?.role === "SUPER_ADMIN";
  const canSend = hasAnyPermission(user, [
    "messages.send",
    "leads.manage",
    "sales.manage",
    "sales.full",
  ]) && (isAssignee || canViewAll);

  const loadMessages = useCallback(async () => {
    try {
      const rows = await leadsApi.listMessages(leadId);
      setMessages(rows);
    } catch {
      // keep existing
    }
  }, [leadId]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!leadId) return;
    const timer = setInterval(() => {
      void loadMessages();
    }, 15000);
    return () => clearInterval(timer);
  }, [leadId, loadMessages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !canSend) return;
    setSending(true);
    setError("");
    try {
      const created = await leadsApi.sendMessage(leadId, { body });
      setMessages((prev) => [...prev, created]);
      setText("");
      onRefresh?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[min(70vh,640px)] flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white/90">
              WhatsApp — {clientName}
            </h3>
            <p className="text-sm text-gray-500">{phone || "No phone"}</p>
          </div>
          <div className="flex items-center gap-2">
            {canViewAll ? (
              <Badge size="sm" color="light">
                Manager view
              </Badge>
            ) : null}
            <button
              type="button"
              onClick={() => void loadMessages()}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-gray-500">
            <p>No WhatsApp messages yet.</p>
            <p className="mt-1 max-w-sm">
              Send a message below. Customer replies arrive via Interakt webhook and
              appear here automatically.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const outbound = msg.direction === "OUTBOUND";
            return (
              <div
                key={msg.id}
                className={`flex ${outbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    outbound
                      ? "rounded-br-md bg-brand-500 text-white"
                      : "rounded-bl-md border border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {msg.body || (msg.templateName ? `[Template: ${msg.templateName}]` : "—")}
                  </p>
                  <div
                    className={`mt-1.5 flex flex-wrap items-center gap-2 text-[11px] ${
                      outbound ? "text-white/80" : "text-gray-400"
                    }`}
                  >
                    <span>{formatTime(msg.createdAt)}</span>
                    {outbound && msg.sentBy?.name ? (
                      <span>· {msg.sentBy.name}</span>
                    ) : null}
                    {outbound ? (
                      <Badge size="sm" color={statusColor(msg.status)}>
                        {msg.status}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 p-4 dark:border-gray-800">
        {error ? (
          <p className="mb-2 text-sm text-error-600">{error}</p>
        ) : null}
        {!canSend ? (
          <p className="text-sm text-gray-500">
            You can view this conversation. Only the assigned employee (or managers)
            can send WhatsApp messages.
          </p>
        ) : (
          <>
            <TextArea
              rows={3}
              value={text}
              onChange={setText}
              placeholder="Type your WhatsApp message…"
            />
            <p className="mt-1 text-xs text-gray-400">
              Sent via Interakt using your approved WhatsApp template (first variable =
              message text).
            </p>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                disabled={sending || !text.trim()}
                onClick={() => void send()}
              >
                {sending ? "Sending…" : "Send WhatsApp"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
