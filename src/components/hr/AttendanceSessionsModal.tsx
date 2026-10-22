"use client";

import Button from "@/components/ui/button/Button";

export type DutySession = {
  index: number;
  checkIn: string;
  checkOut: string;
  durationSec: number;
  recordingId?: string;
  recordingStatus?: string;
  transcript?: string;
  transcriptStatus?: string;
  transcriptLanguage?: string;
  chunkCount: number;
};

type EmployeeLite = {
  name: string;
  store: string;
  department: string;
  employeeCode?: string;
};

type Props = {
  employee: EmployeeLite;
  dateLabel: string;
  status: string;
  sessions: DutySession[];
  onListen: (recordingId: string, label: string) => void;
  onClose: () => void;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function clockToSeconds(value: string) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (match) {
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    const mer = (match[4] || "").toUpperCase();
    if (mer === "PM" && hours < 12) hours += 12;
    if (mer === "AM" && hours === 12) hours = 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (/\d{4}-\d{2}-\d{2}|T/.test(raw)) {
    const iso = new Date(raw);
    if (!Number.isNaN(iso.getTime())) {
      return iso.getHours() * 3600 + iso.getMinutes() * 60 + iso.getSeconds();
    }
  }
  return null;
}

function to12h(value: string) {
  const total = clockToSeconds(value);
  if (total == null) return "—";
  let hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${pad(minutes)}:${pad(seconds)} ${ampm}`;
}

export function formatHms(totalSec: number) {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return "—";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${h}h ${pad(m)}m ${pad(s)}s`;
}

export function sessionDurationSec(checkIn: string, checkOut: string, fallback = 0) {
  const a = clockToSeconds(checkIn);
  const b = clockToSeconds(checkOut);
  if (a == null || b == null || b < a) return fallback;
  return b - a;
}

export default function AttendanceSessionsModal({
  employee,
  dateLabel,
  status,
  sessions,
  onListen,
  onClose,
}: Props) {
  const totalSec = sessions.reduce((sum, row) => {
    return sum + sessionDurationSec(row.checkIn, row.checkOut, row.durationSec || 0);
  }, 0);
  const withAudio = sessions.filter((row) => row.recordingId && row.chunkCount > 0).length;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-[#1c1814]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{employee.name}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {employee.employeeCode || "—"} · {employee.department} · {employee.store}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {dateLabel} · {status} · {sessions.length} session{sessions.length === 1 ? "" : "s"} · Total{" "}
              {formatHms(totalSec)} · {withAudio} recording{withAudio === 1 ? "" : "s"}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {sessions.map((row) => (
            <div
              key={`${row.index}-${row.recordingId || row.checkIn}`}
              className="rounded-xl border border-[#E8D5B5] bg-[#FBF6EE] p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">Session #{row.index}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {to12h(row.checkIn)} – {to12h(row.checkOut)} ·{" "}
                    {formatHms(sessionDurationSec(row.checkIn, row.checkOut, row.durationSec || 0))}
                  </p>
                </div>
                {row.recordingId && row.chunkCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onListen(row.recordingId!, `Session ${row.index}`)}
                    className="inline-flex h-8 items-center rounded-lg bg-[#8C6239] px-3 text-xs font-medium text-white hover:bg-[#5C3D2E]"
                  >
                    Listen
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">
                    {row.recordingStatus === "RECORDING" ? "Recording…" : "No audio"}
                  </span>
                )}
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#8C6239]">Audio to text</p>
              {row.transcriptStatus === "PROCESSING" ? (
                <p className="mt-1 text-sm text-gray-500">Converting audio to text…</p>
              ) : null}
              {row.transcript?.trim() ? (
                <div className="mt-1 max-h-56 overflow-y-auto pr-1">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">
                    {row.transcript}
                  </p>
                </div>
              ) : row.transcriptStatus === "PROCESSING" ? null : (
                <p className="mt-1 text-sm text-gray-500">
                  {row.transcriptStatus === "PROCESSING" || row.transcriptStatus === "PENDING"
                    ? "Converting audio to text…"
                    : row.transcriptStatus === "FAILED"
                      ? "Could not convert this recording."
                      : row.chunkCount > 0
                        ? "No speech detected."
                        : "No recording yet."}
                </p>
              )}
            </div>
          ))}
          {sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No check-in sessions for this date.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
