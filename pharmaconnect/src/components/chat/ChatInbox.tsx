"use client";

import Link from "next/link";
import { Clock, MessageCircle, Pill } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

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

export default function ChatInbox({ items, currentRequestId }: { items: InboxItem[]; currentRequestId?: string }) {
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold">No conversations yet</p>
        <p className="text-xs text-slate-500 mt-1">Chats appear here after you send a request.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <Link key={it.id} href={`/chat/${it.requestId}`} className="block">
          <Card
            className={cn(
              "p-4 hover:shadow-md transition-all flex gap-3",
              currentRequestId === it.requestId && "ring-2 ring-primary-500 border-primary-200 dark:border-primary-800"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center shrink-0">
              <Pill className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{it.medicine.genericName}</p>
                {it.unreadCount ? (
                  <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{it.unreadCount}</span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 truncate">{it.pharmacy.name} · {it.patient.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1">
                {it.lastMessage ? it.lastMessage.content : "No messages yet — start chatting"}
              </p>
            </div>
            <div className="text-[10px] text-slate-400 flex flex-col items-end gap-1 shrink-0">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {new Date(it.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
