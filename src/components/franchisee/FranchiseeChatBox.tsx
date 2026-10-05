"use client";

import React, { useCallback, useEffect, useState } from "react";
import VendorChatThread, { ChatAvatar, typingPhrase } from "@/components/chat/VendorChatThread";
import {
  vendorChatApi,
  type VendorChatMessageDto,
  type VendorChatPersonDto,
} from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { useVendorChatSocket, useVendorChatTypers } from "@/hooks/useVendorChatSocket";

export default function FranchiseeChatBox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<VendorChatMessageDto[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [people, setPeople] = useState<VendorChatPersonDto[]>([]);
  const { typers, applyTyping } = useVendorChatTypers(user?.id);

  const load = useCallback(async () => {
    try {
      const data = await vendorChatApi.mine();
      setMessages(data.items || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load chat");
    }
  }, []);

  useEffect(() => {
    void load();
    void vendorChatApi
      .directory()
      .then((data) => setPeople(data.items || []))
      .catch(() => setPeople([]));
  }, [load]);

  const { sendTyping, connected, presence } = useVendorChatSocket({
    onTyping: applyTyping,
    onMessage: (message) => {
      setMessages((prev) => {
        const index = prev.findIndex((row) => row.id === message.id);
        if (index === -1) return [...prev, message];
        const copy = [...prev];
        copy[index] = message;
        return copy;
      });
    },
  });

  const send = async (payload: { body: string; mentionIds: string[]; files: File[]; replyToId?: string | null }) => {
    sendTyping(false);
    setSending(true);
    try {
      const created = await vendorChatApi.send({
        body: payload.body,
        mentionIds: payload.mentionIds,
        files: payload.files,
        replyToId: payload.replyToId,
      });
      setMessages((prev) => {
        const index = prev.findIndex((row) => row.id === created.id);
        if (index === -1) return [...prev, created];
        const copy = [...prev];
        copy[index] = created;
        return copy;
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  const edit = async (id: string, payload: { body: string; mentionIds: string[] }) => {
    setSending(true);
    try {
      const updated = await vendorChatApi.edit(id, payload);
      setMessages((prev) => {
        const index = prev.findIndex((row) => row.id === updated.id);
        if (index === -1) return prev;
        const copy = [...prev];
        copy[index] = updated;
        return copy;
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not edit message");
    } finally {
      setSending(false);
    }
  };

  const typingNames = typers.map((row) => row.name);
  const typingLabel = typingPhrase(typingNames);

  return (
    <div className="chat-shell chat-page flex min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[28px] border border-[#eadfcf] bg-white dark:border-[var(--vendor-line)] dark:bg-[var(--vendor-paper)]">
      <div className="flex items-center gap-2 border-b border-[#eadfcf] bg-white px-3 py-3 md:gap-3 md:px-5 md:py-3.5 dark:border-[var(--vendor-line)]">
        <ChatAvatar name="Santoshi Interiors" size="md" online={presence.staffOnline || connected} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="truncate font-serif text-[1.15rem] leading-none text-[#111] md:text-[1.35rem]">
              Santoshi Interiors
            </span>
            <span
              className={`mt-1 font-sans text-[11px] sm:mt-0 sm:text-[12px] ${
                typingLabel ? "italic text-[#9a7748]" : presence.staffOnline || connected ? "text-[#2f9d64]" : "text-[#8a8175]"
              }`}
            >
              {typingLabel || (presence.staffOnline || connected ? "● Online" : "Offline")}
            </span>
          </p>
          <p className="mt-1 truncate text-[11px] text-[#8a8175] md:mt-1.5 md:text-xs">Direct line with the studio team</p>
        </div>
      </div>
      <VendorChatThread
        messages={messages}
        currentUserId={user?.id || ""}
        currentUserName={user?.name || "You"}
        peerName="Santoshi Interior"
        people={people}
        typingNames={typingNames}
        onTypingChange={sendTyping}
        onSend={send}
        onEdit={edit}
        sending={sending}
        error={error}
      />
    </div>
  );
}
