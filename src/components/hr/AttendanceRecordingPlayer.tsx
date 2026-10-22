"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import { apiAbsoluteUrl } from "@/lib/api";
import { tokenStorage } from "@/lib/auth";
import { hrApi } from "@/services/crmApi";

type Chunk = {
  seq: number;
  durationSec: number;
  transcript: string;
  transcriptStatus: string;
};

type Props = {
  recordingId: string;
  employeeName: string;
  onClose: () => void;
};

function transcriptLabel(status: string) {
  if (status === "READY") return "Audio to text";
  if (status === "PROCESSING" || status === "PENDING") return "Converting audio to text…";
  if (status === "EMPTY") return "No speech detected";
  if (status === "FAILED") return "Could not convert audio to text";
  return "Audio to text";
}

export default function AttendanceRecordingPlayer({ recordingId, employeeName, onClose }: Props) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mimeType, setMimeType] = useState("audio/mp4");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [active, setActive] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [transcriptStatus, setTranscriptStatus] = useState("PENDING");
  const [transcriptLanguage, setTranscriptLanguage] = useState("");
  const [transcriptError, setTranscriptError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    async function load(first = false) {
      if (first) {
        setLoading(true);
        setError("");
      }
      try {
        const data = await hrApi.getAttendanceRecording(recordingId);
        if (cancelled) return;
        setMimeType(data.mimeType || "audio/mp4");
        setTranscript(data.transcript || "");
        setTranscriptStatus(data.transcriptStatus || "PENDING");
        setTranscriptLanguage(data.transcriptLanguage || "");
        setTranscriptError(data.transcriptError || "");
        const status = data.transcriptStatus || "PENDING";
        const englishReady =
          data.transcriptLanguage === "latn" || status === "FAILED" || status === "EMPTY";
        const done = englishReady && ["READY", "EMPTY", "FAILED"].includes(status);
        if (done && timer) window.clearInterval(timer);
        const ready = (data.chunks || []).filter((c) => c.status === "UPLOADED");
        setChunks(
          ready.map((c) => ({
            seq: c.seq,
            durationSec: c.durationSec,
            transcript: c.transcript || "",
            transcriptStatus: c.transcriptStatus || "PENDING",
          }))
        );
        if (first) {
          const token = tokenStorage.getAccessToken();
          const next: Record<number, string> = {};
          for (const chunk of ready) {
            const res = await fetch(
              apiAbsoluteUrl(`/hr/attendance-recordings/${recordingId}/chunks/${chunk.seq}/audio`),
              { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
            );
            if (!res.ok) continue;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            created.push(url);
            next[chunk.seq] = url;
          }
          if (!cancelled) setUrls(next);
        }
      } catch (err) {
        if (!cancelled && first) setError(err instanceof Error ? err.message : "Could not load recording");
      } finally {
        if (!cancelled && first) setLoading(false);
      }
    }
    let timer: number | undefined;
    load(true);
    timer = window.setInterval(() => {
      load(false);
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [recordingId]);

  const current = chunks[active];
  const src = current ? urls[current.seq] : "";
  const totalMin = useMemo(
    () => Math.round(chunks.reduce((sum, c) => sum + (c.durationSec || 0), 0) / 60),
    [chunks]
  );
  const chunkText = current?.transcript?.trim() || "";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-[#1c1814]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Duty recording</h3>
        <p className="mt-1 text-sm text-gray-500">
          {employeeName}
          {totalMin ? ` · ~${totalMin} min` : ""}
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Decrypting audio…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-error-500">{error}</p>
        ) : !src ? (
          <p className="mt-4 text-sm text-gray-500">No uploaded audio chunks yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <audio
              key={src}
              controls
              autoPlay
              className="w-full"
              src={src}
              onEnded={() => setActive((i) => Math.min(i + 1, Math.max(chunks.length - 1, 0)))}
            />
            <p className="text-xs text-gray-400">
              Chunk {active + 1} of {chunks.length} · {mimeType}
            </p>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-[#E8D5B5] bg-[#FBF6EE] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8C6239]">
            {transcriptLabel(transcriptStatus)}
          </p>
          {transcriptError && !transcript ? (
            <p className="mt-2 text-sm text-error-500">{transcriptError}</p>
          ) : transcript ? (
            <div className="mt-2 max-h-[45vh] overflow-y-auto pr-2">
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">
                {transcript}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              {transcriptStatus === "PROCESSING" || transcriptStatus === "PENDING"
                ? "Speech is being converted. Full text will appear here."
                : "No transcript yet for this session."}
            </p>
          )}
          {chunkText && chunks.length > 1 && transcriptLanguage === "latn" ? (
            <p className="mt-3 max-h-24 overflow-y-auto border-t border-[#E8D5B5] pt-3 text-xs text-gray-500 dark:border-white/10">
              This chunk: {chunkText}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
