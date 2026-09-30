"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/Providers";
import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import ChatInbox, { InboxItem } from "@/components/chat/ChatInbox";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ChatInboxPage() {
  const { status } = useSession();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        setInbox(data.conversations ?? []);
      } catch {}
      finally { setLoading(false); }
    }
    if (status === "authenticated") load();
    else if (status === "unauthenticated") setLoading(false);
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-3">
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Sign in to view messages</h1>
        <p className="text-sm text-slate-500 mb-6">Patient–pharmacist chat requires authentication.</p>
        <Link href="/login"><Button>Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">Inbox</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary-600" /> Messages
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All your pharmacist–buyer conversations. Realtime via Socket.io + Redis.</p>
      </div>

      {inbox.length === 0 ? (
        <Card className="p-12 text-center border-dashed !border-2">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-500/10 ring-1 ring-inset ring-primary-600/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="font-bold mb-1">No chats yet</h3>
          <p className="text-sm text-slate-500 mb-6">Send a request from the homepage to start a conversation.</p>
          <Link href="/"><Button className="rounded-full"><Search className="h-4 w-4" /> Find medicines</Button></Link>
        </Card>
      ) : (
        <ChatInbox items={inbox} />
      )}
    </div>
  );
}
