"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
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
  designing: "e.g. warm walnut, cream walls, hidden lighting, keep the window",
  elevation: "e.g. stone and white plaster, large windows, evening light",
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
      .then((items) => setHistory(items.filter((item) => item.mode === mode).slice(0, 8)))
      .catch(() => setHistory([]));
  }, [mode, result?.id]);

  const addFiles = (fileList?: FileList | File[] | null) => {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
            {isDesign ? "Interior" : "Architecture"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white md:text-3xl">
            {isDesign ? "Designing" : "Elevation"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Upload a photo, write what to change, generate a concept.
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
          <Link
            href="/design/designing"
            className={`rounded-md px-3 py-1.5 text-sm ${
              isDesign ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            Designing
          </Link>
          <Link
            href="/design/elevation"
            className={`rounded-md px-3 py-1.5 text-sm ${
              !isDesign ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            Elevation
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
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

          <div>
            <p className="mb-2 text-sm font-medium text-gray-800 dark:text-white">
              Photos <span className="font-normal text-gray-400">({sources.length}/{MAX_IMAGES})</span>
            </p>
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
                className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-3 py-10 text-center text-sm ${
                  dragOver
                    ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-white/5"
                    : "border-gray-300 text-gray-500 hover:border-gray-400 dark:border-gray-700"
                }`}
              >
                Drop photo or click to upload
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {sources.map((item) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSource(item.id)}
                      className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs text-white group-hover:flex"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {sources.length < MAX_IMAGES ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-300 text-xl text-gray-400 dark:border-gray-700"
                  >
                    +
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-800 dark:text-white">What should change?</p>
            <textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={defaultPrompts[mode]}
              className="w-full resize-none rounded-xl border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => void generate()}
            disabled={!sources.length || loading}
            className="h-11 w-full rounded-xl bg-gray-900 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-gray-900"
          >
            {loading ? "Generating…" : isDesign ? "Generate design" : "Generate elevation"}
          </button>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-800 dark:text-white">Preview</p>
            {resultUrl ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={loading}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-200"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => void downloadResult()}
                  disabled={downloading}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white dark:bg-white dark:text-gray-900"
                >
                  {downloading ? "Downloading…" : "Download"}
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex min-h-[420px] items-center justify-center bg-gray-50 p-4 dark:bg-black/30">
            {loading ? (
              <DesignGeneratingLoader mode={mode} />
            ) : resultUrl ? (
              <div className="w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="Generated concept" className="mx-auto max-h-[560px] w-full object-contain" />
                {result?.userPrompt ? (
                  <p className="mt-3 text-center text-xs text-gray-500">{result.userPrompt}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-400">The generated image will show here</p>
            )}
          </div>
        </section>
      </div>

      {history.length > 0 ? (
        <div>
          <p className="mb-3 text-sm font-medium text-gray-800 dark:text-white">Recent</p>
          <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setResult(item)}
                className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={designAssetUrl(item.resultImageUrl)} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
