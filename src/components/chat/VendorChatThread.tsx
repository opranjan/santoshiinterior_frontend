"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { designAssetUrl } from "@/lib/designAssets";

export type ChatPerson = {
  id: string;
  name: string;
  roleLabel?: string | null;
};

export type ChatAttachment = {
  id: string;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
  fileUrl: string;
};

export type ChatBubble = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  sender?: { id?: string; name?: string } | null;
  attachments?: ChatAttachment[];
  mentions?: Array<{
    userId?: string;
    user?: { id: string; name: string } | null;
  }>;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    body?: string | null;
    senderId?: string;
    sender?: { id?: string; name?: string } | null;
    attachments?: Array<{ id?: string; fileName?: string }>;
  } | null;
};

export type ChatComposePayload = {
  body: string;
  mentionIds: string[];
  files: File[];
  replyToId?: string | null;
};

export function chatPreview(row: { body?: string | null; attachments?: ChatAttachment[] | null }) {
  const body = String(row.body || "").trim();
  if (body) return body;
  const count = row.attachments?.length || 0;
  if (count === 1) return "Sent a file";
  if (count > 1) return `Sent ${count} files`;
  return "";
}

export function typingPhrase(names: string[]) {
  const unique = [...new Set(names.filter(Boolean))];
  if (!unique.length) return "";
  if (unique.length === 1) return `${unique[0]} is typing…`;
  if (unique.length === 2) return `${unique[0]} and ${unique[1]} are typing…`;
  return `${unique[0]} and ${unique.length - 1} others are typing…`;
}

function initials(name?: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "SI";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function dayKey(iso?: string) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso?: string) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const rest = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return `Today, ${rest}`;
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return `Yesterday, ${rest}`;
  return rest;
}

