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
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryStatus, setAiSummaryStatus] = useState("PENDING");
  const [aiSummaryError, setAiSummaryError] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [copied, setCopied] = useState(false);

  const applyRecordingPayload = (data: {
    mimeType?: string;
    transcript?: string;
    transcriptStatus?: string;
    transcriptLanguage?: string;
    transcriptError?: string;
    aiSummary?: string;
    aiSummaryStatus?: string;
    aiSummaryError?: string;
    chunks?: Array<{
      seq: number;
      durationSec: number;
      status: string;
      transcript: string;
      transcriptStatus: string;
    }>;
  }) => {
    const ready = (data.chunks || []).filter((c) => c.status === "UPLOADED");
    const fromChunks = ready
      .slice()
      .sort((a, b) => a.seq - b.seq)
      .map((c) => String(c.transcript || "").trim())
      .filter(Boolean)
      .join("\n\n");
    const fullText = fromChunks || String(data.transcript || "").trim();
    setTranscript(fullText);
    setTranscriptStatus(data.transcriptStatus || "PENDING");
    setTranscriptLanguage(data.transcriptLanguage || "");
    setTranscriptError(data.transcriptError || "");
    setAiSummary(data.aiSummary || "");
    setAiSummaryStatus(data.aiSummaryStatus || "PENDING");
    setAiSummaryError(data.aiSummaryError || "");
    setChunks(
      ready.map((c) => ({
        seq: c.seq,
        durationSec: c.durationSec,
        transcript: c.transcript || "",
        transcriptStatus: c.transcriptStatus || "PENDING",
      }))
    );
    return fullText;
  };

  const convertFullAudio = async () => {
    try {
      setTranscribing(true);
      setError("");
      setTranscriptStatus("PROCESSING");
      const data = await hrApi.transcribeAttendanceRecording(recordingId);
      applyRecordingPayload(data);
      if (!String(data.transcript || "").trim()) {
        setError(data.transcriptError || "No speech detected in this recording.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not convert full audio to text");
      setTranscriptStatus("FAILED");
    } finally {
      setTranscribing(false);
    }
  };

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
        const fullText = applyRecordingPayload(data);
        const status = data.transcriptStatus || "PENDING";
        const summaryStatus = data.aiSummaryStatus || "PENDING";
        const englishReady =
          data.transcriptLanguage === "latn" || status === "FAILED" || status === "EMPTY";
        const transcriptDone = englishReady && ["READY", "EMPTY", "FAILED"].includes(status);
        const summaryDone =
          !fullText || ["READY", "EMPTY", "FAILED"].includes(summaryStatus);
        const done = transcriptDone && summaryDone;
        if (done && timer) window.clearInterval(timer);
        const ready = (data.chunks || []).filter((c) => c.status === "UPLOADED");
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
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-[#1c1814]">
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

        {/* Full spoken text from this audio — complete transcript, not a preview */}
        <div className="mt-5 rounded-xl border border-[#E8D5B5] bg-[#FBF6EE] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8C6239]">
                Full text · {transcriptLabel(transcriptStatus)}
              </p>
              <p className="mt-1 text-[11px] text-[#a08a6a]">
                Complete words from this duty recording
                {transcript
                  ? ` · ${transcript.trim().split(/\s+/).filter(Boolean).length} words`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={transcribing || loading || !chunks.length}
                onClick={() => void convertFullAudio()}
              >
                {transcribing ? "Converting full audio…" : "Convert full audio to text"}
              </Button>
              {transcript ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(transcript).then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                >
                  {copied ? "Copied" : "Copy full text"}
                </Button>
              ) : null}
            </div>
          </div>
          {transcriptError && !transcript ? (
            <p className="mt-2 text-sm text-error-500">{transcriptError}</p>
          ) : transcript ? (
            <div className="mt-3 rounded-lg bg-white p-4 dark:bg-black/20">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-800 dark:text-gray-200">
                {transcript}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              {transcriptStatus === "PROCESSING" || transcriptStatus === "PENDING"
                ? "Speech is being converted. Full text will appear here in a few seconds…"
                : "No transcript yet for this session."}
            </p>
          )}
          {chunkText && chunks.length > 1 && transcriptLanguage === "latn" ? (
            <p className="mt-3 border-t border-[#E8D5B5] pt-3 text-xs text-gray-500 dark:border-white/10">
              Playing chunk {active + 1}: {chunkText}
            </p>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-[#E8D5B5] bg-[#FBF6EE] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8C6239]">
              {aiSummaryStatus === "PROCESSING" || summarizing
                ? "Generating AI summary…"
                : aiSummaryStatus === "FAILED"
                  ? "AI summary failed"
                  : "AI summary"}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={summarizing || (!transcript && transcriptStatus !== "READY")}
              onClick={() => {
                void (async () => {
                  try {
                    setSummarizing(true);
                    setError("");
                    const data = await hrApi.summarizeAttendanceRecording(recordingId, true);
                    setTranscript(data.transcript || transcript);
                    setTranscriptStatus(data.transcriptStatus || transcriptStatus);
                    setAiSummary(data.aiSummary || "");
                    setAiSummaryStatus(data.aiSummaryStatus || "READY");
                    setAiSummaryError(data.aiSummaryError || "");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "AI summary failed");
                  } finally {
                    setSummarizing(false);
                  }
                })();
              }}
            >
              {summarizing ? "Summarizing…" : aiSummary ? "Refresh summary" : "Generate summary"}
            </Button>
          </div>
          {aiSummaryError && !aiSummary ? (
            <p className="mt-2 text-sm text-error-500">{aiSummaryError}</p>
          ) : aiSummary ? (
            <div className="mt-2 max-h-[28vh] overflow-y-auto pr-2">
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">
                {aiSummary}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              {aiSummaryStatus === "PROCESSING" || summarizing
                ? "ChatGPT is reviewing this duty audio…"
                : transcript
                  ? "Click Generate summary for a ChatGPT overview of this recording."
                  : "Transcript is needed before ChatGPT can summarize."}
            </p>
          )}
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
