"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession, appToast as toast } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flag, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  pharmacy: { id: string; name: string; address: string };
  reporterEmail: string;
}

type Filter = "OPEN" | "RESOLVED" | "DISMISSED" | "ALL";

/** Reason enum → message key, so the queue reads the same in both locales. */
const REASON_KEYS: Record<string, MessageKey> = {
  WRONG_STOCK: "report.reasonWrongStock",
  CLOSED: "report.reasonClosed",
  WRONG_LOCATION: "report.reasonWrongLocation",
  FAKE_LISTING: "report.reasonFake",
  OTHER: "report.reasonOther",
};

const FILTERS: { value: Filter; labelKey: MessageKey }[] = [
  { value: "OPEN", labelKey: "admin.filterOpen" },
  { value: "RESOLVED", labelKey: "admin.filterResolved" },
  { value: "DISMISSED", labelKey: "admin.filterDismissed" },
  { value: "ALL", labelKey: "admin.all" },
];

const STATUS_TONE: Record<string, "danger" | "success" | "neutral"> = {
  OPEN: "danger",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [items, setItems] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Tracked per action, not per row: Dismiss and Resolve used to share one
  // `actingId`, so clicking either spinner-ed both buttons.
  const [acting, setActing] = useState<{ id: string; next: "RESOLVED" | "DISMISSED" } | null>(null);

  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !isAdmin) router.replace("/");
  }, [status, isAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/reports?status=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      setItems(data.reports ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function setStatus(id: string, reportStatus: "RESOLVED" | "DISMISSED") {
    setActing({ id, next: reportStatus });
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reportStatus }),
      });
      if (!res.ok) throw new Error(t("common.error"));
      toast.success(
        reportStatus === "RESOLVED" ? t("admin.reportResolved") : t("admin.reportDismissed")
      );
      setItems((prev) =>
        filter === "ALL"
          ? prev.map((r) => (r.id === id ? { ...r, status: reportStatus } : r))
          : prev.filter((r) => r.id !== id)
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setActing(null);
    }
  }

  if (status === "loading" || !session) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">{t("common.loading")}</span>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <Link
        href="/admin"
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("admin.backToAdmin")}
      </Link>

      <SectionHeading
        eyebrow={t("admin.eyebrow")}
        title={t("admin.reportsTitle")}
        description={t("admin.reportsBody")}
        className="mb-6"
      />

      <Tabs
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        label={t("admin.reportsTitle")}
        className="mb-6"
      >
        {FILTERS.map(({ value, labelKey }) => (
          <Tab key={value} value={value} active={filter === value} onSelect={(v) => setFilter(v as Filter)}>
            {t(labelKey)}
          </Tab>
        ))}
      </Tabs>

      {loading && <CardSkeleton count={4} />}

      {!loading && loadError && (
        <EmptyState
          tone="error"
          icon={Flag}
          title={t("admin.loadFailed")}
          body={loadError}
          action={<Button onClick={() => void load()}>{t("common.retry")}</Button>}
        />
      )}

      {!loading && !loadError && items.length === 0 && (
        <EmptyState
          icon={Flag}
          title={filter === "OPEN" ? t("admin.queueClear") : t("admin.noneHere")}
          body={filter === "OPEN" ? t("admin.queueClearBody") : undefined}
        />
      )}

      {!loading && !loadError && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((r, i) => (
            <li
              key={r.id}
              className="animate-rise rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover motion-reduce:animate-none"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">{t(REASON_KEYS[r.reason] ?? "report.reasonOther")}</Badge>
                    <StatusBadge status={r.status} tone={STATUS_TONE[r.status] ?? "neutral"} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-fg">
                    {r.pharmacy.name}
                    <span className="font-normal text-fg-muted"> · {r.pharmacy.address}</span>
                  </p>
                  {r.details && (
                    <p className="mt-2 border-l-2 border-line pl-3 text-sm italic leading-relaxed text-fg-muted">
                      “{r.details}”
                    </p>
                  )}
                  <p className="tabular mt-2 inline-flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {new Date(r.createdAt).toLocaleString(locale === "ne" ? "ne-NP" : "en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <span>·</span>
                    {t("admin.reportedBy", { email: r.reporterEmail })}
                  </p>
                </div>

                {r.status === "OPEN" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={acting?.id === r.id && acting.next === "DISMISSED"}
                      onClick={() => void setStatus(r.id, "DISMISSED")}
                    >
                      {t("admin.dismiss")}
                    </Button>
                    <Button
                      size="sm"
                      loading={acting?.id === r.id && acting.next === "RESOLVED"}
                      onClick={() => void setStatus(r.id, "RESOLVED")}
                    >
                      {t("admin.resolve")}
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
