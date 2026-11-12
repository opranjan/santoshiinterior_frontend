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
  type VendorChatTeam,
  type VendorChatThreadDto,
} from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { useVendorChatSocket, useVendorChatTypers } from "@/hooks/useVendorChatSocket";

type FilterTab = "all" | "unread" | "online";
type TeamTab = VendorChatTeam;

const TEAM_TABS: Array<{ id: TeamTab; label: string }> = [
  { id: "vendor", label: "Vendor" },
  { id: "sales", label: "Sales" },
  { id: "procurement", label: "Procurement" },
  { id: "hr", label: "HR" },
  { id: "design", label: "Design" },
  { id: "other", label: "Other" },
];

function isSalesRoleUser(user: { role?: string; accessRole?: { key?: string; baseRole?: string } | null } | null | undefined) {
  if (!user) return false;
  return (
    user.role === "SALES" ||
    user.accessRole?.key === "SALES" ||
    user.accessRole?.baseRole === "SALES"
  );
}

function teamLabel(team?: string | null) {
  const row = TEAM_TABS.find((tab) => tab.id === team);
  return row?.label || "Team";
}

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
  const [teamTab, setTeamTab] = useState<TeamTab>("vendor");
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
    leadId?: string | null;
    customerId?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    locationName?: string | null;
    locationAddress?: string | null;
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
        leadId: payload.leadId,
        customerId: payload.customerId,
        locationLat: payload.locationLat,
        locationLng: payload.locationLng,
        locationName: payload.locationName,
        locationAddress: payload.locationAddress,
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

  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TEAM_TABS.forEach((team) => {
      counts[team.id] = threads.filter((row) => (row.team || "other") === team.id).length;
    });
    return counts;
  }, [threads]);

  const salesVendorOnly = isSalesRoleUser(user);

  const visibleTeams = useMemo(() => {
    if (salesVendorOnly) {
      return TEAM_TABS.filter((team) => team.id === "vendor");
    }
    return TEAM_TABS.filter((team) => team.id === "vendor" || (teamCounts[team.id] || 0) > 0);
  }, [teamCounts, salesVendorOnly]);

  const teamScoped = useMemo(
    () => threads.filter((row) => (row.team || "other") === teamTab),
    [threads, teamTab]
  );

  useEffect(() => {
    if (!visibleTeams.some((team) => team.id === teamTab) && visibleTeams[0]) {
      setTeamTab(visibleTeams[0].id);
    }
  }, [visibleTeams, teamTab]);

  const counts = useMemo(() => {
    const online = teamScoped.filter((row) => isOnline(row.id)).length;
    const unreadCount = teamScoped.filter((row) => (unread[row.id] || 0) > 0).length;
    return { all: teamScoped.length, unread: unreadCount, online };
  }, [teamScoped, unread, presence.online]);

  const active = threads.find((row) => row.id === activeId);
  const activeTypers = typers.filter((row) => row.threadUserId === activeId);
  const activeTypingLabel = typingPhrase(activeTypers.map((row) => row.name));
  const online = active ? isOnline(active.id) : false;
  const seenAt = active ? presence.lastSeen[active.id] || active.lastSeenAt : null;

  const filtered = teamScoped.filter((row) => {
    const hay = `${row.name} ${row.vendorName || ""} ${row.vendorType || ""} ${row.roleLabel || ""} ${row.team || ""}`.toLowerCase();
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
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-[1.55rem] leading-none text-[#1c1610] md:text-[1.75rem] dark:text-[#f3ece2]">
              Chat Box
            </h1>
            <span className="ml-auto text-[11px] text-[#8a8175]">{counts.all || ""}</span>
          </div>
          <p className="mt-1.5 text-[12px] text-[#8a8175]">
            {salesVendorOnly ? "Vendor chats" : "Switch team like WhatsApp views"}
          </p>

          <div className="mt-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex h-9 min-w-full rounded-lg bg-[#efe8dc] p-0.5 dark:bg-[#2a241c]">
              {visibleTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    setTeamTab(team.id);
                    setTab("all");
                    setActiveId("");
                    setMobileThreadOpen(false);
                  }}
                  className={`shrink-0 rounded-md px-3 text-xs font-semibold capitalize transition ${
                    teamTab === team.id
                      ? "bg-white text-[#1c1610] shadow-sm dark:bg-[#3a342c] dark:text-[#f3ece2]"
                      : "text-[#6b645b] hover:text-[#1c1610]"
                  }`}
                >
                  {team.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-3">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#c4a574]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20 16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${teamLabel(teamTab).toLowerCase()}…`}
              className="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] ring-1 ring-[#eadfcf] focus:ring-2 focus:ring-[#c4a574]/40 dark:bg-[#161411] dark:text-[#f3ece2] dark:ring-[#3a342c]"
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            {(
              [
                ["all", "All"],
                ["unread", "Unread"],
                ["online", "Online"],
              ] as Array<[FilterTab, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  tab === id
                    ? "bg-[#1c1610] text-[#e8d5b5]"
                    : "text-[#6b645b] hover:bg-white/70"
                }`}
              >
                {label}
                {id === "unread" && counts.unread ? ` (${counts.unread})` : ""}
                {id === "online" && counts.online ? ` (${counts.online})` : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
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
                    {[teamLabel(row.team), row.vendorType, row.vendorName || row.roleLabel]
                      .filter(Boolean)
                      .join(" · ")}
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
              {threads.length
                ? "No matching people in this team."
                : "No chat contacts yet."}
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
                {active?.name || "Select a chat"}
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
              {[
                active?.vendorType,
                active?.vendorName || active?.roleLabel,
                online ? null : lastSeenLabel(seenAt),
              ]
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
            peerName={active?.name || "Chat"}
            people={people}
            typingNames={activeTypers.map((row) => row.name)}
            onTypingChange={sendTyping}
            onSend={send}
            onEdit={edit}
            sending={sending}
            error={error}
          />
        ) : (
          <p className="m-auto px-6 text-center text-sm text-[#8a8175]">
            Select a person from a team to start chatting.
          </p>
        )}
      </div>
    </div>
  );
}
