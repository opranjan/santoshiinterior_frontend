"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  leadsApi,
  type LeadMessageDto,
  type WhatsAppInboxItemDto,
} from "@/services/crmApi";
import { enumToLabel } from "@/lib/mappers";
import LeadCommunicationPanel from "./LeadCommunicationPanel";

type SelectedLead = {
  id: string;
  clientName: string;
  phone: string;
  assignedToId?: string | null;
  salesOwnerId?: string | null;
  projectName?: string | null;
  status?: string;
};

type HubProps = {
  /** When set, used instead of URL ?lead= param (e.g. embedded in lead workspace). */
  selectedLeadId?: string;
  selectedLead?: SelectedLead;
  initialMessages?: LeadMessageDto[];
  onRefresh?: () => void;
  fullHeight?: boolean;
};

type ViewMode = "project" | "lead";

const AVATAR_COLORS = [
  "bg-[#128c7e] text-white",
  "bg-[#25d366] text-white",
  "bg-[#075e54] text-white",
  "bg-[#34b7f1] text-white",
  "bg-[#7a2940] text-white",
  "bg-[#9e3350] text-white",
  "bg-[#54656f] text-white",
];

const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "SITE_VISIT",
  "QUOTATION",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const PROJECT_STAGES: Array<{ value: string; label: string }> = [
  { value: "KICKOFF", label: "Planning" },
  { value: "DESIGN", label: "Designing" },
  { value: "MATERIAL", label: "Material" },
  { value: "EXECUTION", label: "Production" },
  { value: "HANDOVER", label: "Installation" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On Hold" },
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function formatListTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function EmptyChatState() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[#efeae2] px-8 text-center dark:bg-[#0b141a]">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#202c33]">
        <WhatsAppIcon className="h-10 w-10 text-[#25d366]" />
      </div>
      <h3 className="text-xl font-semibold text-[#111b21] dark:text-white/90">
        Chat with your team and clients
      </h3>
      <p className="mt-2 max-w-sm text-sm text-[#667781] dark:text-gray-400">
        Pick a conversation on the left to start messaging on WhatsApp.
      </p>
    </div>
  );
}

export default function WhatsAppCommunicationHub({
  selectedLeadId: selectedLeadIdProp,
  selectedLead: selectedLeadProp,
  initialMessages: initialMessagesProp = [],
  onRefresh,
  fullHeight = false,
}: HubProps) {
  const [inbox, setInbox] = useState<WhatsAppInboxItemDto[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("lead");
  const [stageFilter, setStageFilter] = useState("");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(
    selectedLeadIdProp || selectedLeadProp?.id || null
  );

  const [loadedLead, setLoadedLead] = useState<SelectedLead | null>(selectedLeadProp || null);
  const [messages, setMessages] = useState<LeadMessageDto[]>(initialMessagesProp);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadInbox = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingInbox(true);
      setInboxError(null);
      const rows = await leadsApi.getMessagingInbox({
        search: debouncedSearch || undefined,
        viewMode,
        ...(viewMode === "project"
          ? { projectStatus: stageFilter || undefined }
          : { leadStatus: stageFilter || undefined }),
      });
      setInbox(rows);
    } catch (err) {
      setInbox([]);
      setInboxError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoadingInbox(false);
    }
  }, [debouncedSearch, viewMode, stageFilter]);

  useEffect(() => {
    void loadInbox(false);
  }, [loadInbox]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadInbox(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [loadInbox]);

  useEffect(() => {
    if (selectedLeadIdProp || selectedLeadProp) return;
    if (typeof window === "undefined") return;
    const lead = new URLSearchParams(window.location.search).get("lead");
    if (lead) setActiveLeadId(lead);
  }, [selectedLeadIdProp, selectedLeadProp]);

  useEffect(() => {
    if (selectedLeadIdProp) setActiveLeadId(selectedLeadIdProp);
  }, [selectedLeadIdProp]);

  useEffect(() => {
    if (selectedLeadProp) {
      setLoadedLead(selectedLeadProp);
      setMessages(initialMessagesProp);
      setChatError(null);
      return;
    }

    if (!activeLeadId) {
      setLoadedLead(null);
      setMessages([]);
      setChatError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingChat(true);
      setChatError(null);
      try {
        const list = await leadsApi.listMessages(activeLeadId);
        if (cancelled) return;
        setMessages(list || []);
      } catch (err) {
        if (cancelled) return;
        setChatError(err instanceof Error ? err.message : "Failed to open conversation");
      } finally {
        if (!cancelled) setLoadingChat(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeLeadId, selectedLeadProp, initialMessagesProp]);

  useEffect(() => {
    if (!activeLeadId || loadedLead?.id === activeLeadId) return;
    const item = inbox.find((row) => row.id === activeLeadId);
    if (!item) return;
    setLoadedLead({
      id: item.id,
      clientName: item.clientName,
      phone: item.phone,
      projectName: item.projectName,
      status: item.status,
    });
  }, [inbox, activeLeadId, loadedLead?.id]);

  const openLead = (item: WhatsAppInboxItemDto) => {
    if (viewMode === "project" && item.hasLead === false) {
      setChatError("This project is not linked to a lead, so WhatsApp chat is not available.");
      setActiveLeadId(null);
      setLoadedLead(null);
      return;
    }
    setActiveLeadId(item.id);
    setChatError(null);
    setLoadedLead({
      id: item.id,
      clientName: item.clientName,
      phone: item.phone,
      projectName: item.projectName,
      status: item.status,
    });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("lead", item.id);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  };

  const showChat = Boolean(loadedLead?.id && loadedLead.phone?.trim());

  const heightClass = fullHeight ? "h-full" : "h-[min(70vh,640px)]";

  const stageOptions =
    viewMode === "project"
      ? PROJECT_STAGES
      : LEAD_STATUSES.map((s) => ({ value: s, label: enumToLabel(s) }));

  return (
    <div
      className={`relative z-0 flex min-h-0 ${heightClass} overflow-hidden bg-white dark:bg-[#111b21] ${
        fullHeight ? "" : "rounded-2xl border border-gray-200 dark:border-gray-800"
      }`}
    >
      <aside className="flex w-[min(100%,300px)] shrink-0 flex-col overflow-hidden border-r border-[#e9edef] bg-white dark:border-gray-800 dark:bg-[#111b21]">
        <div className="shrink-0 space-y-2.5 border-b border-[#e9edef] px-3 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2 px-0.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25d366]/15 text-[#128c7e]">
              <WhatsAppIcon className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#111b21] dark:text-white/90">Chats</h2>
            <span className="ml-auto text-[11px] text-[#667781]">
              {inbox.length || ""}
            </span>
          </div>

          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8696a0]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or project"
              className="h-9 w-full rounded-lg border-0 bg-[#f0f2f5] pl-9 pr-3 text-sm text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#25d366]/30 dark:bg-[#202c33] dark:text-white/90"
            />
          </div>

          <div className="flex gap-1.5">
            <div className="flex h-8 rounded-lg bg-[#f0f2f5] p-0.5 dark:bg-[#202c33]">
              {(["lead", "project"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setViewMode(mode);
                    setStageFilter("");
                  }}
                  className={`rounded-md px-2.5 text-xs font-medium capitalize transition ${
                    viewMode === mode
                      ? "bg-white text-[#111b21] shadow-sm dark:bg-[#2a3942] dark:text-white"
                      : "text-[#667781]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-lg border-0 bg-[#f0f2f5] px-2 text-xs text-[#111b21] focus:outline-none focus:ring-2 focus:ring-[#25d366]/30 dark:bg-[#202c33] dark:text-gray-200"
            >
              <option value="">All stages</option>
              {stageOptions.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          {loadingInbox && inbox.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Loading chats…</p>
          ) : inboxError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-red-500">{inboxError}</p>
              <button
                type="button"
                onClick={() => void loadInbox()}
                className="mt-2 text-xs font-medium text-[#128c7e] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : inbox.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              {viewMode === "project"
                ? "No projects match your filters."
                : "No leads match your filters."}
            </p>
          ) : (
            inbox.map((item) => {
              const active = item.id === activeLeadId;
              const title =
                item.displayTitle ||
                (viewMode === "project" ? item.projectName : item.clientName) ||
                item.clientName;
              const subtitle =
                item.displaySubtitle ||
                (viewMode === "project"
                  ? item.clientName
                  : item.projectName || item.assigneeName || item.phone);
              const preview = item.lastMessage?.preview || "Start WhatsApp conversation";
              const time = formatListTime(item.lastMessage?.createdAt || item.updatedAt);

              return (
                <button
                  key={item.projectId || item.id}
                  type="button"
                  onClick={() => openLead(item)}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3.5 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] ${
                    active ? "bg-[#fce7ec] hover:bg-[#fce7ec] dark:bg-[#E85D75]/10" : ""
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${avatarColor(item.id)}`}
                  >
                    {initials(title)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-[#111b21] dark:text-white/90">
                        {title}
                      </p>
                      {time ? (
                        <span className="shrink-0 text-[11px] text-[#667781]">{time}</span>
                      ) : null}
                    </div>
                    <p className="truncate text-[12px] text-[#667781]">{subtitle}</p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] text-[#8696a0]">{preview}</p>
                      {item.unreadCount > 0 ? (
                        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#0096fb] px-1.5 text-[10px] font-semibold text-white">
                          {item.unreadCount > 9 ? "9+" : item.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f0f2f5] dark:bg-[#0b141a]">
        {loadingChat && !loadedLead ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading conversation…
          </div>
        ) : showChat && loadedLead ? (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            {chatError ? (
              <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                {chatError}
              </p>
            ) : null}
          <LeadCommunicationPanel
            embedded
            leadId={loadedLead.id}
            clientName={loadedLead.clientName}
            phone={loadedLead.phone}
            assignedToId={loadedLead.assignedToId}
            salesOwnerId={loadedLead.salesOwnerId}
            initialMessages={messages}
            onRefresh={() => {
              void loadInbox(true);
              onRefresh?.();
              if (!selectedLeadProp && activeLeadId) {
                void leadsApi.listMessages(activeLeadId).then((list) => {
                  setMessages(list || []);
                });
              }
            }}
          />
          </div>
        ) : (
          <EmptyChatState />
        )}
      </div>
    </div>
  );
}
