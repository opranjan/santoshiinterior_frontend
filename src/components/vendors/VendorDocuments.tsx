"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { designAssetUrl } from "@/lib/designAssets";
import { vendorsApi, type VendorDocumentDto, type VendorDto } from "@/services/crmApi";

export default function VendorDocuments({ vendorId }: { vendorId: string }) {
  const [vendor, setVendor] = useState<VendorDto | null>(null);
  const [items, setItems] = useState<VendorDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState<VendorDocumentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendorDocumentDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await vendorsApi.documents(vendorId);
      setVendor(data.vendor);
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [vendorId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) =>
      [row.name, row.fileName].some((value) => value.toLowerCase().includes(q))
    );
  }, [items, search]);

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError("");
      await vendorsApi.removeDocument(vendorId, deleteTarget.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      if (preview?.id === deleteTarget.id) setPreview(null);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading documents...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/operations/vendors/${vendorId}`}
            className="inline-flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white/90"
          >
            <span className="text-2xl font-normal text-gray-500">‹</span>
            Documents
          </Link>
          <span className="truncate text-sm font-medium uppercase tracking-wide text-gray-500">
            {vendor?.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#E85D75]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-10 w-44 rounded-full border border-gray-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-[#E85D75] dark:border-gray-700 dark:bg-gray-900"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-10 items-center gap-1 rounded-full bg-[#E85D75] px-4 text-sm font-medium text-white hover:bg-[#d64c66]"
          >
            + Add
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm text-error-600">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <SadFolder />
          <p className="mt-4 text-sm text-gray-400">Get started by adding a file</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() => setPreview(row)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <DocumentThumb row={row} />
                <span className="min-w-0 truncate text-sm font-medium text-gray-800 dark:text-white/90">
                  {row.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPreview(row)}
                className="shrink-0 text-xs font-medium text-[#E85D75]"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(row)}
                className="shrink-0 text-xs font-medium text-error-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <PreviewModal
        row={preview}
        onClose={() => setPreview(null)}
      />

      <DeleteDialog
        row={deleteTarget}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmRemove()}
      />

      <UploadModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onUploaded={(next) => {
          setItems(next);
          setAddOpen(false);
        }}
        vendorId={vendorId}
      />
    </div>
  );
}

function fileKind(row: Pick<VendorDocumentDto, "mimeType" | "fileName" | "name">) {
  const mime = (row.mimeType || "").toLowerCase();
  const name = `${row.fileName || ""} ${row.name || ""}`.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (mime.includes("pdf") || name.includes(".pdf")) return "pdf";
  if (mime.startsWith("text/") || name.includes(".txt")) return "text";
  return "file";
}

function DocumentThumb({ row }: { row: VendorDocumentDto }) {
  const kind = fileKind(row);
  const url = designAssetUrl(row.fileUrl);
  if (kind === "image") {
    return (
      <img
        src={url}
        alt=""
        className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-gray-100"
      />
    );
  }
  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase ${
        kind === "pdf" ? "bg-[#FDE8EC] text-[#E85D75]" : "bg-gray-100 text-gray-500"
      }`}
    >
      {kind === "pdf" ? "PDF" : "FILE"}
    </span>
  );
}

