"use client";

import React, { useEffect, useRef, useState } from "react";
import { casualApi, type CasualMessage } from "@/services/crmApi";

export default function CasualStaffMessagesPage() {
  const [items, setItems] = useState<CasualMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await casualApi.listMessages();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      const saved = await casualApi.sendMessage({ body: body.trim() });
      setItems((prev) => [...prev, saved]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">Casual › Messages</p>
      <h1 className="mt-1 font-serif text-[1.75rem] text-[#1c1610]" style={{ fontFamily: "Georgia, serif" }}>
        Messages
      </h1>
      <p className="mt-1 text-sm text-[#8a7b68]">Chat with your manager about today’s work.</p>

      <div className="casual-messages mt-5 flex h-[min(620px,70vh)] flex-col overflow-hidden rounded-[22px] border border-[#eadfcf] bg-[#fffdf9] shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? <p className="text-sm text-[#8a7b68]">Loading…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8a7b68]">No messages yet. Send one below.</p>
          ) : null}
          {items.map((row) => (
            <div key={row.id} className={`flex ${row.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-[18px] px-3 py-2 text-sm ${
                  row.mine ? "casual-msg-mine !bg-[#9a7348] !text-white" : "casual-msg-other !bg-[#efe4d2] !text-[#2a2118]"
                }`}
              >
                <p>{row.body}</p>
                <p className="casual-msg-meta mt-1 text-[10px]">
                  {new Date(row.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 border-t border-[#eadfcf] p-3">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="Type your message here…"
            className="h-11 flex-1 rounded-xl border border-[#eadfcf] px-3 text-sm outline-none focus:border-[#c4a574]"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending}
            className="h-11 rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
