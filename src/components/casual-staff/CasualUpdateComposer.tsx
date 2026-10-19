"use client";

import React, { useRef, useState } from "react";

type Tab = "Photos" | "Videos" | "Note" | "Message";

function IconCamera({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2.1l.8-1.4A1.5 1.5 0 0 1 10.7 4h2.6a1.5 1.5 0 0 1 1.3.6L15.4 6h2.1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

function IconVideo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="6.5" width="12" height="11" rx="2" />
      <path d="M15.5 11.2 20 8.5v7l-4.5-2.7" />
    </svg>
  );
}

function IconNote({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3.8h7.2L19 8.6V20.2H7z" />
      <path d="M14.1 3.8v4.8H19" />
      <path d="M10 12.2h5.2M10 15.6h5.2" />
    </svg>
  );
}

function IconMessage({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 6.5h14v9.2H8.4L5 18.8z" />
    </svg>
  );
}

function IconCloud({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path
        d="M16 32h16.5a7.5 7.5 0 0 0 .4-15 10 10 0 0 0-19.2 2.4A6.5 6.5 0 0 0 16 32Z"
        stroke="#c4a574"
        strokeWidth="2.2"
      />
      <path d="M24 21.5v11M20.2 24.8 24 21.2l3.8 3.6" stroke="#c4a574" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSend({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.4 11.2 20.1 3.6c.8-.4 1.6.4 1.2 1.2l-7.6 16.7c-.4.8-1.6.7-1.8-.2l-1.7-7.1-7.1-1.7c-.9-.2-1-.1.2-1.8Z" />
    </svg>
  );
}

export default function CasualUpdateComposer({
  onSubmit,
  extra,
  submitLabel = "Submit Update",
}: {
  onSubmit: (form: FormData) => Promise<void>;
  extra?: React.ReactNode;
  submitLabel?: string;
}) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("Photos");
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const addFiles = (list: FileList | null, kind: "photo" | "video") => {
    if (!list) return;
    const next = Array.from(list);
    if (kind === "photo") setPhotos((prev) => [...prev, ...next].slice(0, 10));
    else setVideos((prev) => [...prev, ...next].slice(0, 4));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const kind = tab === "Videos" ? "video" : "photo";
    addFiles(e.dataTransfer.files, kind);
  };

  const submit = async () => {
    if (!note.trim() && !message.trim() && photos.length === 0 && videos.length === 0) {
      setError("Add a photo, video, or note before submitting");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      if (note.trim()) form.append("note", note.trim());
      if (message.trim()) form.append("message", message.trim());
      [...photos, ...videos].forEach((file) => form.append("files", file));
      await onSubmit(form);
      setPhotos([]);
      setVideos([]);
      setNote("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit update");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "Photos", label: "Photos", icon: <IconCamera /> },
    { id: "Videos", label: "Videos", icon: <IconVideo /> },
    { id: "Note", label: "Note", icon: <IconNote /> },
    { id: "Message", label: "Message", icon: <IconMessage /> },
  ];

  const currentFiles = tab === "Videos" ? videos : photos;

  return (
    <div className="rounded-[22px] border border-[#eadfcf] bg-white p-4 shadow-[0_8px_24px_rgba(90,70,40,0.04)] sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f6efe4] text-[#b89158]">
          <IconCamera className="h-5 w-5" />
        </span>
        <div>
          <h2
            className="font-serif text-[1.4rem] text-[#2a2118]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Share Your Update
          </h2>
          <p className="text-sm text-[#8a7b68]">Upload photos, videos and add a note about the work you have done.</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                active
                  ? "bg-[#9a7348] text-white shadow-[0_4px_10px_rgba(154,115,72,0.28)]"
                  : "border border-[#d8c4a3] bg-[#fbf6ee] text-[#6b5740]"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "Photos" || tab === "Videos" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-2xl border border-dashed bg-[#fbf8f3] p-4 ${
            dragging ? "border-[#c4a574] bg-[#f7efe3]" : "border-[#e4d4bb]"
          }`}
        >
          <button
            type="button"
            onClick={() => (tab === "Photos" ? photoRef : videoRef).current?.click()}
            className="mb-4 block w-full py-7 text-center"
          >
            <span className="mx-auto mb-1 grid place-items-center">
              <IconCloud />
            </span>
            <p className="text-[15px] font-semibold text-[#5c5146]">Drag & drop {tab.toLowerCase()} here</p>
            <p className="mt-1 text-xs text-[#8a7b68]">
              or click to select files
              <br />
              {tab === "Photos" ? "JPG, PNG (Max 10 photos, 10 MB each)" : "MP4 (Max 4 videos, 10 MB each)"}
            </p>
          </button>
          <div className="flex flex-wrap gap-3">
            {currentFiles.map((file, i) => (
              <div key={`${file.name}-${i}`} className="relative h-[92px] w-[118px] overflow-hidden rounded-xl bg-white shadow-sm">
                {tab === "Photos" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={URL.createObjectURL(file)} className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() =>
                    tab === "Photos"
                      ? setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                      : setVideos((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-sm text-white"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => (tab === "Photos" ? photoRef : videoRef).current?.click()}
              className="grid h-[92px] w-[118px] place-items-center rounded-xl border border-dashed border-[#e4d4bb] bg-white text-center text-sm font-medium text-[#8a7b68]"
            >
              <span>
                +<br />
                Add More
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <input ref={photoRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files, "photo")} />
      <input ref={videoRef} type="file" accept="video/*" multiple hidden onChange={(e) => addFiles(e.target.files, "video")} />

      <label className="mt-4 block">
        <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#5c5146]">
          <IconNote className="h-4 w-4 text-[#b89158]" />
          Work Note {tab === "Note" ? "" : "(Optional)"}
        </span>
        <div className="relative">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="Describe the work you completed today..."
            className="h-12 w-full rounded-xl border border-[#eadfcf] bg-white px-3 pr-14 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a898] focus:border-[#c4a574]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#b3a898]">{note.length}/500</span>
        </div>
      </label>

      <label className="mt-3 block">
        <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#5c5146]">
          <IconMessage className="h-4 w-4 text-[#b89158]" />
          Send a message to the manager {tab === "Message" ? "" : "(Optional)"}
        </span>
        <div className="relative">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            placeholder="Type your message here..."
            className="h-12 w-full rounded-xl border border-[#eadfcf] bg-white px-3 pr-14 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a898] focus:border-[#c4a574]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#b3a898]">{message.length}/500</span>
        </div>
      </label>

      {extra}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#9a7348] text-sm font-semibold text-white hover:bg-[#875f36] disabled:opacity-60"
      >
        <IconSend className="h-4 w-4" />
        {saving ? "Submitting…" : submitLabel}
      </button>
    </div>
  );
}
