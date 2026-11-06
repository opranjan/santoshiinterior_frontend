"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { designApi, type DesignGenerationDto } from "@/services/crmApi";
import { designAssetUrl } from "@/lib/designAssets";
import DesignGeneratingLoader from "@/components/design/DesignGeneratingLoader";
import DesignPaintMarkup from "@/components/design/DesignPaintMarkup";
import DesignResultDescription, {
  splitChatGptReply,
} from "@/components/design/DesignResultDescription";
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
  const brief =
    userPrompt.trim() ||
    (mode === "elevation" ? "redesign this elevation" : "redesign this room");
  if (mode === "elevation") {
    return `Got it — I'll edit your building photo for: “${brief}”. I'll keep the same structure and camera angle, apply those changes, then explain what I did.`;
  }
  return `Got it — I'll edit your room photo for: “${brief}”. I'll keep the same layout and camera angle, apply those changes, then explain what I did — just like in ChatGPT.`;
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
    <p className="whitespace-pre-wrap text-[16px] leading-[1.75] text-[#0d0d0d]">
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
  // One generation = one ChatGPT reply (never merge into a multi-image grid).
  return messages.map((item) => {
    const sources = (
      item.sourceImageUrls?.length ? item.sourceImageUrls : [item.sourceImageUrl]
    ).filter(Boolean) as string[];
    return {
      prompt: item.userPrompt || "",
      sources,
      results: [item],
    };
  });
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

