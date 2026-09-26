"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Wifi, WifiOff } from "lucide-react";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useSession } from "@/components/Providers";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function ChatWindow({ requestId, conversationId }: { requestId?: string; conversationId?: string }) {
  const { data: session } = useSession();
  const { messages, connected, typingUser, send, sendTyping, markRead } = useChatSocket(requestId, conversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, typingUser]);

  useEffect(() => {
    markRead();
  }, [messages.length, markRead]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    // optimistic: keep input cleared
    setInput("");
    sendTyping(false);
    try {
      await send(text);
    } catch (e: any) {
      // restore input on failure
      setInput(text);
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleInput = (v: string) => {
    setInput(v);
    sendTyping(v.length > 0);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(false), 1500);
  };

  return (
    <div className="flex flex-col h-[600px] sm:h-[650px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur">
        <div>
          <p className="text-sm font-bold">Chat</p>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-500" /> Connected · realtime
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-amber-500" /> Connecting…
              </>
            )}
          </p>
        </div>
        <span className="text-xs text-slate-400">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Send className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold">No messages yet</p>
              <p className="text-xs text-slate-500 mt-1">Start the conversation — pharmacist will reply here.</p>
            </div>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === session?.user?.id;
          return (
            <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  isMe
                    ? "bg-primary-600 text-white rounded-br-md"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-md"
                )}
              >
                <p className="leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                <p className={cn("text-[10px] mt-1 flex items-center gap-1", isMe ? "text-primary-100 justify-end" : "text-slate-400")}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {isMe && m.readAt && <span className="text-primary-200">· Read</span>}
                </p>
              </div>
            </div>
          );
        })}
        {typingUser && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-2.5 text-xs text-slate-500 flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              </span>
              {typingUser} typing…
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            maxLength={2000}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            aria-label="Message input"
          />
          <Button onClick={handleSend} disabled={!input.trim() || sending} className="px-5 rounded-xl shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 px-1">{input.length}/2000</p>
      </div>
    </div>
  );
}