export function avatarTone(seed?: string | null) {
  const palette = ["#1c1610", "#2f4a3c", "#3d4f6b", "#5a3d5c", "#6b4a2f", "#3a5a52"];
  const text = String(seed || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function ChatAvatar({
  name,
  size = "md",
  online,
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const dim = size === "lg" ? "h-12 w-12 text-sm" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-[11px]";
  return (
    <span className="relative shrink-0">
      <span
        className={`chat-avatar inline-flex items-center justify-center rounded-full font-semibold tracking-wide text-[#e8d5b5] ${dim}`}
        style={{ background: avatarTone(name) }}
      >
        {initials(name)}
      </span>
      {online ? (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2f9d64]" />
      ) : null}
    </span>
  );
}

function timeOnly(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function fileSize(bytes?: number | null) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function MentionText({
  body,
  mentions,
}: {
  body: string;
  mentions?: ChatBubble["mentions"];
}) {
  const names = (mentions || [])
    .map((row) => row.user?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => b.length - a.length);

  if (!body) return null;
  if (!names.length) {
    return <p className="whitespace-pre-wrap break-words leading-relaxed">{body}</p>;
  }

  const pattern = new RegExp(`(@(?:${names.map(escapeRegExp).join("|")}))`, "g");
  const parts = body.split(pattern);
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, index) =>
        part.startsWith("@") && names.includes(part.slice(1)) ? (
          <span
            key={`${part}-${index}`}
            className="chat-mention font-semibold"
          >
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </p>
  );
}

function fileKind(file: ChatAttachment) {
  const mime = String(file.mimeType || "");
  const name = String(file.fileName || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "DOC";
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "XLS";
  if (name.endsWith(".zip")) return "ZIP";
  return "FILE";
}

function AttachmentList({
  files,
  mine,
}: {
  files: ChatAttachment[];
  mine: boolean;
}) {
  if (!files.length) return null;
  return (
    <div className={`${files.length ? "mt-2" : ""} flex flex-wrap gap-2`}>
      {files.map((file) => {
        const url = designAssetUrl(file.fileUrl);
        const kind = fileKind(file);
        if (kind === "image") {
          return (
            <a
              key={file.id}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={file.fileName}
                className="max-h-44 max-w-[220px] object-cover"
              />
            </a>
          );
        }
        return (
          <a
            key={file.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`flex min-w-[180px] items-center gap-3 rounded-2xl px-3 py-2.5 text-xs ${
              mine ? "bg-white/10 text-[#f7f3ea]" : "border border-[#eadfcf] bg-white text-[#1c1610]"
            }`}
          >
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${
                mine ? "bg-white/15 text-[#e8d5b5]" : "bg-[#f4efe6] text-[#b42318]"
              }`}
            >
              {kind}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{file.fileName}</span>
              <span className={mine ? "text-[#d4c8b8]" : "text-[#8a8175]"}>{fileSize(file.size)}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-70">
              <path d="M12 4v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </a>
        );
      })}
    </div>
  );
}

function activeMention(text: string, caret: number) {
  const until = text.slice(0, caret);
  const match = until.match(/(^|[\s])@([^\s@]*)$/);
  if (!match) return null;
  return {
    query: match[2],
    start: until.length - match[2].length - 1,
  };
}

const SWIPE_MAX = 72;
const SWIPE_ARM = 56;

function SwipeReplyRow({
  mine,
  onReply,
  className,
  children,
}: {
  mine: boolean;
  onReply: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const origin = useRef<{ x: number; y: number; tracking: boolean } | null>(null);
  const [dx, setDx] = useState(0);
  const [armed, setArmed] = useState(false);
  const sliding = Boolean(origin.current?.tracking);

  const clamp = (value: number) => {
    if (mine) return Math.max(-SWIPE_MAX, Math.min(0, value));
    return Math.max(0, Math.min(SWIPE_MAX, value));
  };

  const reset = () => {
    origin.current = null;
    setArmed(false);
    setDx(0);
  };

  return (
    <div
      className={`chat-swipe relative ${className || ""}`}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        origin.current = { x: event.clientX, y: event.clientY, tracking: false };
      }}
      onPointerMove={(event) => {
        if (!origin.current) return;
        const rawX = event.clientX - origin.current.x;
        const rawY = event.clientY - origin.current.y;
        if (!origin.current.tracking) {
          if (Math.abs(rawX) < 10 && Math.abs(rawY) < 10) return;
          if (Math.abs(rawY) >= Math.abs(rawX)) {
            origin.current = null;
            return;
          }
          origin.current.tracking = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        const next = clamp(rawX);
        setDx(next);
        setArmed(Math.abs(next) >= SWIPE_ARM);
      }}
      onPointerUp={(event) => {
        const fire = armed;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
        reset();
        if (fire) onReply();
      }}
      onPointerCancel={reset}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1/2 z-0 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#c4a574] text-white ${
          mine ? "right-1" : "left-9"
        }`}
        style={{
          opacity: Math.min(1, Math.abs(dx) / SWIPE_ARM),
          transform: `translateY(-50%) scale(${armed ? 1 : 0.78})`,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path
            d="M10 8V5L3 12l7 7v-3c6 0 10 2 13 6-1-7-5-13-13-14Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <div
        className="chat-swipe-shift relative z-[1] flex w-full min-w-0 items-end gap-2"
        style={{
          transform: `translateX(${dx}px)`,
          transition: sliding ? "none" : "transform 0.18s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function VendorChatThread({
  messages,
  currentUserId,
  currentUserName,
  peerName,
  people = [],
  typingNames = [],
  onTypingChange,
  onSend,
  onEdit,
  sending,
  error,
}: {
  messages: ChatBubble[];
  currentUserId: string;
  currentUserName?: string;
  peerName: string;
  people?: ChatPerson[];
  typingNames?: string[];
  onTypingChange?: (active: boolean) => void;
  onSend: (payload: ChatComposePayload) => Promise<void> | void;
  onEdit?: (id: string, payload: { body: string; mentionIds: string[] }) => Promise<void> | void;
  sending?: boolean;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatBubble | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [caret, setCaret] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);
  const typingOnRef = useRef(false);
  const typingIdleRef = useRef<number | undefined>(undefined);
  const typingSentAtRef = useRef(0);
  const onTypingChangeRef = useRef(onTypingChange);
  onTypingChangeRef.current = onTypingChange;

  const setRemoteTyping = (active: boolean) => {
    if (active) {
      const now = Date.now();
      if (!typingOnRef.current || now - typingSentAtRef.current > 1200) {
        typingOnRef.current = true;
        typingSentAtRef.current = now;
        onTypingChangeRef.current?.(true);
      }
      if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
      typingIdleRef.current = window.setTimeout(() => {
        typingOnRef.current = false;
        onTypingChangeRef.current?.(false);
      }, 1800);
      return;
    }
    if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
    typingIdleRef.current = undefined;
    if (typingOnRef.current) {
      typingOnRef.current = false;
      onTypingChangeRef.current?.(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }, [messages.length, typingNames.length]);

  useEffect(
    () => () => {
      if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
      if (typingOnRef.current) onTypingChangeRef.current?.(false);
    },
    []
  );

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [draft]);

  const mention = activeMention(draft, caret);
  const suggestions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return people
      .filter((person) => !q || person.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mention, people]);

  useEffect(() => {
    setHighlight(0);
  }, [mention?.query, suggestions.length]);

  const applyMention = (person: ChatPerson) => {
    if (!mention) {
      setDraft((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}@${person.name} `);
    } else {
      const next = `${draft.slice(0, mention.start)}@${person.name} ${draft.slice(caret)}`;
      setDraft(next);
    }
    setMentionIds((prev) => (prev.includes(person.id) ? prev : [...prev, person.id]));
    setCaret(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const resetComposer = () => {
    setDraft("");
    setMentionIds([]);
    setFiles([]);
    setEditingId(null);
    setReplyTo(null);
  };

  const resolvedMentions = () =>
    mentionIds.filter((id) => {
      const person = people.find((row) => row.id === id);
      return person ? draft.includes(`@${person.name}`) : false;
    });

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (sending) return;
    const text = draft.trim();
    if (editingId) {
      if (!text && !messages.find((row) => row.id === editingId)?.attachments?.length) return;
      await onEdit?.(editingId, { body: text, mentionIds: resolvedMentions() });
      resetComposer();
      return;
    }
    if (!text && !files.length) return;
    const payload = {
      body: text,
      mentionIds: resolvedMentions(),
      files,
      replyToId: replyTo?.id || null,
    };
    setRemoteTyping(false);
    resetComposer();
    await onSend(payload);
  };

  const startEdit = (row: ChatBubble) => {
    setEditingId(row.id);
    setReplyTo(null);
    setDraft(row.body || "");
    setFiles([]);
    setMentionIds(
      (row.mentions || [])
        .map((item) => item.user?.id || item.userId || "")
        .filter(Boolean)
    );
    inputRef.current?.focus();
  };

  const startReply = (row: ChatBubble) => {
    setEditingId(null);
    setReplyTo(row);
    inputRef.current?.focus();
  };

  const jumpTo = (id: string) => {
    const node = document.getElementById(`chat-msg-${id}`);
    node?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    setFlashId(id);
    window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 1600);
  };

  const addFiles = (list: FileList | null) => {
    if (!list?.length || editingId) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 5));
  };

  const canSend = Boolean(draft.trim() || files.length || editingId);

  return (
    <div className="chat-canvas flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <div className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-5 md:py-5">
        {!messages.length ? (
          <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16 text-center">
            <span className="chat-avatar inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#1c1610] font-serif text-xl text-[#e8d5b5]">
              {initials(peerName)}
            </span>
            <p className="mt-5 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]">Chat with {peerName}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#8a8175]">
              A private studio thread. Send notes, tag the team, or attach drawings and documents.
            </p>
          </div>
        ) : null}
        {messages.map((row, index) => {
          const mine = row.senderId === currentUserId;
          const prev = messages[index - 1];
          const newDay = dayKey(row.createdAt) !== dayKey(prev?.createdAt);
          const stacked = !newDay && prev?.senderId === row.senderId;
          const name = row.sender?.name || peerName;
          return (
            <React.Fragment key={row.id}>
              {newDay ? (
                <div className="mb-4 mt-1 flex justify-center">
                  <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] text-[#8a8175] shadow-[0_4px_12px_rgba(28,22,16,0.05)]">
                    {dayLabel(row.createdAt)}
                  </span>
                </div>
              ) : null}
              <SwipeReplyRow
                mine={mine}
                onReply={() => startReply(row)}
                className={`${stacked ? "mt-1" : "mt-3.5"} ${
                  flashId === row.id ? "rounded-2xl ring-2 ring-[#c4a574] ring-offset-2" : ""
                }`}
              >
                <div
                  id={`chat-msg-${row.id}`}
                  className={`flex w-full min-w-0 items-end gap-2 ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                {!mine ? <ChatAvatar name={name} size="sm" /> : null}
                <div className={`group flex min-w-0 max-w-[min(85%,20rem)] flex-col ${mine ? "items-end" : "items-start"} sm:max-w-[calc(100%-3.25rem)]`}>
                <div
                  className={`group w-fit min-w-0 overflow-visible px-3.5 py-2 text-[14.5px] leading-[1.45] [overflow-wrap:anywhere] ${
                    mine
                      ? "chat-bubble-mine rounded-[18px] rounded-br-md"
                      : "chat-bubble-theirs rounded-[18px] rounded-bl-md"
                  }`}
                >
                  {row.replyTo ? (
                    <button
                      type="button"
                      onClick={() => jumpTo(row.replyTo!.id)}
                      className="chat-quote"
                    >
                      <span className="chat-quote-name">
                        {row.replyTo.sender?.name || (row.replyTo.senderId === currentUserId ? "You" : peerName)}
                      </span>
                      <span className="chat-quote-body">
                        {chatPreview({
                          body: row.replyTo.body,
                          attachments: row.replyTo.attachments as ChatAttachment[] | undefined,
                        }) || "Message"}
                      </span>
                    </button>
                  ) : null}
                  <MentionText body={row.body} mentions={row.mentions} />
                  <AttachmentList files={row.attachments || []} mine={mine} />
                </div>
                <div className={`mt-1 flex items-center gap-2 text-[10px] text-[#8a8175] ${mine ? "flex-row-reverse" : ""}`}>
                  <span className="inline-flex items-center gap-1">
                    {timeOnly(row.createdAt)}
                    {row.editedAt ? " · edited" : ""}
                    {mine ? (
                      <svg width="14" height="12" viewBox="0 0 16 12" fill="none" aria-hidden>
                        <path d="M1.2 6.4 3.6 9 8.8 2.4" stroke="#c4a574" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.2 6.6 8.4 9.1 14.6 2.2" stroke="#c4a574" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="chat-actions inline-flex items-center gap-2">
                    <button type="button" onClick={() => startReply(row)} className="hover:text-[#1c1610]">
                      Reply
                    </button>
                    {mine && onEdit ? (
                      <button type="button" onClick={() => startEdit(row)} className="hover:text-[#1c1610]">
                        Edit
                      </button>
                    ) : null}
                  </span>
                </div>
                </div>
                {mine ? <ChatAvatar name={currentUserName || "You"} size="sm" /> : null}
                </div>
              </SwipeReplyRow>
            </React.Fragment>
          );
        })}
        {typingNames.length ? (
          <div className="mt-3 flex items-end gap-2">
            <ChatAvatar name={typingNames[0] || peerName} size="sm" />
            <div className="chat-bubble-theirs rounded-[18px] rounded-bl-md px-3.5 py-2.5">
              <span className="inline-flex items-center gap-1.5" aria-label={typingPhrase(typingNames)}>
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </span>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      {error ? (
        <p className="px-4 pb-1 text-xs text-rose-600">{error}</p>
      ) : null}
      <form
        onSubmit={(e) => void submit(e)}
        className="chat-composer-wrap relative z-10 min-w-0 shrink-0 border-t border-[#eadfcf] bg-white px-2 py-2 md:px-4 md:py-3.5 dark:border-[var(--vendor-line)]"
      >
        {editingId ? (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-[#f4efe6] px-3 py-1.5 text-[11px] text-[#6b645b]">
            <span>Editing message</span>
            <button type="button" onClick={resetComposer} className="font-semibold uppercase tracking-[0.12em]">
              Cancel
            </button>
          </div>
        ) : null}
        {replyTo ? (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-2xl border border-[#eadfcf] bg-white px-3 py-2.5 shadow-sm">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a7748]">
                Replying to {replyTo.sender?.name || (replyTo.senderId === currentUserId ? "yourself" : peerName)}
              </p>
              <p className="truncate text-xs text-[#6b645b]">{chatPreview(replyTo) || "Message"}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="text-sm text-[#8a8175]">
              ×
            </button>
          </div>
        ) : null}
        {files.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-[#eadfcf] bg-white px-2.5 py-1 text-[11px] text-[#1c1610]"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  className="text-[#8a8175]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {suggestions.length ? (
          <div className="absolute bottom-[4.8rem] left-3 right-3 z-10 overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-[0_12px_40px_rgba(28,22,16,0.12)] dark:border-[#3a342c] dark:bg-[#1a1714]">
            <p className="border-b border-[#eadfcf] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c4a574]">
              Tag someone
            </p>
            {suggestions.map((person, index) => (
              <button
                key={person.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyMention(person);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${
                  index === highlight ? "bg-[#f4efe6]" : "hover:bg-[#fbf8f3]"
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1610] text-[10px] font-semibold text-[#e8d5b5]">
                  {initials(person.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[#1c1610] dark:text-[#f3ece2]">@{person.name}</span>
                  <span className="text-[11px] text-[#8a8175]">{person.roleLabel || "Team"}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="relative min-w-0">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,image/*"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={imageRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {emojiOpen ? (
            <div className="absolute bottom-full left-0 z-20 mb-2 grid grid-cols-5 gap-1 rounded-2xl border border-[#eadfcf] bg-white p-2 shadow-[0_12px_32px_rgba(28,22,16,0.12)]">
              {["😀", "😊", "😂", "👍", "🙏", "✅", "❤️", "🏠", "📐", "✨"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="h-8 w-8 rounded-lg text-lg hover:bg-[#f4efe6]"
                  onClick={() => {
                    setDraft((prev) => prev + emoji);
                    setEmojiOpen(false);
                    inputRef.current?.focus();
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        <div className="chat-composer-bar">
          <button
            type="button"
            title="Emoji"
            onClick={() => setEmojiOpen((open) => !open)}
            className="chat-composer-icon"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
              <path d="M8.5 14.5c1 1.4 2.6 2.1 3.5 2.1s2.5-.7 3.5-2.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            title="Attach file"
            disabled={Boolean(editingId)}
            onClick={() => fileRef.current?.click()}
            className="chat-composer-icon"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M21 12.5 12.4 21a5 5 0 0 1-7.1-7.1l9.2-9.2a3.3 3.3 0 1 1 4.7 4.7l-9.2 9.1a1.7 1.7 0 0 1-2.4-2.4l8.1-8.1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            title="Attach photo"
            disabled={Boolean(editingId)}
            onClick={() => imageRef.current?.click()}
            className="chat-composer-icon"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="8.5" cy="10" r="1.4" stroke="currentColor" strokeWidth="1.5" />
              <path d="m8 16 3.2-3.4 2.3 2.3L16.2 12 20 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              setCaret(event.target.selectionStart || 0);
              setRemoteTyping(Boolean(value.trim()) && !editingId);
            }}
            onClick={(event) => setCaret(event.currentTarget.selectionStart || 0)}
            onKeyUp={(event) => setCaret(event.currentTarget.selectionStart || 0)}
            onKeyDown={(event) => {
              if (suggestions.length) {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlight((prev) => (prev + 1) % suggestions.length);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlight((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyMention(suggestions[highlight] || suggestions[0]);
                  return;
                }
                if (event.key === "Escape") {
                  setCaret(0);
                }
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Type a message…"
            className="chat-composer-input"
          />
          <button
            type="submit"
            disabled={sending || !canSend}
            className={`chat-composer-icon chat-composer-send ${canSend && !sending ? "chat-send-ready" : ""}`}
            title={editingId ? "Save" : "Send"}
          >
            {sending ? (
              <span className="text-[9px] font-bold">…</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3.5 11.5 20 4l-6.2 16.2-2.7-6.3L3.5 11.5Z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
        </div>
      </form>
    </div>
  );
}

