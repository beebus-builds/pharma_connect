"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, appToast as toast } from "@/components/Providers";
import { MessageCircle, Search, Loader2 } from "lucide-react";
import ChatInbox, { type InboxItem } from "@/components/chat/ChatInbox";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useLocale } from "@/components/LocaleProvider";

export default function ChatInboxPage() {
  const { status } = useSession();
  const { t } = useLocale();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/conversations", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("chat.loadFailed"));
        setInbox(data.conversations ?? []);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        // Surfaced: `catch {}` made a failed load indistinguishable from an
        // empty inbox, so people thought their messages had been lost.
        setError(e instanceof Error ? e.message : t("chat.loadFailed"));
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "loading" || (loading && status === "authenticated")) {
    return (
      <Container className="py-8">
        <span className="sr-only">{t("common.loading")}</span>
        <div className="skeleton mb-6 h-8 w-40" aria-hidden="true" />
        <CardSkeleton count={4} />
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
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow={t("chat.eyebrow")}
        title={t("chat.title")}
        description={t("chat.subtitle")}
        className="mb-6"
      />

      {error && (
        <EmptyState
          tone="error"
          icon={MessageCircle}
          title={t("chat.loadFailed")}
          body={error}
          action={<Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>}
        />
      )}

      {!error && inbox.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title={t("chat.emptyTitle")}
          body={t("chat.emptyBody")}
          action={
            <Link href="/" className={buttonClasses()}>
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("patient.findMedicines")}
            </Link>
          }
        />
      )}

      {!error && inbox.length > 0 && <ChatInbox items={inbox} />}
    </Container>
  );
}
