"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import VendorChatThread, {
  ChatAvatar,
  chatPreview,
  typingPhrase,
} from "@/components/chat/VendorChatThread";
import {
  vendorChatApi,
  type VendorChatMessageDto,
  type VendorChatPersonDto,
  type VendorChatThreadDto,
} from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { useVendorChatSocket, useVendorChatTypers } from "@/hooks/useVendorChatSocket";

type FilterTab = "all" | "unread" | "online";

function stamp(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function lastSeenLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `Last seen ${stamp(iso)}`;
}

function upsertMessage(prev: VendorChatMessageDto[], next: VendorChatMessageDto) {
  const index = prev.findIndex((row) => row.id === next.id);
  if (index === -1) return [...prev, next];
  const copy = [...prev];
  copy[index] = next;
  return copy;
}

function readMap(key: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function writeMap(key: string, value: Record<string, number>) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function AdminVendorChat() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<VendorChatThreadDto[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<VendorChatMessageDto[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [people, setPeople] = useState<VendorChatPersonDto[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const activeIdRef = React.useRef(activeId);
  activeIdRef.current = activeId;
  const { typers, applyTyping } = useVendorChatTypers(user?.id);

  const unreadKey = user?.id ? `vendor-chat-unread:${user.id}` : "";
  const readKey = user?.id ? `vendor-chat-read:${user.id}` : "";

  const loadThreads = useCallback(async () => {
    const data = await vendorChatApi.threads();
    const items = data.items || [];
    setThreads(items);
    setActiveId((current) => current || items[0]?.id || "");
    if (!user?.id) return;
    const stored = readMap(`vendor-chat-unread:${user.id}`);
    const lastRead = readMap(`vendor-chat-read:${user.id}`);
    const next: Record<string, number> = { ...stored };
    items.forEach((row) => {
      const at = row.lastAt ? new Date(row.lastAt).getTime() : 0;
      const seen = lastRead[row.id] || 0;
      if (row.lastSenderId && row.lastSenderId !== user.id && at > seen) {
        next[row.id] = Math.max(next[row.id] || 0, 1);
      }
    });
    setUnread(next);
    writeMap(`vendor-chat-unread:${user.id}`, next);
  }, [user?.id]);

  const loadMessages = useCallback(async (threadUserId: string) => {
    if (!threadUserId) {
      setMessages([]);
      return;
    }
    const data = await vendorChatApi.list(threadUserId);
    setMessages(data.items || []);
  }, []);

  useEffect(() => {
    void loadThreads().catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load chats")
    );
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId).catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load messages")
    );
    void vendorChatApi
      .directory(activeId)
      .then((data) => setPeople(data.items || []))
      .catch(() => setPeople([]));
    setUnread((prev) => {
      if (!prev[activeId]) return prev;
      const next = { ...prev, [activeId]: 0 };
      if (unreadKey) writeMap(unreadKey, next);
      return next;
    });
    if (readKey) {
      const map = readMap(readKey);
      map[activeId] = Date.now();
      writeMap(readKey, map);
    }
  }, [activeId, loadMessages, readKey, unreadKey]);

  const { sendTyping, presence } = useVendorChatSocket({
    threadUserId: activeId || null,
    onTyping: applyTyping,
    onMessage: (message) => {
      setThreads((prev) => {
        const next = prev.map((row) =>
          row.id === message.threadUserId
            ? {
                ...row,
                lastMessage: chatPreview(message) || row.lastMessage,
                lastSenderId: message.senderId,
                lastAt: message.createdAt,
              }
            : row
        );
        next.sort((a, b) => {
          const at = a.lastAt ? new Date(a.lastAt).getTime() : 0;
          const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0;
          return bt - at;
        });
        return next;
      });
      if (activeIdRef.current === message.threadUserId) {
        setMessages((prev) => upsertMessage(prev, message));
        if (readKey) {
          const map = readMap(readKey);
          map[message.threadUserId] = Date.now();
          writeMap(readKey, map);
        }
      } else if (user?.id && message.senderId !== user.id) {
        setUnread((prev) => {
          const next = { ...prev, [message.threadUserId]: (prev[message.threadUserId] || 0) + 1 };
          if (unreadKey) writeMap(unreadKey, next);
          return next;
        });
      }
    },
  });

  const send = async (payload: {
    body: string;
    mentionIds: string[];
    files: File[];
    replyToId?: string | null;
  }) => {
    if (!activeId) return;
    sendTyping(false);
    setSending(true);
    try {
      const created = await vendorChatApi.send({
        body: payload.body,
        threadUserId: activeId,
        mentionIds: payload.mentionIds,
        files: payload.files,
        replyToId: payload.replyToId,
      });
      setMessages((prev) => upsertMessage(prev, created));
      setError("");
      setThreads((prev) =>
        prev.map((row) =>
          row.id === activeId
            ? {
                ...row,
                lastMessage: chatPreview(created),
                lastSenderId: created.senderId,
                lastAt: created.createdAt,
              }
            : row
        )
      );
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
      setMessages((prev) => upsertMessage(prev, updated));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not edit message");
    } finally {
      setSending(false);
    }
  };

  const isOnline = (id: string) => Boolean(presence.online[id]);

  const counts = useMemo(() => {
    const online = threads.filter((row) => isOnline(row.id)).length;
    const unreadCount = threads.filter((row) => (unread[row.id] || 0) > 0).length;
    return { all: threads.length, unread: unreadCount, online };
  }, [threads, unread, presence.online]);

  const active = threads.find((row) => row.id === activeId);
  const activeTypers = typers.filter((row) => row.threadUserId === activeId);
  const activeTypingLabel = typingPhrase(activeTypers.map((row) => row.name));
  const online = active ? isOnline(active.id) : false;
  const seenAt = active ? presence.lastSeen[active.id] || active.lastSeenAt : null;

  const filtered = threads.filter((row) => {
    const hay = `${row.name} ${row.vendorName || ""} ${row.roleLabel || ""}`.toLowerCase();
    if (!hay.includes(query.trim().toLowerCase())) return false;
    if (tab === "unread") return (unread[row.id] || 0) > 0;
    if (tab === "online") return isOnline(row.id);
    return true;
  });

  return (
    <div className="chat-shell chat-page flex min-h-0 min-w-0 overflow-hidden rounded-[28px] border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
      <aside
        className={`${
          mobileThreadOpen ? "hidden md:flex" : "flex"
        } w-full shrink-0 flex-col border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#1c1914] md:w-[22rem] md:border-r`}
      >
        <div className="px-4 pt-4 md:px-5 md:pt-5">
          <h1 className="font-serif text-[1.55rem] leading-none text-[#1c1610] md:text-[1.75rem] dark:text-[#f3ece2]">
            Chat Box
          </h1>
          <p className="mt-1.5 text-[12px] text-[#8a8175]">Private line with your vendors</p>
          <div className="relative mt-4">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#c4a574]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20 16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vendors…"
              className="h-10 w-full rounded-full border border-[#eadfcf] bg-white pl-9 pr-3 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#161411] dark:text-[#f3ece2]"
            />
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ["all", `All (${counts.all})`],
                ["unread", `Unread (${counts.unread})`],
                ["online", `Online (${counts.online})`],
              ] as Array<[FilterTab, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  tab === id
                    ? "bg-[#1c1610] text-[#e8d5b5]"
                    : "bg-white text-[#6b645b] ring-1 ring-[#eadfcf]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {filtered.map((row) => {
            const selected = row.id === activeId;
            const count = unread[row.id] || 0;
            const typing = typers.some((typer) => typer.threadUserId === row.id);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  setActiveId(row.id);
                  setMobileThreadOpen(true);
                }}
                className={`mb-0.5 flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                  selected ? "bg-[#f3eadc]" : "hover:bg-white/80"
                }`}
              >
                <ChatAvatar name={row.name} online={isOnline(row.id)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-[14px] text-[#1c1610] dark:text-[#f3ece2]">
                      {row.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-[#8a8175]">{stamp(row.lastAt)}</span>
                  </span>
                  <span className="block truncate text-[11px] uppercase tracking-[0.12em] text-[#c4a574]">
                    {row.vendorName || row.roleLabel || "Vendor"}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span
                      className={`min-w-0 truncate text-[12px] ${
                        typing ? "italic text-[#9a7748]" : "text-[#6b645b]"
                      }`}
                    >
                      {typing ? "Typing…" : row.lastMessage || "No messages yet"}
                    </span>
                    {count > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#8b6914] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {count > 9 ? "9+" : count}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
          {!filtered.length ? (
            <p className="px-3 py-8 text-center text-sm text-[#8a8175]">
              {threads.length ? "No matching vendors." : "No vendor logins yet."}
            </p>
          ) : null}
        </div>
      </aside>
      <div
        className={`${
          mobileThreadOpen ? "flex" : "hidden md:flex"
        } min-w-0 min-h-0 flex-1 flex-col`}
      >
        <div className="flex items-center gap-2 border-b border-[#eadfcf] bg-white px-3 py-3 md:gap-3 md:px-5 md:py-3.5 dark:border-[#3a342c]">
          <button
            type="button"
            onClick={() => setMobileThreadOpen(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1c1610] hover:bg-[#f4efe6] md:hidden"
            aria-label="Back to chats"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {active ? <ChatAvatar name={active.name} size="md" online={online} /> : null}
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="truncate font-serif text-[1.05rem] leading-none text-[#1c1610] md:text-lg dark:text-[#f3ece2]">
                {active?.name || "Select a vendor"}
              </span>
              {active ? (
                <span className={`mt-1 text-[11px] font-sans sm:mt-0 sm:text-[12px] ${online ? "text-[#2f9d64]" : "text-[#8a8175]"}`}>
                  {activeTypingLabel ? (
                    <span className="italic text-[#9a7748]">{activeTypingLabel}</span>
                  ) : online ? (
                    "● Online"
                  ) : (
                    "Offline"
                  )}
                </span>
              ) : null}
            </p>
            <p className="mt-1 truncate text-[11px] text-[#8a8175] md:mt-1.5 md:text-xs">
              {[active?.vendorName || active?.roleLabel, online ? null : lastSeenLabel(seenAt)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        {activeId ? (
          <VendorChatThread
            messages={messages}
            currentUserId={user?.id || ""}
            currentUserName={user?.name || "You"}
            peerName={active?.name || "Vendor"}
            people={people}
            typingNames={activeTypers.map((row) => row.name)}
            onTypingChange={sendTyping}
            onSend={send}
            onEdit={edit}
            sending={sending}
            error={error}
          />
        ) : (
          <p className="m-auto px-6 text-center text-sm text-[#8a8175]">Select a vendor to start chatting.</p>
        )}
      </div>
    </div>
  );
}
