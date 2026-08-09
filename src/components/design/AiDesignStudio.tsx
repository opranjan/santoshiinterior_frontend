"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";
import { designApi, type DesignGenerationDto } from "@/services/crmApi";
import { designAssetUrl } from "@/lib/designAssets";

export type AiStudioMode = "designing" | "elevation";

type Props = {
  mode: AiStudioMode;
};

const styles = [
  "Modern Minimal",
  "Contemporary",
  "Luxury",
  "Japandi",
  "Indian Fusion",
];

const designScopes = ["Living Room", "Kitchen", "Bedroom", "Full Home"];
const elevationScopes = ["Front Elevation", "Side Elevation", "3D View"];

export default function AiDesignStudio({ mode }: Props) {
  const isDesign = mode === "designing";
  const fileRef = useRef<HTMLInputElement>(null);

  const [style, setStyle] = useState(styles[0]);
  const [scope, setScope] = useState(
    isDesign ? designScopes[0] : elevationScopes[0]
  );
  const [prompt, setPrompt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DesignGenerationDto | null>(null);
  const [history, setHistory] = useState<DesignGenerationDto[]>([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const scopes = isDesign ? designScopes : elevationScopes;

  const defaultPrompt = isDesign
    ? `Design this ${scope.toLowerCase()} in a ${style.toLowerCase()} style with warm lighting and premium finishes.`
    : `Create a ${scope.toLowerCase()} in ${style.toLowerCase()} style with stone, wood panels, glass, and soft facade lighting.`;

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    void designApi
      .history()
      .then((items) =>
        setHistory(items.filter((item) => item.mode === mode).slice(0, 6))
      )
      .catch(() => setHistory([]));
  }, [mode, result?.id]);

  const setFile = (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSourceFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setResult(null);
    setError("");
  };

  const generate = async () => {
    if (!sourceFile || loading) return;
    try {
      setLoading(true);
      setError("");
      const data = await designApi.generate({
        mode,
        style,
        scope,
        prompt: prompt.trim() || defaultPrompt,
        image: sourceFile,
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

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `${mode}-${result?.id || "concept"}.png`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
          {isDesign ? "AI Interior · ChatGPT" : "AI Elevation · ChatGPT"}
        </p>
        <h2 className="font-outfit mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {isDesign ? "Design from one photo" : "Elevation from one photo"}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          Upload a reference photo — GPT-4o analyzes it, DALL·E generates a
          photorealistic concept saved to your design library.
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
              {isDesign ? "Room photo" : "Building photo"}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {!previewUrl ? (
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
                  setFile(e.dataTransfer.files?.[0]);
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
                  Click or drop photo
                </span>
                <span className="mt-1 text-xs text-gray-400">
                  JPG or PNG · max 10 MB
                </span>
              </button>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Reference"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
                  <span className="truncate text-xs text-gray-600 dark:text-gray-400">
                    {fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            <label className="mb-2 mt-6 block text-sm font-medium text-gray-800 dark:text-white/90">
              Style
            </label>
            <div className="flex flex-wrap gap-2">
              {styles.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    style === s
                      ? "bg-brand-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="mb-2 mt-5 block text-sm font-medium text-gray-800 dark:text-white/90">
              {isDesign ? "Room" : "View"}
            </label>
            <div className="flex flex-wrap gap-2">
              {scopes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    scope === s
                      ? "bg-brand-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="mb-2 mt-5 block text-sm font-medium text-gray-800 dark:text-white/90">
              Your brief
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={defaultPrompt}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />

            <Button
              size="sm"
              className="mt-4 w-full"
              onClick={() => void generate()}
              disabled={!sourceFile || loading}
            >
              {loading
                ? "Generating with ChatGPT…"
                : isDesign
                  ? "Generate Design"
                  : "Generate Elevation"}
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
                  ? `${result.style} · ${result.scope}`
                  : loading
                    ? "Analyzing photo & generating…"
                    : "Ready when you are"}
              </h3>
            </div>

            <div className="my-6 flex flex-1 items-center justify-center">
              {loading ? (
                <div className="w-full max-w-xs text-center">
                  <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-2xl bg-brand-700/90" />
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-brand-600" />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Step 1: GPT-4o reads your photo · Step 2: DALL·E renders concept
                  </p>
                </div>
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
                    {result?.analysis ? (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        AI read: {result.analysis}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void generate()} disabled={loading}>
                        Regenerate
                      </Button>
                      <Button size="sm" variant="outline" onClick={downloadResult}>
                        Download
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
                    Reference photo → vision analysis → image generation
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
                    alt={item.scope}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="truncate px-2 py-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                  {item.style} · {item.scope}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
