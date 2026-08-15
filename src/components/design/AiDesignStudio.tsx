"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";
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
  designing:
    "Describe the interior style, colors, materials, and layout changes you want.",
  elevation:
    "Describe the facade materials, architectural style, and lighting you want.",
};

export default function AiDesignStudio({ mode }: Props) {
  const isDesign = mode === "designing";
  const fileRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [sources, setSources] = useState<SourcePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DesignGenerationDto | null>(null);
  const [history, setHistory] = useState<DesignGenerationDto[]>([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    return () => {
      sources.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });
    };
  }, [sources]);

  useEffect(() => {
    void designApi
      .history()
      .then((items) =>
        setHistory(items.filter((item) => item.mode === mode).slice(0, 6))
      )
      .catch(() => setHistory([]));
  }, [mode, result?.id]);

  const addFiles = (fileList?: FileList | File[] | null) => {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!incoming.length) return;

    setSources((prev) => {
      const remaining = MAX_IMAGES - prev.length;
      if (remaining <= 0) return prev;
      const next = incoming.slice(0, remaining).map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
      }));
      return [...prev, ...next];
    });
    setResult(null);
    setError("");
  };

  const removeSource = (id: string) => {
    setSources((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
    setResult(null);
  };

  const clearSources = () => {
    sources.forEach((item) => {
      if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
    });
    setSources([]);
    setResult(null);
    setError("");
  };

  const generate = async () => {
    if (!sources.length || loading) return;
    try {
      setLoading(true);
      setError("");
      const data = await designApi.generate({
        mode,
        prompt: prompt.trim() || undefined,
        images: sources.map((item) => item.file),
      });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const resultUrl = result ? designAssetUrl(result.resultImageUrl) : null;

  const downloadResult = async () => {
    if (!result?.id || downloading) return;
    try {
      setDownloading(true);
      setError("");
      await designApi.download(result.id, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const formatHistoryLabel = (item: DesignGenerationDto) => {
    if (item.userPrompt?.trim()) {
      return item.userPrompt.trim().slice(0, 40);
    }
    return new Date(item.createdAt).toLocaleDateString();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
          {isDesign ? "AI Interior · ChatGPT" : "AI Elevation · ChatGPT"}
        </p>
        <h2 className="font-outfit mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {isDesign ? "Design from your photos" : "Elevation from your photos"}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          Upload up to {MAX_IMAGES} reference photos and describe the changes you
          want. The AI edits your photos directly — same approach as ChatGPT image
          editing.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-7 lg:border-b-0 lg:border-r">
            <label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/90">
              {isDesign ? "Room photos" : "Building photos"}{" "}
              <span className="font-normal text-gray-400">
                ({sources.length}/{MAX_IMAGES})
              </span>
            </label>
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

            {sources.length === 0 ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-12 text-center transition ${
                  dragOver
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200 hover:border-brand-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]"
                }`}
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 text-lg text-white">
                  +
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Click or drop photos
                </span>
                <span className="mt-1 text-xs text-gray-400">
                  JPG, PNG, or WebP · up to {MAX_IMAGES} images · 10 MB each
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sources.map((item) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <div className="aspect-square bg-gray-100 dark:bg-gray-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSource(item.id)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100"
                      >
                        Remove
                      </button>
                      <p className="truncate px-2 py-1 text-[10px] text-gray-500">
                        {item.file.name}
                      </p>
                    </div>
                  ))}

                  {sources.length < MAX_IMAGES ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-700"
                    >
                      <span className="text-xl">+</span>
                      <span className="mt-1 text-[10px]">Add more</span>
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {sources.length < MAX_IMAGES ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Add more photos
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearSources}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            <label className="mb-2 mt-6 block text-sm font-medium text-gray-800 dark:text-white/90">
              Your prompt
            </label>
            <textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={defaultPrompts[mode]}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Describe what you want — style, colors, materials, layout, or mood.
              Leave blank for a general photorealistic concept from your photos.
            </p>

            <Button
              size="sm"
              className="mt-4 w-full"
              onClick={() => void generate()}
              disabled={!sources.length || loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  Creating image
                  <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="design-typing-dot h-1 w-1 rounded-full bg-current"
                        style={{ animationDelay: `${i * 0.18}s` }}
                      />
                    ))}
                  </span>
                </span>
              ) : isDesign ? (
                "Generate Design"
              ) : (
                "Generate Elevation"
              )}
            </Button>
          </div>

          <div
            className="relative flex min-h-[420px] flex-col justify-between p-5 sm:p-7"
            style={{
              background:
                "radial-gradient(800px 360px at 100% 0%, rgba(47,74,71,0.12), transparent 55%), linear-gradient(165deg, #f6f9f8 0%, #ffffff 55%)",
            }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                Result
              </p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {result
                  ? isDesign
                    ? "Interior concept"
                    : "Elevation concept"
                  : loading
                    ? "Creating your image…"
                    : "Ready when you are"}
              </h3>
            </div>

            <div className="my-6 flex flex-1 items-center justify-center">
              {loading ? (
                <DesignGeneratingLoader mode={mode} />
              ) : resultUrl ? (
                <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700">
                  <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resultUrl}
                      alt="Generated concept"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </div>
                  <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                      Concept saved to design library
                    </p>
                    {result?.userPrompt ? (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        Prompt: {result.userPrompt}
                      </p>
                    ) : null}
                    {result?.analysis ? (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        AI read: {result.analysis}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void generate()}
                        disabled={loading}
                      >
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadResult()}
                        disabled={downloading}
                      >
                        {downloading ? "Downloading…" : "Download"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl text-brand-700 shadow-sm ring-1 ring-gray-100 dark:bg-white/[0.06] dark:ring-gray-700">
                    ✦
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    Your AI concept will appear here
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Reference photos → vision analysis → image generation
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {history.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
            Recent {isDesign ? "designs" : "elevations"}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setResult(item)}
                className="overflow-hidden rounded-xl border border-gray-100 text-left transition hover:border-brand-300 dark:border-gray-800"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={designAssetUrl(item.resultImageUrl)}
                    alt={formatHistoryLabel(item)}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="truncate px-2 py-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                  {formatHistoryLabel(item)}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
