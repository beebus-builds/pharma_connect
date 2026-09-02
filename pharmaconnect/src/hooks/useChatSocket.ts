"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:3001";

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
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket!.emit("join", { requestId, conversationId });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("joined", ({ conversationId: cid }: { conversationId: string }) => {
        setActiveConversationId(cid);
      });
      socket.on("history", (msgs: ChatMessage[]) => {
        setMessages(msgs);
      });
      socket.on("new_message", (msg: ChatMessage) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
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
  }, [session, requestId, conversationId, getToken]);

  const send = useCallback(
    (content: string) =>
      new Promise<ChatMessage>((resolve, reject) => {
        if (!socketRef.current || !activeConversationId) {
          // Fallback: send via requestId if conversation not yet created
          if (!requestId) return reject(new Error("No conversation"));
          socketRef.current?.emit("send", { requestId, content }, (res: any) => {
            if (res?.ok) resolve(res.message);
            else reject(new Error(res?.error || "Failed to send"));
          });
          return;
        }
        socketRef.current.emit("send", { conversationId: activeConversationId, content }, (res: any) => {
          if (res?.ok) resolve(res.message);
          else reject(new Error(res?.error || "Failed to send"));
        });
      }),
    [activeConversationId, requestId]
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

  return { messages, connected, typingUser, send, sendTyping, markRead, conversationId: activeConversationId, socket: socketRef.current };
}
