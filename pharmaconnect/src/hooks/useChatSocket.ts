"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/components/Providers";

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:3001";

/** Polling cadence when no websocket is available. */
const POLL_INTERVAL_MS = 4000;

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  sender: { id: string; name: string };
}

export function useChatSocket(requestId?: string, conversationId?: string) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId || null);
  /** True when the socket could not be used and HTTP polling is carrying the thread. */
  const [polling, setPolling] = useState(false);

  const getToken = useCallback(async () => {
    // Use NextAuth session token via API - simplest: fetch /api/auth/token
    try {
      const res = await fetch("/api/auth/token");
      if (res.ok) {
        const data = await res.json();
        return data.token as string;
      }
    } catch {}
    return null;
  }, []);

  /** Merges a server page of messages into state, newest last, de-duplicated by id. */
  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      if (added.length === 0) return prev;
      return [...prev, ...added].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  const fetchViaHttp = useCallback(
    async (since?: string) => {
      if (!requestId) return [] as ChatMessage[];
      const params = new URLSearchParams({ limit: "50" });
      const res = await fetch(`/api/requests/${requestId}/messages?${params.toString()}`);
      if (!res.ok) return [] as ChatMessage[];
      const data = await res.json();
      return (data.messages ?? []) as ChatMessage[];
    },
    [requestId]
  );

  // HTTP polling: loads history immediately, then re-polls until a socket wins.
  // This is what keeps chat usable when the realtime service is not deployed.
  useEffect(() => {
    if (!session || !requestId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let knownIds = new Set<string>();

    async function poll() {
      if (cancelled) return;
      try {
        const batch = await fetchViaHttp();
        if (cancelled) return;
        if (!socketRef.current?.connected) {
          // First pass seeds the thread; later passes only append what is new.
          const fresh = knownIds.size === 0 ? batch : batch.filter((m) => !knownIds.has(m.id));
          knownIds = new Set(batch.map((m) => m.id));
          merge(batch);
          if (fresh.length > 0) setConnected(true);
        }
      } catch {
        // Network hiccup: retry on the next tick.
      }
      if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      setPolling(false);
    };
  }, [session, requestId, fetchViaHttp, merge]);

  useEffect(() => {
    if (!session || (!requestId && !conversationId)) return;

    let socket: Socket | null = null;
    let mounted = true;

    async function connect() {
      const token = await getToken();
      if (!token || !mounted) return;

      socket = io(REALTIME_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        // Don't queue sends while the socket is down; HTTP fallback handles them.
        timeout: 4000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        setPolling(false);
        socket!.emit("join", { requestId, conversationId });
      });
      socket.on("connect_error", () => {
        // Realtime service unreachable — polling already seeded the thread.
        setConnected(false);
        setPolling(true);
      });
      socket.on("disconnect", () => {
        setConnected(false);
        setPolling(true);
      });
      socket.on("joined", ({ conversationId: cid }: { conversationId: string }) => {
        setActiveConversationId(cid);
      });
      socket.on("history", (msgs: ChatMessage[]) => {
        setMessages(msgs);
      });
      socket.on("new_message", (msg: ChatMessage) => {
        merge([msg]);
      });
      socket.on("typing", ({ name, isTyping }: { name: string; isTyping: boolean }) => {
        setTypingUser(isTyping ? name : null);
        if (isTyping) setTimeout(() => setTypingUser(null), 3000);
      });
      socket.on("error", (e: any) => {
        console.error("[chat] error", e);
      });
    }

    connect();

    return () => {
      mounted = false;
      if (socket) {
        if (activeConversationId) socket.emit("leave", { conversationId: activeConversationId });
        socket.disconnect();
      }
      socketRef.current = null;
      setConnected(false);
    };
  }, [session, requestId, conversationId, getToken, merge]);

  const sendViaHttp = useCallback(
    async (content: string) => {
      if (!requestId) throw new Error("No conversation");

      const res = await fetch(`/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      const message = data.message as ChatMessage;
      merge([message]);
      return message;
    },
    [requestId, merge]
  );

  const send = useCallback(
    async (content: string) => {
      const socket = socketRef.current;
      if (!socket?.connected || !activeConversationId) return sendViaHttp(content);

      return new Promise<ChatMessage>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Message send timed out")), 10000);
        socket.emit("send", { conversationId: activeConversationId, content }, (res: any) => {
          clearTimeout(timeout);
          if (res?.ok) resolve(res.message);
          else reject(new Error(res?.error || "Failed to send"));
        });
      });
    },
    [activeConversationId, sendViaHttp]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeConversationId || !socketRef.current) return;
      socketRef.current.emit("typing", { conversationId: activeConversationId, isTyping });
    },
    [activeConversationId]
  );

  const markRead = useCallback(() => {
    if (!activeConversationId || !socketRef.current) return;
    socketRef.current.emit("mark_read", { conversationId: activeConversationId });
  }, [activeConversationId]);

  return { messages, connected, polling, typingUser, send, sendTyping, markRead, conversationId: activeConversationId, socket: socketRef.current };
}