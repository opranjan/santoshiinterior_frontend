"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { designAssetUrl } from "@/lib/designAssets";
import { testimonialsApi, type WebsiteTestimonialDto } from "@/services/crmApi";

const emptyForm = {
  authorName: "",
  authorRole: "",
  review: "",
  rating: 5,
  isPublished: true,
};

export default function WebsiteTestimonials() {
  const [items, setItems] = useState<WebsiteTestimonialDto[]>([]);
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

  const load = async () => {
    const data = await testimonialsApi.list();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load testimonials"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview("");
    setShowForm(true);
    setError("");
  };

  const openEdit = (row: WebsiteTestimonialDto) => {
    setEditingId(row.id);
    setForm({
      authorName: row.authorName,
      authorRole: row.authorRole || "",
      review: row.review,
      rating: row.rating || 5,
      isPublished: row.isPublished,
    });
    setPhotoFile(null);
    setPhotoPreview(row.authorImg ? designAssetUrl(row.authorImg) : "");
    setShowForm(true);
    setError("");
  };

  const onPickPhoto = (file: File | null) => {
    setPhotoFile(file);
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
  };

  const saveForm = async () => {
    if (!form.authorName.trim() || !form.review.trim()) {
      setError("Name and review are required");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const body = {
        authorName: form.authorName.trim(),
        authorRole: form.authorRole.trim(),
        review: form.review.trim(),
        rating: form.rating,
        isPublished: form.isPublished,
        sortOrder: editingId
          ? items.find((row) => row.id === editingId)?.sortOrder || 0
          : items.length,
      };
      const saved = editingId
        ? await testimonialsApi.update(editingId, body)
        : await testimonialsApi.create(body);
      let next = saved;
      if (photoFile) {
        next = await testimonialsApi.uploadImage(saved.id, photoFile);
      }
      setItems((prev) => {
        const exists = prev.some((row) => row.id === next.id);
        return exists
          ? prev.map((row) => (row.id === next.id ? next : row))
          : [next, ...prev];
      });
      setShowForm(false);
      flash(editingId ? "Testimonial updated" : "Testimonial added");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save testimonial"
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row: WebsiteTestimonialDto) => {
    try {
      const updated = await testimonialsApi.update(row.id, {
        ...row,
        isPublished: !row.isPublished,
      });
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update visibility"
      );
    }
  };

  const removePhoto = async (row: WebsiteTestimonialDto) => {
    try {
      const updated = await testimonialsApi.deleteImage(row.id);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      if (editingId === row.id) {
        setPhotoFile(null);
        setPhotoPreview("");
      }
      flash("Photo removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove photo");
    }
  };

  const removeItem = async (row: WebsiteTestimonialDto) => {
    if (!window.confirm(`Delete testimonial from ${row.authorName}?`)) return;
    try {
      await testimonialsApi.remove(row.id);
      setItems((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) setShowForm(false);
      flash("Testimonial deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
              Website Testimonials
            </h1>
          </div>
          <p className="mt-1 pl-10 text-sm text-gray-500">
            Add reviews that appear on the public website homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#E85D75] px-4 text-sm font-medium text-white hover:bg-[#d94c66]"
        >
          + Testimonial
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
            {editingId ? "Edit testimonial" : "New testimonial"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Name
              </span>
              <input
                value={form.authorName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, authorName: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Role / city
              </span>
              <input
                value={form.authorRole}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, authorRole: e.target.value }))
                }
                placeholder="Homeowner, Mumbai"
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Review
              </span>
              <textarea
                value={form.review}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, review: e.target.value }))
                }
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Rating
              </span>
              <select
                value={form.rating}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    rating: Number(e.target.value) || 5,
                  }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
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
            <div className="md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Photo
              </span>
              <div className="flex items-center gap-3">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-gray-300 text-[10px] text-gray-400">
                    No img
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <p className="px-5 py-8 text-sm text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">
            No testimonials yet. Add one to show it on the website.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {row.authorImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={designAssetUrl(row.authorImg)}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                      {row.authorName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {row.authorName}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {row.rating} star{row.rating === 1 ? "" : "s"}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">{row.authorRole}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                      {row.review}
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
    </div>
  );
}
