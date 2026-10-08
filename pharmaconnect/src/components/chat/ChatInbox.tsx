"use client";

import Link from "next/link";
import { Clock, Pill, MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";

export interface InboxItem {
  id: string;
  requestId: string;
  patient: { id: string; name: string };
  pharmacy: { id: string; name: string };
  medicine: { genericName: string; brandName: string };
  updatedAt: string;
  lastMessage?: { content: string; createdAt: string; senderId: string } | null;
  unreadCount?: number;
}

export default function ChatInbox({
  items,
  currentRequestId,
  onOpen,
}: {
  items: InboxItem[];
  currentRequestId?: string;
  /** Called after a row is activated — used by the mobile pane switcher. */
  onOpen?: () => void;
}) {
  const { t, locale } = useLocale();

  if (items.length === 0) {
    return (
      <EmptyState icon={MessageCircle} title={t("chat.emptyTitle")} body={t("chat.emptyBody")} />
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((it) => {
        const active = currentRequestId === it.requestId;
        const unread = (it.unreadCount ?? 0) > 0;
        return (
          <li key={it.id}>
            <Link
              href={`/chat/${it.requestId}`}
              onClick={onOpen}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-3.5 transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                active
                  ? "border-accent/30 bg-accent-soft shadow-card"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-sunken"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  unread ? "bg-accent text-accent-fg" : "bg-surface-sunken text-fg-muted"
                )}
                aria-hidden="true"
              >
                <Pill className="h-4.5 w-4.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-sm text-fg",
                      unread ? "font-bold" : "font-semibold"
                    )}
                  >
                    {it.medicine.genericName}
                  </span>
                  {unread && (
                    <span className="tabular shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg">
                      {it.unreadCount}
                      <span className="sr-only"> {t("chat.unread")}</span>
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-fg-muted">
                  {it.pharmacy.name} · {it.patient.name}
                </span>
                <span
                  className={cn(
                    "mt-1 block truncate text-xs",
                    unread ? "font-medium text-fg" : "text-fg-subtle"
                  )}
                >
                  {it.lastMessage?.content ?? t("chat.noMessagesYet")}
                </span>
              </span>

              <span
                className="tabular flex shrink-0 items-center gap-1 text-[10px] text-fg-subtle"
                title={new Date(it.updatedAt).toLocaleString(locale === "ne" ? "ne-NP" : "en-US")}
              >
                <Clock className="h-3 w-3" aria-hidden="true" />
                {formatRelativeTime(it.updatedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