function PreviewModal({
  row,
  onClose,
}: {
  row: VendorDocumentDto | null;
  onClose: () => void;
}) {
  const url = row ? designAssetUrl(row.fileUrl) : "";
  const kind = row ? fileKind(row) : "file";
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!row || !url) {
      setSrc("");
      return;
    }
    let objectUrl = "";
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setSrc("");
    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load file");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) {
          setSrc(url);
          setFailed(kind !== "image");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [row, url, kind]);

  if (!row) return null;

  const canEmbed = kind === "image" || kind === "pdf" || kind === "text";

  return (
    <Modal
      isOpen
      onClose={onClose}
      className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden p-0 shadow-xl"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/40"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">{row.name}</p>
          <p className="truncate text-xs text-gray-400">{row.fileName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#E85D75] hover:bg-[#FDE8EC]"
          >
            Open
          </a>
          <a
            href={src || url}
            download={row.fileName || row.name}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-400"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
      <div className="min-h-[420px] flex-1 bg-gray-50 dark:bg-gray-950">
        {loading || (canEmbed && !src && !failed) ? (
          <p className="flex h-[50vh] items-center justify-center text-sm text-gray-400">Loading preview...</p>
        ) : canEmbed && src && !failed ? (
          kind === "image" ? (
            <div className="flex h-[70vh] items-center justify-center overflow-auto p-4">
              <img src={src} alt={row.name} className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
            </div>
          ) : (
            <iframe title={row.name} src={src} className="h-[70vh] w-full border-0 bg-white" />
          )
        ) : (
          <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-sm font-bold text-gray-500">
              {kind === "pdf" ? "PDF" : "FILE"}
            </span>
            <p className="text-sm text-gray-500">Preview is not available for this file type.</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#E85D75] px-4 py-2 text-sm font-medium text-white hover:bg-[#d64c66]"
            >
              Open file
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}

function DeleteDialog({
  row,
  busy,
  onCancel,
  onConfirm,
}: {
  row: VendorDocumentDto | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      isOpen={Boolean(row)}
      onClose={onCancel}
      className="w-full max-w-md overflow-hidden p-0 shadow-2xl"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/35"
    >
      {row ? (
        <div className="relative px-6 pb-6 pt-8 text-center">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#FDE8EC] to-white dark:from-[#E85D75]/15 dark:to-gray-900" />
          <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-[#E85D75]/15">
            <svg className="h-8 w-8 text-[#E85D75]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12"
              />
            </svg>
          </div>
          <h3 className="relative text-lg font-semibold text-gray-800 dark:text-white/90">Delete this file?</h3>
          <p className="relative mt-1 text-sm text-gray-500">This can’t be undone. The file will be removed from this vendor.</p>
          <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-left dark:border-gray-800 dark:bg-white/[0.04]">
            <DocumentThumb row={row} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{row.name}</p>
              <p className="truncate text-xs text-gray-400">{row.fileName}</p>
            </div>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/80"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="h-11 rounded-xl bg-[#E85D75] text-sm font-medium text-white shadow-sm hover:bg-[#d64c66] disabled:opacity-50"
            >
              {busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function SadFolder() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-28 drop-shadow-md">
      <path d="M8 28a8 8 0 018-8h22l10 10h54a8 8 0 018 8v42a8 8 0 01-8 8H16a8 8 0 01-8-8V28z" fill="#FBBF24" />
      <path d="M8 40h104v40a8 8 0 01-8 8H16a8 8 0 01-8-8V40z" fill="#F59E0B" />
      <circle cx="48" cy="62" r="4" fill="#92400E" />
      <circle cx="72" cy="62" r="4" fill="#92400E" />
      <path d="M50 78c6-7 14-7 20 0" stroke="#92400E" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function UploadModal({
  isOpen,
  onClose,
  onUploaded,
  vendorId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (items: VendorDocumentDto[]) => void;
  vendorId: string;
}) {
  const [tab, setTab] = useState<"single" | "multiple">("single");
  const [files, setFiles] = useState<File[]>([]);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTab("single");
    setFiles([]);
    setFileName("");
    setError("");
  }, [isOpen]);

  const pick = (list: FileList | null) => {
    const next = list ? Array.from(list) : [];
    if (!next.length) return;
    if (tab === "single") {
      setFiles(next.slice(0, 1));
      if (next[0] && !fileName) {
        setFileName(next[0].name.replace(/\.[^.]+$/, ""));
      }
      return;
    }
    setFiles((prev) => {
      const merged = new Map(
        prev.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file])
      );
      next.forEach((file) => merged.set(`${file.name}:${file.size}:${file.lastModified}`, file));
      return Array.from(merged.values());
    });
  };

  const upload = async () => {
    if (!files.length) {
      setError("Choose files to upload");
      return;
    }
    if (tab === "single" && !fileName.trim()) {
      setError("File name is required");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const data = await vendorsApi.uploadDocuments(
        vendorId,
        files,
        tab === "single" ? fileName : undefined
      );
      onUploaded(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg p-6 shadow-xl"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/20"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex gap-6 text-sm">
          <button
            type="button"
            onClick={() => {
              setTab("single");
              setFiles((prev) => prev.slice(0, 1));
            }}
            className={`pb-2 ${tab === "single" ? "border-b-2 border-gray-800 font-semibold text-gray-800" : "text-gray-400"}`}
          >
            Single File
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("multiple");
              setFileName("");
            }}
            className={`pb-2 ${tab === "multiple" ? "border-b-2 border-gray-800 font-semibold text-gray-800" : "text-gray-400"}`}
          >
            Multiple Files
          </button>
        </div>
        <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-400" aria-label="Close">
          ×
        </button>
      </div>

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          pick(event.dataTransfer.files);
        }}
        className="relative flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-center hover:border-[#E85D75]/50"
      >
        <input
          key={tab}
          type="file"
          multiple={tab === "multiple"}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          className="absolute inset-0 z-10 cursor-pointer opacity-0"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FDE8EC] text-[#E85D75]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6h.1a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
          </svg>
        </span>
        <span className="text-sm text-gray-500">
          {files.length
            ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
            : tab === "multiple"
              ? "Choose or drop multiple files"
              : "Choose files to upload"}
        </span>
      </label>

      {tab === "multiple" && files.length ? (
        <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-left">
          {files.map((file) => (
            <li
              key={`${file.name}:${file.size}:${file.lastModified}`}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
            >
              <span className="min-w-0 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() =>
                  setFiles((prev) =>
                    prev.filter(
                      (item) =>
                        `${item.name}:${item.size}:${item.lastModified}` !==
                        `${file.name}:${file.size}:${file.lastModified}`
                    )
                  )
                }
                className="ml-2 text-gray-400 hover:text-error-500"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "single" ? (
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-white/80">
            File Name <span className="text-error-500">*</span>
          </label>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter File Name"
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#E85D75] dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-error-500">{error}</p> : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void upload()}
        className="mt-5 h-11 w-full rounded-lg bg-[#E85D75] text-sm font-medium text-white hover:bg-[#d64c66] disabled:opacity-50"
      >
        {saving ? "Uploading..." : "Upload"}
      </button>
    </Modal>
  );
}
