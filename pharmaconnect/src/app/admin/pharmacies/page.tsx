"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession, appToast as toast } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Building2, Loader2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VerifiedBadge, Badge } from "@/components/ui/Badge";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocale } from "@/components/LocaleProvider";

interface AdminPharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  licenseNumber: string | null;
  latitude: number;
  longitude: number;
  verified: boolean;
  openReports: number;
  createdAt: string;
}

type Filter = "pending" | "verified" | "all";

const FILTERS: { value: Filter; labelKey: "admin.pending" | "admin.verified" | "admin.all" }[] = [
  { value: "pending", labelKey: "admin.pending" },
  { value: "verified", labelKey: "admin.verified" },
  { value: "all", labelKey: "admin.all" },
];

export default function AdminPharmaciesPage() {
  const { data: session, status } = useSession();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !isAdmin) router.replace("/");
  }, [status, isAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/pharmacies?status=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pharmacies");
      setItems(data.pharmacies ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load pharmacies");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function setVerified(id: string, verified: boolean) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/pharmacies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      toast.success(verified ? t("admin.verifiedToast") : t("admin.unverifiedToast"));
      setItems((prev) =>
        filter === "all"
          ? prev.map((p) => (p.id === id ? { ...p, verified } : p))
          : prev.filter((p) => p.id !== id)
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setActingId(null);
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
        title={t("admin.pharmaciesTitle")}
        description={t("admin.pharmaciesBody")}
        className="mb-6"
      />

      <Tabs
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        label={t("admin.pharmaciesTitle")}
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
          icon={Building2}
          title={t("admin.loadFailed")}
          body={loadError}
          action={<Button onClick={() => void load()}>{t("common.retry")}</Button>}
        />
      )}

      {!loading && !loadError && items.length === 0 && (
        <EmptyState
          icon={Building2}
          title={t("admin.queueClear")}
          body={filter === "pending" ? t("admin.queueClearBody") : t("admin.noneHere")}
        />
      )}

      {!loading && !loadError && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((p, i) => (
            <li
              key={p.id}
              className="animate-rise rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover motion-reduce:animate-none"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold text-fg">{p.name}</h2>
                    {p.verified && <VerifiedBadge />}
                    {p.openReports > 0 && (
                      <Badge tone="danger">
                        {t("admin.openReports", { count: p.openReports })}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">
                    {p.address} · {p.phone} · {p.email}
                  </p>
                  <p className="tabular mt-1 text-xs text-fg-subtle">
                    {t("admin.license")}: {p.licenseNumber ?? "—"} ·{" "}
                    {t("admin.pin")}: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)} ·{" "}
                    {t("admin.joined")}{" "}
                    {new Date(p.createdAt).toLocaleDateString(locale === "ne" ? "ne-NP" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <a
                    href={`https://www.google.com/maps/?q=${p.latitude},${p.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                  >
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {t("admin.inspectPin")}
                  </a>
                </div>
                <Button
                  size="sm"
                  variant={p.verified ? "secondary" : "primary"}
                  loading={actingId === p.id}
                  onClick={() => void setVerified(p.id, !p.verified)}
                  aria-label={
                    p.verified
                      ? t("admin.unverifyAria", { name: p.name })
                      : t("admin.verifyAria", { name: p.name })
                  }
                >
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {p.verified ? t("admin.unverify") : t("admin.verify")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
