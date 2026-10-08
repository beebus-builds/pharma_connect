"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Wifi, WifiOff, RefreshCw, CornerDownLeft, CheckCheck } from "lucide-react";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useSession, appToast as toast } from "@/components/Providers";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/LocaleProvider";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 2000;

export default function ChatWindow({
  requestId,
  conversationId,
}: {
  requestId?: string;
  conversationId?: string;
}) {
  const { data: session } = useSession();
  const { t, locale } = useLocale();
  const { messages, connected, polling, typingUser, send, sendTyping, markRead } = useChatSocket(
    requestId,
    conversationId
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, typingUser]);

  useEffect(() => {
    markRead();
  }, [messages.length, markRead]);

  useEffect(() => () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    // Optimistic: clear the field, restore it if the send fails.
    setInput("");
    sendTyping(false);
    try {
      await send(text);
    } catch (e: unknown) {
      setInput(text);
      toast.error(e instanceof Error ? e.message : t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleInput = (v: string) => {
    setInput(v.slice(0, MAX_LENGTH));
    sendTyping(v.length > 0);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(false), 1500);
  };

  const timeTag = locale === "ne" ? "ne-NP" : undefined;

  return (
    <div className="flex h-[min(70dvh,640px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {/* Connection state — the difference between realtime and polling is worth
          showing; it sets expectations for how fast a reply will arrive. */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-sunken px-4 py-2.5">
        <p
          className="flex items-center gap-1.5 text-xs font-medium"
          aria-live="polite"
        >
          {connected ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              <Wifi className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {t("chat.connected")}
            </span>
          ) : polling ? (
            <span className="text-fg-muted">
              <RefreshCw className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {t("chat.polling")}
            </span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400">
              <WifiOff className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {t("chat.connecting")}
            </span>
          )}
        </p>
        <span className="tabular shrink-0 text-xs text-fg-subtle">
          {t("chat.messageCount", { count: messages.length })}
        </span>
      </div>

      {/* Transcript */}
      <div
        ref={listRef}
        className="custom-scrollbar flex-1 space-y-2.5 overflow-y-auto bg-canvas p-4"
        role="log"
        aria-live="polite"
        aria-label={t("chat.transcript")}
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Send className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-fg">{t("chat.emptyTitle")}</p>
              <p className="mt-1 max-w-[32ch] text-xs text-fg-muted">{t("chat.emptyHint")}</p>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.senderId === session?.user?.id;
          return (
            <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-xs sm:px-4 sm:py-2.5",
                  isMe
                    ? "rounded-br-md bg-accent text-accent-fg"
                    : "rounded-bl-md border border-line bg-surface text-fg"
                )}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                <p
                  className={cn(
                    "tabular mt-1 flex items-center gap-1 text-[10px]",
                    isMe ? "justify-end text-accent-fg/70" : "text-fg-subtle"
                  )}
                >
                  {new Date(m.createdAt).toLocaleTimeString(timeTag, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMe && m.readAt && (
                    <>
                      <CheckCheck className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">{t("chat.read")}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        })}

        {typingUser && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 text-xs text-fg-muted"
              aria-live="polite"
            >
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-subtle [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-subtle [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-subtle" />
              </span>
              {typingUser} {t("chat.typing")}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-surface px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={t("chat.placeholder")}
            maxLength={MAX_LENGTH}
            enterKeyHint="send"
            aria-label={t("chat.placeholder")}
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm text-fg transition-[box-shadow,border-color] duration-200 placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
          />
          <Button type="submit" disabled={!input.trim() || sending} className="shrink-0 px-4">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{t("chat.send")}</span>
            <CornerDownLeft className="hidden h-3.5 w-3.5 opacity-70 sm:block" aria-hidden="true" />
          </Button>
        </form>
        <p className="tabular mt-1.5 px-1 text-[10px] text-fg-subtle">
          {t("chat.enterToSend")} · {input.length}/{MAX_LENGTH}
        </p>
      </div>
    </div>
  );
}
