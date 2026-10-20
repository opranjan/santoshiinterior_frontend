"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { designApi, type DesignGenerationDto } from "@/services/crmApi";
import { designAssetUrl } from "@/lib/designAssets";
import DesignGeneratingLoader from "@/components/design/DesignGeneratingLoader";

export type AiStudioMode = "designing" | "elevation";

type Props = {
  mode: AiStudioMode;
};

type SourcePreview = {
  id: string;
  file: File;
  url: string;
};

const MAX_IMAGES = 6;

const defaultPrompts = {
  designing: "Describe what you want to change...",
  elevation: "Describe the elevation look you want...",
};

function chatTitle(item: DesignGenerationDto) {
  const text = String(item.userPrompt || "").trim() || "Untitled design";
  return text.length > 34 ? `${text.slice(0, 34)}…` : text;
}

function formatChatTime(iso: string) {
  const date = new Date(iso);
  const start = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const day = start(date);
  const today = start(new Date());
  const diff = today - day;
  if (diff === 0) {
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  if (diff === 86400000) return "Yesterday";
  if (diff < 7 * 86400000) return `${Math.round(diff / 86400000)} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function threadKey(item: DesignGenerationDto) {
  return item.threadId || item.id;
}

type DesignThread = {
  threadId: string;
  title: string;
  latest: DesignGenerationDto;
  messages: DesignGenerationDto[];
};

function buildThreads(items: DesignGenerationDto[]): DesignThread[] {
  const groups = new Map<string, DesignGenerationDto[]>();
  items.forEach((item) => {
    const key = threadKey(item);
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  });
  return [...groups.entries()]
    .map(([id, messages]) => {
      const sorted = [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return {
        threadId: id,
        title: chatTitle(sorted[0]),
        latest: sorted[sorted.length - 1],
        messages: sorted,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime()
    );
}

type ChatTurn = {
  prompt: string;
  sources: string[];
  results: DesignGenerationDto[];
};

function buildTurns(messages: DesignGenerationDto[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  messages.forEach((item) => {
    const prompt = item.userPrompt || "";
    const last = turns[turns.length - 1];
    if (last && last.prompt === prompt) {
      last.results.push(item);
      return;
    }
    const sources = (
      item.sourceImageUrls?.length ? item.sourceImageUrls : [item.sourceImageUrl]
    ).filter(Boolean) as string[];
    turns.push({ prompt, sources, results: [item] });
  });
  return turns;
}

async function filesFromUrls(urls: string[]) {
  const files: File[] = [];
  for (const [index, url] of urls.filter(Boolean).entries()) {
    try {
      const res = await fetch(designAssetUrl(url));
      if (!res.ok) continue;
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      files.push(new File([blob], `reference-${index + 1}.${ext}`, { type: blob.type || "image/jpeg" }));
    } catch {
      /* skip */
    }
  }
  return files;
}

function voiceToPrompt(base: string, spoken: string) {
  const cleaned = spoken.replace(/\s+/g, " ").trim();
  return [base, cleaned].filter(Boolean).join(" ").trim();
}

function IconSparkle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2zm7 11l.9 2.8L23 16l-3.1 1.1L19 20l-.9-2.9L15 16l3.1-1.2L19 13zM5 14l.8 2.4L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.6L5 14z" />
    </svg>
  );
}

export default function AiDesignStudio({ mode }: Props) {
  const isDesign = mode === "designing";
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef("");
  const listeningRef = useRef(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [sources, setSources] = useState<SourcePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [varying, setVarying] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [history, setHistory] = useState<DesignGenerationDto[]>([]);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ urls: string[]; index: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  promptRef.current = prompt;

  const threads = useMemo(() => buildThreads(history), [history]);
  const activeThread = threads.find((row) => row.threadId === activeThreadId) || null;
  const threadMessages = activeThread?.messages || [];
  const turns = useMemo(() => buildTurns(threadMessages), [threadMessages]);
  const latest = threadMessages[threadMessages.length - 1] || null;

  useEffect(() => {
    return () => {
      sources.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });
    };
  }, [sources]);

  const loadHistory = async (selectFirst = false) => {
    try {
      const items = await designApi.history();
      const rows = items.filter((item) => item.mode === mode);
      setHistory(rows);
      if (selectFirst && rows[0]) {
        setActiveThreadId(threadKey(rows[0]));
      }
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    void loadHistory(true);
    setPrompt("");
    setSources([]);
    setError("");
    setActiveThreadId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [activeThreadId, threadMessages.length, loading, varying]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
      if (event.key === "ArrowRight" && preview.urls.length > 1) {
        setPreview((prev) =>
          prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : prev
        );
      }
      if (event.key === "ArrowLeft" && preview.urls.length > 1) {
        setPreview((prev) =>
          prev
            ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length }
            : prev
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const addFiles = (fileList?: FileList | File[] | null) => {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!incoming.length) return;
    setSources((prev) => {
      const remaining = MAX_IMAGES - prev.length;
      if (remaining <= 0) return prev;
      return [
        ...prev,
        ...incoming.slice(0, remaining).map((file) => ({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
          file,
          url: URL.createObjectURL(file),
        })),
      ];
    });
    setError("");
  };

  const removeSource = (id: string) => {
    setSources((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearComposer = () => {
    setSources((prev) => {
      prev.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });
      return [];
    });
    setPrompt("");
  };

  const resolveFiles = async () => {
    if (sources.length) return sources.map((item) => item.file);
    if (latest?.resultImageUrl) {
      const fromResult = await filesFromUrls([latest.resultImageUrl]);
      if (fromResult.length) return fromResult;
    }
    const urls = latest?.sourceImageUrls?.length
      ? latest.sourceImageUrls
      : latest?.sourceImageUrl
        ? [latest.sourceImageUrl]
        : [];
    return filesFromUrls(urls);
  };

  const generate = async (override?: { prompt?: string; files?: File[]; asVariations?: boolean }) => {
    const text = (override?.prompt ?? prompt).trim();
    const images = override?.files ?? (await resolveFiles());
    if (!images.length) {
      setError("Upload a photo first, then describe what you want to change.");
      return;
    }
    try {
      if (override?.asVariations) setVarying(true);
      else setLoading(true);
      setError("");
      const data = await designApi.generate({
        mode,
        prompt: text || undefined,
        images,
        threadId: activeThreadId || undefined,
      });
      setActiveThreadId(data.threadId || data.id);
      setHistory((prev) => [data, ...prev.filter((row) => row.id !== data.id)].slice(0, 200));
      if (!override?.asVariations) clearComposer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
      setVarying(false);
    }
  };

  const startNewChat = () => {
    setActiveThreadId(null);
    setError("");
    setHistoryOpen(false);
    clearComposer();
    inputRef.current?.focus();
  };

  const openChat = (thread: DesignThread) => {
    setActiveThreadId(thread.threadId);
    setMenuId(null);
    setError("");
    setHistoryOpen(false);
  };

  const downloadResult = async (item = latest) => {
    if (!item?.id || downloading) return;
    try {
      setDownloading(true);
      await designApi.download(item.id, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const editPrompt = () => {
    if (!latest) return;
    setPrompt(latest.userPrompt || "");
    inputRef.current?.focus();
  };

  const makeVariations = async () => {
    if (!latest || varying || loading) return;
    const files = await resolveFiles();
    if (!files.length) {
      setError("Could not load the original photo. Attach it again to make variations.");
      return;
    }
    await generate({
      prompt: latest.userPrompt || prompt,
      files,
      asVariations: true,
    });
  };

  const listen = () => {
    if (listeningRef.current) {
      recognitionRef.current?.stop();
      return;
    }

    type SpeechRec = {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: ((event: {
        results: ArrayLike<{ isFinal?: boolean; 0?: { transcript?: string } }>;
      }) => void) | null;
      onend: (() => void) | null;
      onerror: ((event?: { error?: string }) => void) | null;
      start: () => void;
      stop: () => void;
    };
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Speech = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Speech) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new Speech();
    const base = promptRef.current.trim();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let spoken = "";
      for (let i = 0; i < event.results.length; i += 1) {
        spoken += event.results[i]?.[0]?.transcript || "";
      }
      setPrompt(voiceToPrompt(base, spoken));
    };
    recognition.onerror = () => {
      listeningRef.current = false;
      setListening(false);
    };
    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    listeningRef.current = true;
    setListening(true);
    setError("");
    recognition.start();
  };

  const canSend = Boolean(sources.length || latest?.resultImageUrl || latest?.sourceImageUrl) && !loading;

  const renderHistory = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={startNewChat}
        className="mb-3 flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#111111] text-sm font-medium text-white"
      >
        <span className="text-lg leading-none">+</span> New chat
      </button>
      <div className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {threads.length === 0 ? (
          <p className="px-1 text-sm text-[#9a958e]">No designs yet.</p>
        ) : (
          threads.map((thread) => {
            const selected = thread.threadId === activeThreadId;
            return (
              <div key={thread.threadId} className="relative">
                <button
                  type="button"
                  onClick={() => openChat(thread)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left ${
                    selected ? "bg-[#f4efe6]" : "hover:bg-[#f7f4ef]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={designAssetUrl(thread.latest.resultImageUrl)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[#1c1c1c]">
                      {thread.title}
                    </span>
                    <span className="block text-[11px] text-[#9a958e]">
                      {formatChatTime(thread.latest.createdAt)}
                      {thread.messages.length > 1 ? ` · ${thread.messages.length}` : ""}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  title="More"
                  onClick={() => setMenuId(menuId === thread.threadId ? null : thread.threadId)}
                  className="absolute right-1 top-1.5 flex h-8 w-8 items-center justify-center rounded-md text-[#9a958e] hover:bg-black/5"
                >
                  ⋯
                </button>
                {menuId === thread.threadId ? (
                  <div className="absolute right-1 top-8 z-10 w-36 rounded-lg border border-[#eceae6] bg-white py-1 text-sm shadow-lg">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-[#f7f4ef]"
                      onClick={() => {
                        setMenuId(null);
                        void downloadResult(thread.latest);
                      }}
                    >
                      Download
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3 px-0.5 sm:mb-4">
        <div className="min-w-0">
          <p className="hidden text-[11px] font-medium uppercase tracking-[0.22em] text-[#b0a89d] sm:block">
            {isDesign ? "Interior" : "Architecture"}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-[#111111] dark:text-white sm:mt-1 sm:text-[32px] sm:leading-none">
            {isDesign ? "Designing" : "Elevation"}
          </h1>
          <p className="mt-1 hidden text-sm text-[#8b8680] md:block">
            Create beautiful {isDesign ? "interior designs" : "elevations"} using AI. Upload a photo,
            describe what you want, or get inspired with examples.
          </p>
        </div>
        <div className="flex shrink-0 items-center rounded-xl border border-[#eceae6] bg-white p-0.5 shadow-sm sm:p-1">
          <Link
            href="/design/designing"
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium sm:px-3.5 sm:text-sm ${
              isDesign ? "bg-[#111111] text-white" : "text-[#6b6560] hover:text-[#111111]"
            }`}
          >
            Designing
          </Link>
          <Link
            href="/design/elevation"
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium sm:px-3.5 sm:text-sm ${
              !isDesign ? "bg-[#111111] text-white" : "text-[#6b6560] hover:text-[#111111]"
            }`}
          >
            Elevation
          </Link>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-4">
        <aside className="hidden min-h-0 flex-col overflow-hidden lg:flex">
          {renderHistory()}
        </aside>

        {historyOpen ? (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close chats"
              onClick={() => setHistoryOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xl">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#111111]">Chats</p>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[#6b6560]"
                  onClick={() => setHistoryOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">{renderHistory()}</div>
            </aside>
          </div>
        ) : null}

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#eceae6] bg-white sm:rounded-[24px]">
          <div className="flex shrink-0 items-center gap-2 border-b border-[#f0eeea] px-4 py-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="rounded-lg border border-[#eceae6] px-3 py-1.5 text-sm font-medium text-[#1c1c1c]"
            >
              Chats
            </button>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-[#1c1c1c]">
              {activeThread?.title || "New chat"}
            </p>
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-lg bg-[#111111] px-3 py-1.5 text-sm font-medium text-white"
            >
              New
            </button>
          </div>
          <div ref={listRef} className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:space-y-6 sm:px-8 sm:py-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {!activeThreadId && !loading ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <p className="text-lg font-medium text-[#1c1c1c]">Start a design chat</p>
                <p className="mt-2 max-w-sm text-sm text-[#8b8680]">
                  Attach a room photo, describe the change, and generate a concept.
                </p>
              </div>
            ) : null}

            {turns.map((turn, index) => {
              const gallery = turn.results;
              const lastResult = gallery[gallery.length - 1];
              return (
                <div key={`${turn.prompt}-${index}`} className="space-y-4">
                  <div className="flex justify-end">
                    <div className="flex w-full max-w-[min(100%,520px)] flex-col items-start gap-2 rounded-2xl bg-[#f6f1e8] px-3 py-3 sm:flex-row sm:gap-3">
                      {turn.sources.slice(0, 1).map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setPreview({ urls: turn.sources.map(designAssetUrl), index: 0 })}
                          className="shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={designAssetUrl(url)}
                            alt=""
                            className="h-20 w-28 rounded-xl object-cover"
                          />
                        </button>
                      ))}
                      <p className="pt-1 text-sm leading-relaxed text-[#3f3a34]">
                        {turn.prompt || "Make this space look better."}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-start gap-2 text-sm text-[#3f3a34]">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#111111] text-white">
                        <IconSparkle className="h-3.5 w-3.5" />
                      </span>
                      <p>
                        Here is a {isDesign ? "design" : "elevation"} based on your photo
                        {turn.prompt ? `: ${turn.prompt}` : "."}
                      </p>
                    </div>

                    {gallery.length === 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            urls: [designAssetUrl(gallery[0].resultImageUrl)],
                            index: 0,
                          })
                        }
                        className="block w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={designAssetUrl(gallery[0].resultImageUrl)}
                          alt="Generated concept"
                          className="max-h-[42vh] w-full rounded-2xl object-cover sm:max-h-[420px]"
                        />
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {gallery.map((item, imageIndex) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setPreview({
                                urls: gallery.map((row) => designAssetUrl(row.resultImageUrl)),
                                index: imageIndex,
                              })
                            }
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={designAssetUrl(item.resultImageUrl)}
                              alt=""
                              className="aspect-[4/3] w-full rounded-2xl object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {index === turns.length - 1 ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1 text-[#6b6560]">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void generate({ prompt: lastResult.userPrompt || undefined })}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-[#f7f4ef]"
                        >
                          ↻ Regenerate
                        </button>
                        <button
                          type="button"
                          disabled={downloading}
                          onClick={() => void downloadResult(lastResult)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-[#f7f4ef]"
                        >
                          ↓ Download
                        </button>
                        <button
                          type="button"
                          onClick={editPrompt}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-[#f7f4ef]"
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          disabled={varying || loading}
                          onClick={() => void makeVariations()}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-[#f7f4ef]"
                        >
                          {varying ? "Making variations…" : "⧉ Make variations"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {loading || varying ? (
              <div className="rounded-2xl bg-[#faf8f5] p-6">
                <DesignGeneratingLoader key={varying ? "vary" : "gen"} mode={mode} />
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#f0eeea] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
            {sources.length ? (
              <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
                {sources.map((item) => (
                  <div key={item.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSource(item.id)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1 text-[10px] text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex items-end gap-1 rounded-[22px] border border-[#e6e1d8] bg-white px-2 py-1.5 shadow-sm sm:gap-2 sm:px-3 sm:py-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                title="Attach photo"
                onClick={() => fileRef.current?.click()}
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6b6560] hover:bg-[#f7f4ef]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M8 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) void generate();
                  }
                }}
                placeholder={defaultPrompts[mode]}
                className="max-h-24 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[16px] text-[#1c1c1c] outline-none placeholder:text-[#b0aaa3] sm:max-h-28 sm:text-sm"
              />
              <button
                type="button"
                title={listening ? "Stop voice" : "Voice"}
                onClick={listen}
                className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[#f7f4ef] ${
                  listening ? "bg-[#f4e8e6] text-[#c2410c]" : "text-[#6b6560]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0m5 8v3m-4 0h8" />
                </svg>
              </button>
              <button
                type="button"
                title="Send"
                disabled={!canSend}
                onClick={() => void generate()}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white disabled:bg-[#d4cfc6]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 19V5m0 0l-6 6m6-6l6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-2 sm:p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
            onClick={() => setPreview(null)}
          >
            Close
          </button>
          {preview.urls.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreview((prev) =>
                    prev
                      ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length }
                      : prev
                  );
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreview((prev) =>
                    prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : prev
                  );
                }}
              >
                ›
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.urls[preview.index]}
            alt="Large view"
            className="max-h-[82vh] max-w-[96vw] rounded-xl object-contain sm:max-h-[90vh] sm:max-w-[92vw]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
