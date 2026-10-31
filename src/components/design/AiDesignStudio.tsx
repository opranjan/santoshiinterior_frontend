"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { designApi, type DesignGenerationDto } from "@/services/crmApi";
import { designAssetUrl } from "@/lib/designAssets";
import DesignGeneratingLoader from "@/components/design/DesignGeneratingLoader";
import DesignResultDescription from "@/components/design/DesignResultDescription";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";

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

function buildGeneratingIntro(mode: AiStudioMode, userPrompt: string) {
  const brief = userPrompt.trim() || (mode === "elevation" ? "redesign this elevation" : "redesign this room");
  if (mode === "elevation") {
    return `I'll update your building photo based on: “${brief}”. I'll keep the same structure and camera angle, then refine materials, facade detail, and lighting.`;
  }
  return `I'll update your room photo based on: “${brief}”. I'll keep the same layout and camera angle, then adjust colors, materials, furniture, and lighting to match.`;
}

function TypewriterText({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const timer = window.setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [text]);
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-6 text-[#0d0d0d]">
      {shown}
      {shown.length < text.length ? (
        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#0d0d0d] align-middle" />
      ) : null}
    </p>
  );
}

function chatTitle(item: DesignGenerationDto) {
  const text = String(item.userPrompt || "").trim() || "Untitled design";
  return text.length > 34 ? `${text.slice(0, 34)}…` : text;
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
  const { user } = useAuth();
  const router = useRouter();
  const vendorPanel = isVendorPanelUser(user);
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
  const [pendingPrompt, setPendingPrompt] = useState("");
  const generateAbortRef = useRef<AbortController | null>(null);

  promptRef.current = prompt;

  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
      generateAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (vendorPanel && mode === "elevation") {
      router.replace("/design/designing");
    }
  }, [vendorPanel, mode, router]);

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
    generateAbortRef.current?.abort();
    const abort = new AbortController();
    generateAbortRef.current = abort;
    try {
      setPendingPrompt(text);
      if (override?.asVariations) setVarying(true);
      else setLoading(true);
      setError("");
      /** Clear composer immediately after submit (ChatGPT-style). */
      if (!override?.asVariations) {
        clearComposer();
        if (inputRef.current) inputRef.current.style.height = "auto";
      }
      const data = await designApi.generate(
        {
          mode,
          prompt: text || undefined,
          images,
          threadId: activeThreadId || undefined,
        },
        { signal: abort.signal }
      );
      if (abort.signal.aborted) return;
      setActiveThreadId(data.threadId || data.id);
      setHistory((prev) => [data, ...prev.filter((row) => row.id !== data.id)].slice(0, 200));
    } catch (err) {
      if (abort.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      if (generateAbortRef.current === abort) generateAbortRef.current = null;
      setLoading(false);
      setVarying(false);
      setPendingPrompt("");
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
  const showEmpty = !activeThreadId && !loading && !varying;

  const renderHistory = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={startNewChat}
          className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-[14px] font-medium text-[#0d0d0d] hover:bg-black/[0.06]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-black/15">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </span>
          New chat
        </button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {threads.length === 0 ? (
          <p className="px-2.5 py-2 text-[13px] text-[#8e8e8e]">No chats yet</p>
        ) : (
          threads.map((thread) => {
            const selected = thread.threadId === activeThreadId;
            return (
              <div key={thread.threadId} className="group relative">
                <button
                  type="button"
                  onClick={() => openChat(thread)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] leading-snug ${
                    selected ? "bg-black/[0.08]" : "hover:bg-black/[0.05]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={designAssetUrl(thread.latest.resultImageUrl)}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-[#0d0d0d]">{thread.title}</span>
                </button>
                <button
                  type="button"
                  title="More"
                  onClick={() => setMenuId(menuId === thread.threadId ? null : thread.threadId)}
                  className="absolute right-1 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#6b6b6b] hover:bg-black/10 group-hover:flex"
                >
                  ⋯
                </button>
                {menuId === thread.threadId ? (
                  <div className="absolute right-1 top-9 z-10 w-40 overflow-hidden rounded-xl border border-black/10 bg-white py-1 text-sm shadow-lg">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-[#0d0d0d] hover:bg-black/[0.04]"
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

  const composer = (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
      {sources.length ? (
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-1">
          {sources.map((item) => (
            <div key={item.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeSource(item.id)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="rounded-[28px] border border-black/10 bg-[#f4f4f4] px-2.5 py-2 shadow-[0_0_0_1px_rgba(0,0,0,0.02)] focus-within:bg-white focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]">
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
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            title="Attach photo"
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0d0d0d] hover:bg-black/[0.06]"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) void generate();
              }
            }}
            placeholder={showEmpty ? "Ask anything" : defaultPrompts[mode]}
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-6 text-[#0d0d0d] outline-none placeholder:text-[#8e8e8e] sm:text-[15px]"
          />
          <button
            type="button"
            title={listening ? "Stop voice" : "Voice"}
            onClick={listen}
            className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/[0.06] ${
              listening ? "bg-[#ffe8e0] text-[#c2410c]" : "text-[#0d0d0d]"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0m5 8v3m-4 0h8" />
            </svg>
          </button>
          <button
            type="button"
            title="Send"
            disabled={!canSend}
            onClick={() => void generate()}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white disabled:bg-[#d9d9d9] disabled:text-[#8e8e8e]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#8e8e8e]">
        AI can make mistakes. Check important details.
      </p>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-black/[0.06] bg-[#f9f9f9] lg:flex">
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
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,280px)] flex-col bg-[#f9f9f9] shadow-2xl">
            <div className="flex items-center justify-between px-3 pt-3">
              <p className="text-sm font-medium text-[#0d0d0d]">Chats</p>
              <button
                type="button"
                className="rounded-lg px-2.5 py-1.5 text-sm text-[#6b6b6b]"
                onClick={() => setHistoryOpen(false)}
              >
                Close
              </button>
            </div>
            {renderHistory()}
          </aside>
        </div>
      ) : null}

      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <div className="flex shrink-0 items-center gap-2 px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/[0.05]"
            aria-label="Open chats"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-[#0d0d0d]">
            {activeThread?.title || "ChatGPT"}
          </p>
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/[0.05]"
            aria-label="New chat"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div ref={listRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <div className="mx-auto mt-4 max-w-3xl px-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            </div>
          ) : null}

          {showEmpty ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-4 pb-28">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                <IconSparkle className="h-5 w-5" />
              </div>
              <h1 className="text-center text-[28px] font-semibold tracking-tight text-[#0d0d0d] sm:text-[32px]">
                What can I help with?
              </h1>
              <p className="mt-2 max-w-md text-center text-sm text-[#8e8e8e]">
                Attach a room photo and describe the change you want.
              </p>
              <div className="mt-10 w-full">{composer}</div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 pb-4 sm:px-5">
              {turns.map((turn, index) => {
                const gallery = turn.results;
                const lastResult = gallery[gallery.length - 1];
                return (
                  <div key={`${turn.prompt}-${index}`} className="space-y-5">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-[22px] bg-[#f4f4f4] px-4 py-3 sm:max-w-[75%]">
                        {turn.sources.slice(0, 1).map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() =>
                              setPreview({ urls: turn.sources.map(designAssetUrl), index: 0 })
                            }
                            className="mb-2 block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={designAssetUrl(url)}
                              alt=""
                              className="h-28 w-40 rounded-xl object-cover"
                            />
                          </button>
                        ))}
                        <p className="whitespace-pre-wrap text-[15px] leading-6 text-[#0d0d0d]">
                          {turn.prompt || "Make this space look better."}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                        <IconSparkle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {gallery.length === 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                urls: [designAssetUrl(gallery[0].resultImageUrl)],
                                index: 0,
                              })
                            }
                            className="block w-full overflow-hidden rounded-2xl"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={designAssetUrl(gallery[0].resultImageUrl)}
                              alt="Generated concept"
                              className="max-h-[480px] w-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                                className="overflow-hidden rounded-xl"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={designAssetUrl(item.resultImageUrl)}
                                  alt=""
                                  className="aspect-[4/3] w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}

                        <DesignResultDescription
                          text={lastResult.analysis}
                          fallback={`Here is a ${isDesign ? "design" : "elevation"} based on your photo${
                            turn.prompt ? `: ${turn.prompt}` : "."
                          }`}
                        />

                        {index === turns.length - 1 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-0.5 text-[#6b6b6b]">
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() =>
                                void generate({ prompt: lastResult.userPrompt || undefined })
                              }
                              className="rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-black/[0.05]"
                            >
                              Regenerate
                            </button>
                            <button
                              type="button"
                              disabled={downloading}
                              onClick={() => void downloadResult(lastResult)}
                              className="rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-black/[0.05]"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={editPrompt}
                              className="rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-black/[0.05]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={varying || loading}
                              onClick={() => void makeVariations()}
                              className="rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-black/[0.05]"
                            >
                              {varying ? "Making variations…" : "Make variations"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading || varying ? (
                <div className="space-y-5">
                  {(() => {
                    const pendingText =
                      pendingPrompt || prompt || "Make this space look better.";
                    const lastTurnPrompt = turns[turns.length - 1]?.prompt || "";
                    const showPendingUser =
                      !turns.length || lastTurnPrompt.trim() !== pendingText.trim();
                    if (!showPendingUser) return null;
                    return (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-[22px] bg-[#f4f4f4] px-4 py-3 sm:max-w-[75%]">
                          {sources.slice(0, 1).map((item) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={item.id}
                              src={item.url}
                              alt=""
                              className="mb-2 h-28 w-40 rounded-xl object-cover"
                            />
                          ))}
                          <p className="whitespace-pre-wrap text-[15px] leading-6 text-[#0d0d0d]">
                            {pendingText}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                      <IconSparkle className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-4 pt-0.5">
                      <TypewriterText
                        text={buildGeneratingIntro(
                          mode,
                          pendingPrompt || prompt || latest?.userPrompt || ""
                        )}
                      />
                      <DesignGeneratingLoader key={varying ? "vary" : "gen"} mode={mode} />
                      <p className="text-[13px] text-[#8e8e8e]">
                        After the image is ready, I&apos;ll explain what changed and the key features.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!showEmpty ? (
          <div className="shrink-0 bg-gradient-to-t from-white via-white to-white/80 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            {composer}
          </div>
        ) : null}
      </section>

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
