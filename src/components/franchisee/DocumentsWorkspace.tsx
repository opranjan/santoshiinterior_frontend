"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";
import { projectsApi } from "@/services/crmApi";
import { formatDate } from "@/lib/mappers";
import { designAssetUrl } from "@/lib/designAssets";
import { isVendorPanelUser } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
};

type DocRow = {
  id: string;
  fileName?: string | null;
  url?: string | null;
  kind?: string | null;
  createdAt?: string;
  projectId?: string;
  project?: { id: string; name: string; clientName?: string | null } | null;
  uploadedBy?: { id: string; name: string } | null;
};

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const card =
  "rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";

function fileKind(name?: string | null, kind?: string | null) {
  const lower = String(name || "").toLowerCase();
  if (kind === "video" || /\.(mp4|mov|avi|webm)$/.test(lower)) return "Video";
  if (/\.(png|jpe?g|webp|gif)$/.test(lower) || kind === "elevation") return "Image";
  if (/\.pdf$/.test(lower)) return "PDF";
  return "Document";
}

function previewKind(name?: string | null, kind?: string | null): "image" | "video" | "pdf" | "other" {
  const type = fileKind(name, kind);
  if (type === "Image") return "image";
  if (type === "Video") return "video";
  if (type === "PDF") return "pdf";
  return "other";
}

export default function DocumentsWorkspace() {
  const { user } = useAuth();
  const franchisee = isVendorPanelUser(user);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<DocRow | null>(null);
  const [form, setForm] = useState({ projectId: "", kind: "document" });
  const [file, setFile] = useState<File | null>(null);

  const previewHref = preview ? designAssetUrl(preview.url) : "";
  const previewType = preview ? previewKind(preview.fileName, preview.kind) : "other";

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const load = async () => {
    const [projectRes, fileRes] = await Promise.all([
      projectsApi.list({ limit: 200 }),
      projectsApi.listFiles({ limit: 200 }),
    ]);
    setProjects((projectRes.items || []) as ProjectRow[]);
    setDocs((fileRes.items || []) as DocRow[]);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load documents");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      docs.filter((row) => !projectFilter || row.project?.id === projectFilter || row.projectId === projectFilter),
    [docs, projectFilter]
  );

  const upload = async () => {
    if (!form.projectId) {
      setError("Select the project for this document.");
      return;
    }
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await projectsApi.uploadFile(form.projectId, file, form.kind as "elevation" | "video" | "document");
      setShowForm(false);
      setFile(null);
      setForm({ projectId: "", kind: "document" });
      setNotice("Document uploaded.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: DocRow) => {
    const projectId = row.project?.id || row.projectId;
    if (!projectId) return;
    if (!window.confirm(`Remove ${row.fileName || "this file"}?`)) return;
    setSaving(true);
    setError("");
    try {
      await projectsApi.removeFile(projectId, row.id);
      setNotice("Document removed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span className="mx-1">›</span>
            <span className="text-gray-800 dark:text-white/90">Documents</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            {franchisee
              ? "Upload drawings, contracts, and site files for projects assigned to you. CRM can see them."
              : "Files uploaded on assigned franchisee projects. You can also add files from CRM."}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
        >
          + Upload
        </Button>
      </div>

      {error && !showForm ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <div className={card}>
          <p className="text-xs text-gray-500">Total files</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">{loading ? "—" : docs.length}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Projects with files</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {new Set(docs.map((row) => row.project?.id || row.projectId)).size}
          </p>
        </div>
        <div className={card}>
          <p className="mb-1 text-xs text-gray-500">Filter by project</p>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={fieldClass}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid grid-cols-2 gap-3 p-3 md:hidden">
          {filtered.map((row) => {
            const href = designAssetUrl(row.url);
            const type = previewKind(row.fileName, row.kind);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => href && setPreview(row)}
                className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f2] text-left"
              >
                <span className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-white">
                  {type === "image" && href ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={href} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      {fileKind(row.fileName, row.kind)}
                    </span>
                  )}
                </span>
                <span className="block truncate px-2.5 py-2 text-xs font-medium text-[#111]">{row.fileName}</span>
              </button>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Uploaded by</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const href = designAssetUrl(row.url);
                const type = previewKind(row.fileName, row.kind);
                return (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!href}
                        onClick={() => href && setPreview(row)}
                        className="flex items-center gap-3 text-left"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-[#fbf8f2] dark:border-gray-800">
                          {type === "image" && href ? (
                            <img src={href} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                              {fileKind(row.fileName, row.kind)}
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {row.fileName || "File"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{row.project?.name || "—"}</p>
                      <p className="text-xs text-gray-400">{row.project?.clientName || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fileKind(row.fileName, row.kind)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.uploadedBy?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        {href ? (
                          <button
                            type="button"
                            onClick={() => setPreview(row)}
                            className="text-sm font-medium text-brand-600"
                          >
                            Preview
                          </button>
                        ) : null}
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-gray-600"
                          >
                            Open
                          </a>
                        ) : null}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void remove(row)}
                          className="text-sm font-medium text-error-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !filtered.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No documents yet. Upload a file for an assigned project.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {fileKind(preview.fileName, preview.kind)}
                  {preview.project?.name ? ` · ${preview.project.name}` : ""}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                  {preview.fileName || "Document"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {previewHref ? (
                  <a
                    href={previewHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    Open
                  </a>
                ) : null}
                {previewHref ? (
                  <a
                    href={previewHref}
                    download={preview.fileName || "document"}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    Download
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg px-2 py-1 text-lg text-gray-400"
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="min-h-[320px] flex-1 overflow-auto bg-[#111] p-3">
              {!previewHref ? (
                <p className="p-8 text-center text-sm text-white/70">This file has no preview URL.</p>
              ) : previewType === "image" ? (
                <img
                  src={previewHref}
                  alt={preview.fileName || "Document"}
                  className="mx-auto max-h-[72vh] w-auto max-w-full object-contain"
                />
              ) : previewType === "video" ? (
                <video src={previewHref} controls className="mx-auto max-h-[72vh] w-full max-w-3xl" />
              ) : previewType === "pdf" ? (
                <iframe
                  title={preview.fileName || "PDF preview"}
                  src={previewHref}
                  className="h-[72vh] w-full rounded-lg bg-white"
                />
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
                  <p className="text-sm">Preview is not available for this file type.</p>
                  <a
                    href={previewHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-800"
                  >
                    Open file
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Upload document</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400">
                ✕
              </button>
            </div>
            {error ? (
              <p className="mb-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600">
                {error}
              </p>
            ) : null}
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-sm text-gray-600">Project</p>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className={fieldClass}
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.clientName ? ` · ${project.clientName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Type</p>
                <select
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                  className={fieldClass}
                >
                  <option value="document">Document</option>
                  <option value="elevation">Drawing / image</option>
                  <option value="video">Site video</option>
                </select>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">File</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600"
                />
                {file ? <p className="mt-1 text-xs text-gray-400">{file.name}</p> : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void upload()}>
                {saving ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
