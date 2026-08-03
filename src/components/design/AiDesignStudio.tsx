"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";

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
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image);
    };
  }, [image]);

  const setFile = (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (image) URL.revokeObjectURL(image);
    setImage(URL.createObjectURL(file));
    setFileName(file.name);
    setDone(false);
  };

  const defaultPrompt = isDesign
    ? `Design this ${scope.toLowerCase()} in a ${style.toLowerCase()} style with warm lighting and premium finishes.`
    : `Create a ${scope.toLowerCase()} in ${style.toLowerCase()} style with stone, wood panels, glass, and soft facade lighting.`;

  const generate = () => {
    if (!image || loading) return;
    if (!prompt.trim()) setPrompt(defaultPrompt);
    setLoading(true);
    setDone(false);
    window.setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1400);
  };

  const scopes = isDesign ? designScopes : elevationScopes;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
          {isDesign ? "AI Interior" : "AI Elevation"}
        </p>
        <h2 className="font-outfit mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {isDesign ? "Design from one photo" : "Elevation from one photo"}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          {isDesign
            ? "Upload a room photo, pick a style, describe what you want — get a concept in seconds."
            : "Upload a building photo, choose the view, describe the facade — generate a clean elevation concept."}
        </p>
      </div>

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

            {!image ? (
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
                    src={image}
                    alt="Uploaded"
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
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1]"
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
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1]"
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
              onClick={generate}
              disabled={!image || loading}
            >
              {loading
                ? "Generating…"
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
                {done
                  ? `${style} · ${scope}`
                  : loading
                    ? "Creating your concept…"
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
                    Reading your photo and applying {style.toLowerCase()}…
                  </p>
                </div>
              ) : done && image ? (
                <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700">
                  <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt="Concept preview"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </div>
                  <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                      {style} concept ready
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {prompt.trim() || defaultPrompt}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={generate}
                        disabled={loading}
                      >
                        Regenerate
                      </Button>
                      <Button size="sm" variant="outline">
                        Download
                      </Button>
                      <Button size="sm">Save</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl text-brand-700 shadow-sm ring-1 ring-gray-100 dark:bg-white/[0.06] dark:ring-gray-700">
                    ✦
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    Your design will appear here
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    One photo · one brief · one generate
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
