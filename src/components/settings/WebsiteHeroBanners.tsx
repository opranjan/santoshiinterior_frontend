"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { designAssetUrl } from "@/lib/designAssets";
import { heroBannersApi, subscribersApi, type WebsiteHeroBannerDto, type WebsiteSubscriberDto } from "@/services/crmApi";

type BannerKind = WebsiteHeroBannerDto["kind"];

const emptyForm = {
  kind: "slide" as BannerKind,
  discountText: "",
  highlightText: "",
  title: "",
  description: "",
  tag: "gray",
  price: "",
  comparePrice: "",
  ctaLabel: "",
  ctaHref: "/catalogue/",
  isPublished: true,
};

function parseKind(value: string): BannerKind {
  if (
    value === "side" ||
    value === "promo-wide" ||
    value === "promo-left" ||
    value === "promo-right" ||
    value === "deal" ||
    value === "subscribe"
  ) {
    return value;
  }
  return "slide";
}

function isPromo(kind: BannerKind) {
  return kind.startsWith("promo");
}

function previewUrl(path?: string | null) {
  if (!path) return "";
  if (
    path.startsWith("http") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  if (path.startsWith("/images/")) {
    const site = (
      process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3001"
    ).replace(/\/$/, "");
    return `${site}${path}`;
  }
  return designAssetUrl(path);
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export default function WebsiteHeroBanners() {
  const [items, setItems] = useState<WebsiteHeroBannerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await heroBannersApi.list();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load banners");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = (kind: BannerKind) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      kind,
      tag: isPromo(kind) ? "gray" : kind === "deal" ? "2026-12-31" : "",
    });
    setPhotoFile(null);
    setPhotoPreview("");
    setShowForm(true);
    setError("");
  };

  const openEdit = (row: WebsiteHeroBannerDto) => {
    setEditingId(row.id);
    setForm({
      kind: row.kind,
      discountText: row.discountText || "",
      highlightText: row.highlightText || "",
      title: row.title,
      description: row.description || "",
      tag: row.tag || (isPromo(row.kind) ? "gray" : ""),
      price: row.price != null ? String(row.price) : "",
      comparePrice: row.comparePrice != null ? String(row.comparePrice) : "",
      ctaLabel: row.ctaLabel || "",
      ctaHref: row.ctaHref || "/catalogue/",
      isPublished: row.isPublished,
    });
    setPhotoFile(null);
    setPhotoPreview(row.imageUrl ? previewUrl(row.imageUrl) : "");
    setShowForm(true);
    setError("");
  };

  const saveForm = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const sameKind = items.filter((row) => row.kind === form.kind);
      const body = {
        kind: form.kind,
        discountText: form.discountText,
        highlightText: form.highlightText,
        title: form.title.trim(),
        description: form.description,
        tag: form.tag,
        price: form.price,
        comparePrice: form.comparePrice,
        ctaLabel: form.ctaLabel,
        ctaHref: form.ctaHref,
        isPublished: form.isPublished,
        sortOrder: editingId
          ? items.find((row) => row.id === editingId)?.sortOrder || 0
          : sameKind.length,
      };
      const saved = editingId
        ? await heroBannersApi.update(editingId, body)
        : await heroBannersApi.create(body);
      let next = saved;
      if (photoFile) next = await heroBannersApi.uploadImage(saved.id, photoFile);
      setItems((prev) => {
        const exists = prev.some((row) => row.id === next.id);
        return exists
          ? prev.map((row) => (row.id === next.id ? next : row))
          : [...prev, next];
      });
      setShowForm(false);
      flash(editingId ? "Banner updated" : "Banner added");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save banner"
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row: WebsiteHeroBannerDto) => {
    try {
      const updated = await heroBannersApi.update(row.id, {
        ...row,
        isPublished: !row.isPublished,
      });
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update visibility");
    }
  };

  const removePhoto = async (row: WebsiteHeroBannerDto) => {
    try {
      const updated = await heroBannersApi.deleteImage(row.id);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      if (editingId === row.id) {
        setPhotoFile(null);
        setPhotoPreview("");
      }
      flash("Image removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove image");
    }
  };

  const removeItem = async (row: WebsiteHeroBannerDto) => {
    if (!window.confirm(`Delete “${row.title}”?`)) return;
    try {
      await heroBannersApi.remove(row.id);
      setItems((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) setShowForm(false);
      flash("Banner deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const renderList = (kind: BannerKind | "promo", heading: string) => {
    const rows = items.filter((row) =>
      kind === "promo" ? isPromo(row.kind) : row.kind === kind
    );
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {heading}
          </h2>
          <button
            type="button"
            onClick={() =>
              openCreate(kind === "promo" ? "promo-wide" : kind)
            }
            className="text-sm font-medium text-[#E85D75] hover:underline"
          >
            + Add
          </button>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-500">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">None yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl(row.imageUrl)}
                      alt=""
                      className="h-14 w-14 rounded-md object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400">
                      No img
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {row.discountText ? `${row.discountText} · ` : ""}
                      {row.title}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {row.kind === "side"
                        ? `${row.tag || "Offer"} ${money(row.price)}`
                        : row.ctaLabel || row.description}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void togglePublished(row)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      row.isPublished
                        ? "bg-success-50 text-success-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {row.isPublished ? "Live" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="text-sm font-medium text-gray-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeItem(row)}
                    className="text-sm font-medium text-error-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/[0.06]"
            aria-label="Back to settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Home Banner
          </h1>
        </div>
        <p className="mt-1 pl-10 text-sm text-gray-500">
          Edit the homepage slider, side offers, promo banners, seasonal deal, and subscribe banner.
        </p>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
            {editingId ? "Edit banner" : "New banner"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Type
              </span>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    kind: parseKind(e.target.value),
                  }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="slide">Main slider</option>
                <option value="side">Side card</option>
                <option value="promo-wide">Promo — wide</option>
                <option value="promo-left">Promo — left</option>
                <option value="promo-right">Promo — right</option>
                <option value="deal">Seasonal deal</option>
                <option value="subscribe">Subscribe banner</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-7 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isPublished: e.target.checked,
                  }))
                }
              />
              Show on website
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Title
              </span>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            {form.kind !== "side" ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                    {isPromo(form.kind) ? "Offer line" : "Discount text"}
                  </span>
                  <input
                    value={form.discountText}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        discountText: e.target.value,
                      }))
                    }
                    placeholder={isPromo(form.kind) ? "UP TO 15% OFF" : "30%"}
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                    Highlight
                  </span>
                  <input
                    value={form.highlightText}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        highlightText: e.target.value,
                      }))
                    }
                    placeholder={
                      isPromo(form.kind)
                        ? "Linen Chesterfield Sofa"
                        : "Lighting Edit"
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                {form.kind === "deal" ? (
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                      Ends on
                    </span>
                    <input
                      type="date"
                      value={form.tag || ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, tag: e.target.value }))
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                    />
                  </label>
                ) : isPromo(form.kind) ? (
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                      Theme
                    </span>
                    <select
                      value={form.tag || "gray"}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, tag: e.target.value }))
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      <option value="gray">Soft gray</option>
                      <option value="teal">Teal</option>
                      <option value="orange">Warm orange</option>
                    </select>
                  </label>
                ) : null}
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                    Button label
                  </span>
                  <input
                    value={form.ctaLabel}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))
                    }
                    placeholder="Shop Furniture"
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                    Tag
                  </span>
                  <input
                    value={form.tag}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, tag: e.target.value }))
                    }
                    placeholder="showroom exclusive"
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                    Sale price
                  </span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                    Compare price
                  </span>
                  <input
                    type="number"
                    value={form.comparePrice}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        comparePrice: e.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
              </>
            )}
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Link
              </span>
              <input
                value={form.ctaHref}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ctaHref: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <div className="md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Image
              </span>
              <div className="flex items-center gap-3">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt=""
                    className="h-16 w-16 rounded-md object-cover"
                  />
                ) : (
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400">
                    No img
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPhotoFile(file);
                    if (file) setPhotoPreview(URL.createObjectURL(file));
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-sm font-medium text-[#E85D75] hover:underline"
                >
                  {photoPreview ? "Replace" : "Add"}
                </button>
                {editingId && photoPreview && !photoFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      void removePhoto(items.find((r) => r.id === editingId)!)
                    }
                    className="text-sm font-medium text-error-500 hover:underline"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveForm()}
              className="inline-flex h-10 items-center rounded-lg bg-[#E85D75] px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {renderList("slide", "Main slider")}
      {renderList("side", "Side cards")}
      {renderList("promo", "Promo banners")}
      {renderList("deal", "Seasonal deal")}
      {renderList("subscribe", "Subscribe banner")}
      <SubscriberList />
    </div>
  );
}

function SubscriberList() {
  const [rows, setRows] = useState<WebsiteSubscriberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await subscribersApi.list();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load subscribers");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (row: WebsiteSubscriberDto) => {
    if (!window.confirm(`Remove ${row.email}?`)) return;
    try {
      await subscribersApi.remove(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Subscribers
        </h2>
      </div>
      {error ? (
        <p className="px-5 py-4 text-sm text-error-500">{error}</p>
      ) : loading ? (
        <p className="px-5 py-6 text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">
          No emails yet. They appear here when someone subscribes on the website.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {row.email}
                </p>
                <p className="text-xs text-gray-400">
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleString()
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(row)}
                className="text-sm font-medium text-error-500 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
