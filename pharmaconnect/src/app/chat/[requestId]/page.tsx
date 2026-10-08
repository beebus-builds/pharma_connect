"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/components/Providers";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Loader2, PanelRightOpen } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInbox, { type InboxItem } from "@/components/chat/ChatInbox";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/ui/Container";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useLocale } from "@/components/LocaleProvider";

interface ChatRequest {
  id: string;
  status: string;
  medicine?: { genericName: string; brandName: string };
  pharmacy?: { id: string; name: string };
  patient?: { id: string; name: string };
}

export default function ChatPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params.requestId;
  const { status, data: session } = useSession();
  const { t } = useLocale();

  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [request, setRequest] = useState<ChatRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Phones stack the two panes, which means opening a chat buried the thread
  // under the whole conversation list. Tabs keep one pane in view at a time.
  const [mobilePane, setMobilePane] = useState<"list" | "thread">("thread");

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    async function load() {
      try {
        const [convRes, reqRes] = await Promise.all([
          fetch("/api/conversations", { signal: controller.signal }),
          fetch("/api/requests", { signal: controller.signal }),
        ]);
        const conv = await convRes.json();
        const reqs = await reqRes.json();
        setInbox(conv.conversations ?? []);
        const found = (reqs.requests ?? []).find((r: ChatRequest) => r.id === requestId);
        setRequest(found ?? null);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : t("chat.loadFailed"));
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, status]);

  // Back target comes from the session role, not from guessing which side of
  // the request has a `pharmacy` field attached.
  const backHref = session?.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient";

  if (status === "loading" || (loading && status === "authenticated")) {
    return (
      <Container className="py-8">
        <SkeletonBlock label={t("common.loading")}>
          <div className="skeleton h-12 w-full rounded-2xl" />
        </SkeletonBlock>
        <Loader2 className="sr-only" />
      </Container>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center py-16">
        <EmptyState
          icon={MessageCircle}
          title={t("chat.signInTitle")}
          body={t("chat.signInBody")}
          action={
            <Link href="/login" className={buttonClasses()}>
              {t("auth.signIn")}
            </Link>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="py-5 sm:py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={backHref}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          aria-label={t("chat.backToDashboard")}
        >
          <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-fg">
            <MessageCircle className="h-4.5 w-4.5 text-accent" aria-hidden="true" />
            {t("chat.title")}
          </h1>
          {request && (
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              <span className="truncate">
                {request.medicine?.genericName} · {request.pharmacy?.name}
              </span>
              <StatusBadge status={request.status} />
            </p>
          )}
        </div>
        <div className="hidden lg:block">
          <Link href="/chat" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            {t("chat.allConversations")}
          </Link>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* Mobile pane switcher */}
      <div
        className="mb-4 flex rounded-xl border border-line bg-surface p-0.5 lg:hidden"
        role="tablist"
        aria-label={t("chat.paneSwitcher")}
      >
        {(["thread", "list"] as const).map((pane) => (
          <button
            key={pane}
            role="tab"
            type="button"
            aria-selected={mobilePane === pane}
            onClick={() => setMobilePane(pane)}
            className={`flex-1 rounded-[0.625rem] px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
              mobilePane === pane ? "bg-surface-sunken text-fg" : "text-fg-subtle hover:text-fg"
            }`}
          >
            {pane === "thread" ? t("chat.thread") : t("chat.listTab")}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <aside
          className={`lg:col-span-4 ${mobilePane === "list" ? "block" : "hidden lg:block"}`}
          aria-label={t("chat.conversations")}
        >
          <ChatInbox
            items={inbox}
            currentRequestId={requestId}
            onOpen={() => setMobilePane("thread")}
          />
        </aside>

        <div className={`lg:col-span-8 ${mobilePane === "thread" ? "block" : "hidden lg:block"}`}>
          {request ? (
            <ChatWindow requestId={requestId} />
          ) : error ? null : (
            <EmptyState
              icon={MessageCircle}
              title={t("chat.notFound")}
              body={t("chat.selectConversation")}
              action={
                <Link href="/" className={buttonClasses()}>
                  {t("patient.findMedicines")}
                </Link>
              }
            />
          )}
        </div>
      </div>
    </Container>
  );
}
