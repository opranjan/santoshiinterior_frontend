"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tokenStorage } from "@/lib/auth";
import type { VendorChatMessageDto } from "@/services/crmApi";

export type VendorChatTypingEvent = {
  threadUserId: string;
  userId: string;
  name: string;
  typing: boolean;
};

export type VendorChatPresence = {
  online: Record<string, boolean>;
  lastSeen: Record<string, string>;
  staffOnline: boolean;
};

function vendorChatWsUrl(token: string) {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const origin = api.replace(/\/api\/?$/, "");
  const proto = origin.startsWith("https") ? "wss" : "ws";
  const host = origin.replace(/^https?:\/\//, "");
  return `${proto}://${host}/ws/vendor-chat?token=${encodeURIComponent(token)}`;
}

type Options = {
  enabled?: boolean;
  /** CRM staff: currently open vendor thread. Vendors omit this. */
  threadUserId?: string | null;
  onMessage: (message: VendorChatMessageDto) => void;
  onTyping?: (event: VendorChatTypingEvent) => void;
};

export function useVendorChatSocket({
  enabled = true,
  threadUserId,
  onMessage,
  onTyping,
}: Options) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onTypingRef = useRef(onTyping);
  onTypingRef.current = onTyping;
  const socketRef = useRef<WebSocket | null>(null);
  const threadRef = useRef(threadUserId);
  threadRef.current = threadUserId;
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<VendorChatPresence>({
    online: {},
    lastSeen: {},
    staffOnline: false,
  });

  const sendTyping = useCallback((typing: boolean) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "typing",
        typing,
        threadUserId: threadRef.current || undefined,
      })
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    let closed = false;
    let pingTimer: number | undefined;
    let retryTimer: number | undefined;
    let attempt = 0;

    const sendJoin = (socket: WebSocket) => {
      const id = threadRef.current;
      if (!id || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: "join", threadUserId: id }));
    };

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(vendorChatWsUrl(token));
      socketRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
        sendJoin(ws);
        pingTimer = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as {
            type?: string;
            message?: VendorChatMessageDto;
            threadUserId?: string;
            userId?: string;
            name?: string;
            typing?: boolean;
            online?: string[];
            lastSeen?: Record<string, string>;
            staffOnline?: boolean;
          };
          if (data.type === "message" && data.message?.id) {
            onMessageRef.current(data.message);
            return;
          }
          if (data.type === "typing" && data.userId && data.threadUserId) {
            onTypingRef.current?.({
              threadUserId: data.threadUserId,
              userId: data.userId,
              name: data.name || "Someone",
              typing: Boolean(data.typing),
            });
            return;
          }
          if (data.type === "presence") {
            const nextOnline: Record<string, boolean> = {};
            (data.online || []).forEach((id) => {
              nextOnline[id] = true;
            });
            setPresence({
              online: nextOnline,
              lastSeen: data.lastSeen || {},
              staffOnline: Boolean(data.staffOnline),
            });
          }
        } catch {
          /* ignore non-json */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (socketRef.current === ws) socketRef.current = null;
        if (pingTimer) window.clearInterval(pingTimer);
        pingTimer = undefined;
        if (closed) return;
        const delay = Math.min(8000, 500 * 2 ** attempt);
        attempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      setConnected(false);
      if (pingTimer) window.clearInterval(pingTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !threadUserId) return;
    ws.send(JSON.stringify({ type: "join", threadUserId }));
  }, [threadUserId]);

  return { sendTyping, connected, presence };
}

export function useVendorChatTypers(selfId?: string | null) {
  const [typers, setTypers] = useState<
    Array<{ threadUserId: string; userId: string; name: string; at: number }>
  >([]);

  const applyTyping = useCallback(
    (event: VendorChatTypingEvent) => {
      if (selfId && event.userId === selfId) return;
      setTypers((prev) => {
        const without = prev.filter(
          (row) => !(row.threadUserId === event.threadUserId && row.userId === event.userId)
        );
        if (!event.typing) return without;
        return [...without, { threadUserId: event.threadUserId, userId: event.userId, name: event.name, at: Date.now() }];
      });
    },
    [selfId]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 3500;
      setTypers((prev) => {
        const next = prev.filter((row) => row.at >= cutoff);
        return next.length === prev.length ? prev : next;
      });
    }, 800);
    return () => window.clearInterval(timer);
  }, []);

  return { typers, applyTyping };
}