function filesFromClipboardData(data: DataTransfer | null): File[] {
  if (!data) return [];

  const fromFiles = data.files
    ? Array.from(data.files).filter((file) => file.type.startsWith("image/"))
    : [];

  /** Multi-file paste from Explorer — keep distinct files only. */
  if (fromFiles.length > 1) {
    const seen = new Set<string>();
    return fromFiles.filter((file) => {
      const key = `${file.name}|${file.size}|${file.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (fromFiles.length === 1) return fromFiles;

  /**
   * Screenshot / single Ctrl+V image: Chrome/Edge often expose the same
   * bitmap as image/png AND image/jpeg — take one (prefer png).
   */
  const items = data.items ? Array.from(data.items) : [];
  const preferred =
    items.find((item) => item.kind === "file" && item.type === "image/png") ||
    items.find((item) => item.kind === "file" && item.type === "image/webp") ||
    items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
  const file = preferred?.getAsFile();
  if (!file) return [];
  return [
    file.name
      ? file
      : new File([file], `pasted-${Date.now()}.png`, {
          type: file.type || "image/png",
        }),
  ];
}

async function copyImageUrlToClipboard(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not copy image");
  const blob = await res.blob();
  const type = blob.type.startsWith("image/") ? blob.type : "image/png";
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Copy image is not supported in this browser");
  }
  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
}

function hasTextSelection() {
  const sel = window.getSelection?.()?.toString() || "";
  if (sel.trim()) return true;
  const el = document.activeElement;
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement
  ) {
    return el.selectionStart !== el.selectionEnd;
  }
  return false;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
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
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [paintImageUrl, setPaintImageUrl] = useState<string | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const composerWrapRef = useRef<HTMLDivElement>(null);

  promptRef.current = prompt;

  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
      generateAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setIsCoarsePointer(Boolean(mq.matches));
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  /** Keep composer above the on-screen keyboard on phones/tablets. */
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 48 ? inset : 0);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
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
    if (!keyboardInset) return;
    const id = window.setTimeout(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 80);
    return () => window.clearTimeout(id);
  }, [keyboardInset, loading, varying, turns.length]);

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

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (paintImageUrl || loading || varying) return;
      const images = filesFromClipboardData(event.clipboardData);
      if (!images.length) return;
      /**
       * Don't steal text paste from unrelated inputs (header search, etc.).
       * Image paste into the studio composer (or page background) attaches photos.
       * Single window listener only — do not also handle on the textarea (that
       * duplicated every paste).
       */
      if (
        isEditableTarget(event.target) &&
        event.target !== inputRef.current
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      addFiles(images);
      inputRef.current?.focus();
    };

    const onCopyKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || event.altKey) return;
      if (event.key.toLowerCase() !== "c") return;
      if (paintImageUrl) return;
      /** Selected text → native copy. No selection → copy current/latest image. */
      if (hasTextSelection()) return;

      const imageUrl =
        preview?.urls?.[preview.index] ||
        (latest?.resultImageUrl ? designAssetUrl(latest.resultImageUrl) : null) ||
        sources[sources.length - 1]?.url ||
        null;
      if (!imageUrl) return;

      event.preventDefault();
      void copyImageUrlToClipboard(imageUrl)
        .then(() => setError(""))
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Could not copy image")
        );
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onCopyKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onCopyKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paintImageUrl,
    loading,
    varying,
    preview,
    latest?.resultImageUrl,
    sources,
  ]);

  const useMarkedImage = (file: File) => {
    setSources((prev) => {
      prev.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });
      return [
        {
          id: `marked-${Date.now()}`,
          file,
          url: URL.createObjectURL(file),
        },
      ];
    });
    setPaintImageUrl(null);
    setError("");
    setPrompt((prev) => {
      const text = prev.trim();
      if (text) return text;
      return "Change only the areas I marked on the image.";
    });
    window.setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
      }
    }, 80);
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

    /** Follow-up in a chat: edit the last result, keep original room as extra context. */
    if (latest?.resultImageUrl) {
      const fromResult = await filesFromUrls([latest.resultImageUrl]);
      if (fromResult.length) {
        const first = threadMessages[0];
        const originalUrl =
          first?.sourceImageUrls?.[0] || first?.sourceImageUrl || null;
        if (
          originalUrl &&
          originalUrl !== latest.resultImageUrl &&
          fromResult.length < MAX_IMAGES
        ) {
          const originals = await filesFromUrls([originalUrl]);
          return [...fromResult, ...originals].slice(0, 2);
        }
        return fromResult;
      }
    }

    const urls = latest?.sourceImageUrls?.length
      ? latest.sourceImageUrls
      : latest?.sourceImageUrl
        ? [latest.sourceImageUrl]
        : [];
    return filesFromUrls(urls);
  };

  const recoverGenerationFromHistory = async (opts: {
    beforeIds: Set<string>;
    startedAt: number;
    threadId: string | null;
    promptText: string;
    signal: AbortSignal;
  }): Promise<DesignGenerationDto | null> => {
    const deadline = Date.now() + 90_000;
    const promptKey = opts.promptText.trim().toLowerCase();
    while (Date.now() < deadline) {
      if (opts.signal.aborted) return null;
      try {
        const items = await designApi.history();
        const rows = items.filter((item) => item.mode === mode);
        const match = rows.find((row) => {
          if (opts.beforeIds.has(row.id)) return false;
          const created = new Date(row.createdAt).getTime();
          if (Number.isFinite(created) && created + 5000 < opts.startedAt) return false;
          if (opts.threadId && row.threadId && row.threadId !== opts.threadId) return false;
          if (promptKey && row.userPrompt?.trim().toLowerCase() !== promptKey) return false;
          return Boolean(row.resultImageUrl);
        });
        if (match) {
          setHistory(rows);
          return match;
        }
      } catch {
        /* keep polling */
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    return null;
  };

  const generate = async (override?: { prompt?: string; files?: File[]; asVariations?: boolean }) => {
    if (loading || varying) return;
    const text = (override?.prompt ?? prompt).trim();
    const images = override?.files ?? (await resolveFiles());
    if (!images.length) {
      setError("Upload a photo first, then describe what you want to change.");
      return;
    }
    generateAbortRef.current?.abort();
    const abort = new AbortController();
    generateAbortRef.current = abort;
    const beforeIds = new Set(history.map((row) => row.id));
    const startedAt = Date.now();
    const threadAtStart = activeThreadId;
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
      // Always one image per request (OpenAI n=1) — never batch into a 2-up grid.
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
      /** Caption is written async on the server — soft-refresh once it lands. */
      window.setTimeout(() => {
        if (generateAbortRef.current && generateAbortRef.current !== abort) return;
        void loadHistory(false);
      }, 8000);
    } catch (err) {
      if (abort.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Generation failed";
      const maybeSaved =
        /failed to fetch|network error|timed out|checking history/i.test(message);
      if (maybeSaved) {
        setError("Connection interrupted — looking up your generated image…");
        const recovered = await recoverGenerationFromHistory({
          beforeIds,
          startedAt,
          threadId: threadAtStart,
          promptText: text,
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        if (recovered) {
          setError("");
          setActiveThreadId(recovered.threadId || recovered.id);
          setHistory((prev) =>
            [recovered, ...prev.filter((row) => row.id !== recovered.id)].slice(0, 200)
          );
          return;
        }
        setError(
          "Connection was interrupted. Refresh the page — if generation finished, your image will be in history."
        );
        return;
      }
      setError(message);
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
    /** Close soft keyboard drawer focus after picking a chat on mobile. */
    window.setTimeout(() => inputRef.current?.blur(), 0);
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

  const hasImageContext = Boolean(
    sources.length || latest?.resultImageUrl || latest?.sourceImageUrl
  );
  const canSend = hasImageContext && !loading && !varying;
  const showEmpty = !activeThreadId && !loading && !varying;

  const submitFromComposer = () => {
    if (loading || varying) return;
    if (!hasImageContext) {
      setError(
        isCoarsePointer
          ? "Attach a photo first, then tap Send."
          : "Upload a photo first, then press Enter to generate."
      );
      return;
    }
    void generate();
  };

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
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuId(menuId === thread.threadId ? null : thread.threadId);
                  }}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#6b6b6b] hover:bg-black/10 md:h-7 md:w-7 md:opacity-0 md:group-hover:opacity-100"
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
    <div className="mx-auto w-full max-w-[48rem] px-3 sm:px-4">
      {sources.length ? (
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto overscroll-x-contain px-1 touch-pan-x">
          {sources.map((item) => (
            <div key={item.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/10 sm:h-16 sm:w-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeSource(item.id)}
                className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[12px] text-white sm:h-5 sm:w-5 sm:text-[11px]"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="rounded-[28px] border border-black/10 bg-[#f4f4f4] px-2 py-2 shadow-[0_0_0_1px_rgba(0,0,0,0.02)] focus-within:bg-white focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] sm:px-2.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,image/png,image/jpeg,image/webp,image/jpg"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex items-end gap-1 sm:gap-1.5">
          <button
            type="button"
            title="Attach photo"
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#0d0d0d] hover:bg-black/[0.06] active:bg-black/[0.08] sm:h-9 sm:w-9"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={prompt}
            enterKeyHint={isCoarsePointer ? "enter" : "send"}
            autoComplete="off"
            autoCorrect="on"
            spellCheck
            onChange={(e) => {
              setPrompt(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, isCoarsePointer ? 120 : 160)}px`;
            }}
            onFocus={() => {
              window.setTimeout(() => {
                inputRef.current?.scrollIntoView({
                  block: "nearest",
                  behavior: "smooth",
                });
                listRef.current?.scrollTo({
                  top: listRef.current.scrollHeight,
                  behavior: "smooth",
                });
              }, 250);
            }}
            onKeyDown={(e) => {
              const isEnter =
                e.key === "Enter" || e.code === "Enter" || e.keyCode === 13;
              if (!isEnter || e.nativeEvent.isComposing) return;
              /**
               * Phone/tablet soft keyboards: Enter = new line, Send button submits.
               * Desktop/laptop: Enter sends, Shift+Enter = new line.
               */
              if (isCoarsePointer || e.shiftKey) return;
              e.preventDefault();
              e.stopPropagation();
              submitFromComposer();
            }}
            placeholder={showEmpty ? "Ask anything" : defaultPrompts[mode]}
            className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-6 text-[#0d0d0d] outline-none placeholder:text-[#8e8e8e] sm:max-h-40 sm:min-h-[40px] sm:text-[15px]"
          />
          <button
            type="button"
            title={listening ? "Stop voice" : "Voice"}
            onClick={listen}
            className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/[0.06] active:bg-black/[0.08] sm:h-9 sm:w-9 ${
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
            onClick={() => submitFromComposer()}
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white active:opacity-90 disabled:bg-[#d9d9d9] disabled:text-[#8e8e8e] sm:h-9 sm:w-9"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-2 hidden text-center text-[11px] text-[#8e8e8e] sm:block">
        AI can make mistakes. Check important details.
      </p>
      <p className="mt-1.5 text-center text-[11px] text-[#8e8e8e] sm:hidden">
        {isCoarsePointer
          ? "Tap Send to generate. Attach a photo to start or continue this chat."
          : "AI can make mistakes. Check important details."}
      </p>
    </div>
  );

  return (
    <div className="design-studio-shell flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-black/[0.06] bg-[#f9f9f9] md:flex lg:w-[260px]">
        {renderHistory()}
      </aside>

      {historyOpen ? (
        <div className="fixed inset-0 z-[90] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close chats"
            onClick={() => setHistoryOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col bg-[#f9f9f9] pt-[env(safe-area-inset-top)] shadow-2xl">
            <div className="flex items-center justify-between px-3 pt-3">
              <p className="text-sm font-medium text-[#0d0d0d]">Chats</p>
              <button
                type="button"
                className="min-h-10 rounded-lg px-3 py-2 text-sm text-[#6b6b6b]"
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
        <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.04] px-2 py-1.5 md:hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-black/[0.05] active:bg-black/[0.08]"
            aria-label="Open chats"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-[#0d0d0d]">
            {activeThread?.title || (isDesign ? "Designing" : "Elevation")}
          </p>
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-black/[0.05] active:bg-black/[0.08]"
            aria-label="New chat"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div
          ref={listRef}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        >
          {error ? (
            <div className="mx-auto mt-4 max-w-[48rem] px-3 sm:px-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            </div>
          ) : null}

          {showEmpty ? (
            <div
              className="flex h-full min-h-[min(420px,70dvh)] flex-col items-center justify-center px-3 pt-6 sm:px-4 sm:pb-28"
              style={{
                paddingBottom: `max(2rem, calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset + 16}px))`,
              }}
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#0d0d0d] text-white sm:mb-6 sm:h-12 sm:w-12">
                <IconSparkle className="h-5 w-5" />
              </div>
              <h1 className="text-center text-[24px] font-semibold tracking-tight text-[#0d0d0d] sm:text-[32px]">
                What can I help with?
              </h1>
              <p className="mt-2 max-w-md px-2 text-center text-sm text-[#8e8e8e]">
                Attach a room photo and describe the change you want.
              </p>
              <div className="mt-8 w-full sm:mt-10">{composer}</div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[48rem] space-y-6 px-3 py-4 pb-6 sm:space-y-8 sm:px-6 sm:py-6">
              {turns.map((turn, index) => {
                const lastResult = turn.results[turn.results.length - 1];
                const reply = splitChatGptReply(lastResult.analysis);
                const fallbackLead = turn.prompt
                  ? `Here's the updated ${isDesign ? "design" : "elevation"} for “${turn.prompt}”.`
                  : `Here's the updated ${isDesign ? "design" : "elevation"} from your photo.`;
                const lead = reply.lead || (reply.body ? "" : fallbackLead);
                const body = reply.body || (!reply.lead ? lastResult.analysis : "");
                return (
                  <div key={`${turn.prompt}-${index}`} className="space-y-6">
                    {/* User bubble — ChatGPT style */}
                    <div className="flex justify-end">
                      <div className="max-w-[min(100%,32rem)] rounded-[24px] bg-[#f4f4f4] px-4 py-3">
                        {turn.sources.length ? (
                          <div className="mb-2.5 flex flex-wrap gap-2">
                            {turn.sources.map((url, sourceIndex) => (
                              <button
                                key={`${url}-${sourceIndex}`}
                                type="button"
                                onClick={() =>
                                  setPreview({
                                    urls: turn.sources.map(designAssetUrl),
                                    index: sourceIndex,
                                  })
                                }
                                className="overflow-hidden rounded-2xl"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={designAssetUrl(url)}
                                  alt={`Reference ${sourceIndex + 1}`}
                                  className="h-[88px] w-[116px] object-cover sm:h-[112px] sm:w-[148px]"
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap text-[16px] leading-[1.7] text-[#0d0d0d]">
                          {turn.prompt || "Make this space look better."}
                        </p>
                      </div>
                    </div>

                    {/* Assistant reply — ChatGPT image + explanation pattern */}
                    <div className="flex gap-3 sm:gap-4">
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                        <IconSparkle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-3">
                        {lead ? (
                          <p className="max-w-[46rem] text-[16px] leading-[1.75] text-[#0d0d0d]">
                            {lead}
                          </p>
                        ) : null}

                        <div className="group relative max-w-[min(100%,32rem)] overflow-hidden rounded-2xl border border-black/[0.06] bg-[#f7f7f8] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                urls: [designAssetUrl(lastResult.resultImageUrl)],
                                index: 0,
                              })
                            }
                            className="block w-full text-left"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={designAssetUrl(lastResult.resultImageUrl)}
                              alt="Generated concept"
                              className="h-auto max-h-[min(55dvh,36rem)] w-full object-contain sm:max-h-[min(70vh,36rem)]"
                            />
                          </button>
                          {index === turns.length - 1 && !loading && !varying ? (
                            <button
                              type="button"
                              title="Mark area to change"
                              onClick={() =>
                                setPaintImageUrl(
                                  designAssetUrl(lastResult.resultImageUrl)
                                )
                              }
                              className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#0d0d0d]/92 px-3 text-[13px] font-medium text-white shadow-lg backdrop-blur-sm hover:bg-black sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9.5 15.5L4 21m9.5-9.5l2.5-2.5a3.5 3.5 0 10-5-5L8.5 7.5"
                                />
                              </svg>
                              Mark
                            </button>
                          ) : null}
                        </div>

                        {body ? (
                          <DesignResultDescription text={body} className="!mt-1" />
                        ) : !lead ? (
                          <DesignResultDescription
                            text={null}
                            fallback={fallbackLead}
                            className="!mt-1"
                          />
                        ) : null}

                        {index === turns.length - 1 ? (
                          <div className="flex flex-wrap items-center gap-0.5 pt-1 text-[#5d5d5d] sm:gap-1">
                            <button
                              type="button"
                              title="Copy explanation"
                              disabled={!lastResult.analysis}
                              onClick={() => {
                                void navigator.clipboard?.writeText(
                                  String(lastResult.analysis || lead || fallbackLead)
                                );
                              }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-black/[0.05] active:bg-black/[0.08] sm:h-8 sm:w-8"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="9" y="9" width="11" height="11" rx="2" />
                                <path d="M5 15V5a2 2 0 012-2h10" strokeLinecap="round" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Regenerate"
                              disabled={loading}
                              onClick={() =>
                                void generate({ prompt: lastResult.userPrompt || undefined })
                              }
                              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] hover:bg-black/[0.05] active:bg-black/[0.08] sm:h-8"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" d="M4 12a8 8 0 0113.66-5.66M20 12a8 8 0 01-13.66 5.66" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5v5h5M20 19v-5h-5" />
                              </svg>
                              Regenerate
                            </button>
                            <button
                              type="button"
                              title="Download"
                              disabled={downloading}
                              onClick={() => void downloadResult(lastResult)}
                              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] hover:bg-black/[0.05] active:bg-black/[0.08] sm:h-8"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              title="Mark area to change"
                              disabled={loading || varying}
                              onClick={() =>
                                setPaintImageUrl(
                                  designAssetUrl(lastResult.resultImageUrl)
                                )
                              }
                              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] hover:bg-black/[0.05] active:bg-black/[0.08] sm:h-8"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9.5 15.5L4 21m9.5-9.5l2.5-2.5a3.5 3.5 0 10-5-5L8.5 7.5"
                                />
                              </svg>
                              Mark
                            </button>
                            <button
                              type="button"
                              title="Edit prompt"
                              onClick={editPrompt}
                              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] hover:bg-black/[0.05] active:bg-black/[0.08] sm:h-8"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              title="Make variations"
                              disabled={varying || loading}
                              onClick={() => void makeVariations()}
                              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] hover:bg-black/[0.05] active:bg-black/[0.08] sm:h-8"
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
                        <div className="max-w-[min(100%,32rem)] rounded-[24px] bg-[#f4f4f4] px-4 py-3">
                          {sources.length ? (
                            <div className="mb-2.5 flex flex-wrap gap-2">
                              {sources.map((item) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={item.id}
                                  src={item.url}
                                  alt=""
                                  className="h-[112px] w-[148px] rounded-2xl object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                          <p className="whitespace-pre-wrap text-[16px] leading-[1.7] text-[#0d0d0d]">
                            {pendingText}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex gap-3 sm:gap-4">
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                      <IconSparkle className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-3 pt-0.5">
                      <TypewriterText
                        text={buildGeneratingIntro(
                          mode,
                          pendingPrompt || prompt || latest?.userPrompt || ""
                        )}
                      />
                      <DesignGeneratingLoader key={varying ? "vary" : "gen"} mode={mode} />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!showEmpty ? (
          <div
            ref={composerWrapRef}
            className="shrink-0 border-t border-black/[0.04] bg-gradient-to-t from-white via-white to-white/90 pt-2"
            style={{
              paddingBottom: `max(${keyboardInset ? 0.5 : 0.75}rem, calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px))`,
            }}
          >
            {composer}
          </div>
        ) : null}
      </section>

      {paintImageUrl ? (
        <DesignPaintMarkup
          imageUrl={paintImageUrl}
          onCancel={() => setPaintImageUrl(null)}
          onDone={useMarkedImage}
        />
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4"
          onClick={() => setPreview(null)}
        >
          <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex items-center gap-2 sm:right-4">
            <button
              type="button"
              className="min-h-10 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#0d0d0d] hover:bg-white/90"
              onClick={(event) => {
                event.stopPropagation();
                const url = preview.urls[preview.index];
                if (!url) return;
                setPreview(null);
                setPaintImageUrl(url);
              }}
            >
              Mark
            </button>
            <button
              type="button"
              className="min-h-10 rounded-full bg-white/15 px-4 py-2 text-sm text-white hover:bg-white/25"
              onClick={() => setPreview(null)}
            >
              Close
            </button>
          </div>
          {preview.urls.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25 sm:left-3"
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
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25 sm:right-3"
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
            className="max-h-[min(82dvh,82vh)] max-w-[96vw] rounded-xl object-contain sm:max-h-[90vh] sm:max-w-[92vw]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
