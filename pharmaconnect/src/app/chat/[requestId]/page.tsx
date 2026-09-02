"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInbox, { InboxItem } from "@/components/chat/ChatInbox";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ChatPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params.requestId;
  const { status } = useSession();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [convRes, reqRes] = await Promise.all([
          fetch("/api/conversations").then((r) => r.json()),
          fetch(`/api/requests`).then((r) => r.json()),
        ]);
        setInbox(convRes.conversations ?? []);
        const found = (reqRes.requests ?? []).find((r: any) => r.id === requestId);
        setRequest(found || null);
      } catch {}
      finally { setLoading(false); }
    }
    if (status === "authenticated") load();
  }, [requestId, status]);

  if (status === "loading" || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Sign in to chat</h1>
        <Link href="/login"><Button>Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link href={request?.pharmacy ? "/dashboard/patient" : "/dashboard/pharmacy"} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary-600" /> Chat
          </h1>
          {request && (
            <p className="text-xs text-slate-500">
              {request.medicine.genericName} · {request.pharmacy.name} · {request.status}
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300">Conversations</h2>
          <ChatInbox items={inbox} currentRequestId={requestId} />
        </div>
        <div className="lg:col-span-8">
          {request ? (
            <ChatWindow requestId={requestId} />
          ) : (
            <Card className="p-12 text-center">
              <MessageCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Select a conversation or send a request from the homepage.</p>
              <Link href="/" className="inline-block mt-4"><Button variant="outline" className="rounded-full">Find medicines</Button></Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
