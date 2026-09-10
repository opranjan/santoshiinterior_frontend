"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  leadsApi,
  projectsApi,
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
    <div className="flex h-full min-h-[480px] flex-col items-center justify-center bg-[#f8f9fb] px-8 text-center dark:bg-[#111b21]">
      <div className="relative mb-8">
        <div className="flex h-36 w-52 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-[#202c33]">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366]/15 text-[#25d366]">
              <WhatsAppIcon className="h-8 w-8" />
            </div>
            <div className="h-2 w-24 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-2 w-16 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      </div>
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        Chat with your leads on WhatsApp
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        Click on a chat from the list to start communication. Filter by project, lead, or stage.
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadFromUrl = searchParams.get("lead");

  const activeLeadId = selectedLeadIdProp || leadFromUrl || null;

  const [inbox, setInbox] = useState<WhatsAppInboxItemDto[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [leadFilter, setLeadFilter] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  const [loadedLead, setLoadedLead] = useState<SelectedLead | null>(selectedLeadProp || null);
  const [messages, setMessages] = useState<LeadMessageDto[]>(initialMessagesProp);
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await projectsApi.list({ limit: 200 });
        const items = (res.items || []).map((p) => ({
          id: String(p.id),
          name: String(p.name || "Project"),
        }));
        setProjects(items);
      } catch {
        setProjects([]);
      }
    })();
  }, []);

  const loadInbox = useCallback(async () => {
    try {
      setLoadingInbox(true);
      const rows = await leadsApi.getMessagingInbox({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        projectId: projectFilter || undefined,
        leadId: leadFilter || undefined,
      });
      setInbox(rows);
    } catch {
      // keep list
    } finally {
      setLoadingInbox(false);
    }
  }, [search, statusFilter, projectFilter, leadFilter]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadInbox();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadInbox]);

  useEffect(() => {
    if (selectedLeadProp) {
      setLoadedLead(selectedLeadProp);
      setMessages(initialMessagesProp);
      return;
    }

    if (!activeLeadId) {
      setLoadedLead(null);
      setMessages([]);
      return;
    }

    (async () => {
      setLoadingChat(true);
      try {
        const ws = await leadsApi.getWorkspace(activeLeadId);
        const lead = ws.lead;
        setLoadedLead({
          id: lead.id,
          clientName: lead.clientName,
          phone: lead.phone,
          assignedToId: lead.assignedToId,
          salesOwnerId: lead.salesOwnerId,
          projectName: lead.project?.name || lead.projectName,
          status: lead.status,
        });
        setMessages(ws.messages || []);
      } catch {
        setLoadedLead(null);
        setMessages([]);
      } finally {
        setLoadingChat(false);
      }
    })();
  }, [activeLeadId, selectedLeadProp, initialMessagesProp]);

  const leadOptions = useMemo(
    () =>
      inbox.map((item) => ({
        id: item.id,
        label: item.projectName
          ? `${item.clientName} · ${item.projectName}`
          : item.clientName,
      })),
    [inbox]
  );

  const openLead = (id: string) => {
    if (selectedLeadIdProp) {
      router.push(`/communication/whatsapp?lead=${id}`);
      return;
    }
    router.push(`/communication/whatsapp?lead=${id}`);
  };

  const showChat = Boolean(loadedLead?.phone?.trim());

  const heightClass = fullHeight
    ? "h-[min(calc(100vh-140px),820px)]"
    : "h-[min(calc(100vh-220px),760px)]";

  return (
    <div
      className={`flex ${heightClass} overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#111b21]`}
    >
      <aside className="flex w-full max-w-[360px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-[#111b21]">
        <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366]/15 text-[#128c7e]">
              <WhatsAppIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">WhatsApp</h2>
              <p className="text-[11px] text-gray-500">Lead conversations</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Search leads
            </label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, project…"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#128c7e] focus:outline-none focus:ring-2 focus:ring-[#128c7e]/20 dark:border-gray-700 dark:bg-[#202c33] dark:text-white/90"
            />
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Project
              </label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-[#128c7e] focus:outline-none dark:border-gray-700 dark:bg-[#202c33] dark:text-gray-200"
              >
                <option value="">All projects</option>
                <option value="none">No project assigned</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Lead
              </label>
              <select
                value={leadFilter}
                onChange={(e) => {
                  const id = e.target.value;
                  setLeadFilter(id);
                  if (id) openLead(id);
                }}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-[#128c7e] focus:outline-none dark:border-gray-700 dark:bg-[#202c33] dark:text-gray-200"
              >
                <option value="">All leads</option>
                {leadOptions.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Select stage
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-[#128c7e] focus:outline-none dark:border-gray-700 dark:bg-[#202c33] dark:text-gray-200"
              >
                <option value="">All stages</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {enumToLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingInbox && inbox.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Loading chats…</p>
          ) : inbox.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              No leads match your filters.
            </p>
          ) : (
            inbox.map((item) => {
              const active = item.id === activeLeadId;
              const title = item.projectName || item.clientName;
              const subtitle = item.projectName
                ? item.clientName
                : item.assigneeName || item.phone;
              const preview = item.lastMessage?.preview || "Start WhatsApp conversation";
              const time = formatListTime(item.lastMessage?.createdAt || item.updatedAt);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openLead(item.id)}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3.5 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] ${
                    active ? "bg-[#fce7ec] hover:bg-[#fce7ec] dark:bg-[#E85D75]/10" : ""
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(item.id)}`}
                  >
                    {initials(item.clientName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white/90">
                        {title}
                      </p>
                      {time ? (
                        <span className="shrink-0 text-[10px] text-gray-400">{time}</span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-gray-400 dark:text-gray-500">{preview}</p>
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

      <div className="min-w-0 flex-1 bg-[#f0f2f5] dark:bg-[#0b141a]">
        {loadingChat ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading conversation…
          </div>
        ) : showChat && loadedLead ? (
          <LeadCommunicationPanel
            embedded
            leadId={loadedLead.id}
            clientName={loadedLead.clientName}
            phone={loadedLead.phone}
            assignedToId={loadedLead.assignedToId}
            salesOwnerId={loadedLead.salesOwnerId}
            initialMessages={messages}
            onRefresh={() => {
              void loadInbox();
              onRefresh?.();
              if (!selectedLeadProp && activeLeadId) {
                void leadsApi.getWorkspace(activeLeadId).then((ws) => {
                  setMessages(ws.messages || []);
                });
              }
            }}
          />
        ) : (
          <EmptyChatState />
        )}
      </div>
    </div>
  );
}
