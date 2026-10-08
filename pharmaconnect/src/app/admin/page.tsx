"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { Building2, Pill, Users, ShieldAlert, ArrowRight, Flag, LayoutDashboard, Loader2 } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonClasses } from "@/components/ui/Button";
import { useLocale } from "@/components/LocaleProvider";
import { cn } from "@/lib/utils";

interface AdminStats {
  pharmacyCount: number;
  medicineCount: number;
  userCount: number;
  pendingVerification?: number;
  openReports?: number;
}

const DESTINATIONS = [
  {
    titleKey: "admin.navPharmacies",
    bodyKey: "admin.navPharmaciesBody",
    href: "/admin/pharmacies",
    icon: Building2,
    iconClass: "bg-accent-soft text-accent",
  },
  {
    titleKey: "admin.navReports",
    bodyKey: "admin.navReportsBody",
    href: "/admin/reports",
    icon: Flag,
    iconClass: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  },
  {
    titleKey: "admin.navMedicines",
    bodyKey: "admin.navMedicinesBody",
    href: "/admin/medicines",
    icon: Pill,
    iconClass: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  },
] as const;

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [failed, setFailed] = useState(false);

  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !isAdmin) router.replace("/");
  }, [status, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats", { signal: controller.signal });
        if (!res.ok) throw new Error("stats");
        setStats(await res.json());
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        // Surfaced: previously this only hit the console, so the dashboard
        // rendered "..." forever with no indication anything was wrong.
        setFailed(true);
      }
    }
    void fetchStats();
    return () => controller.abort();
  }, [isAdmin]);

  if (status === "loading" || !session) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">{t("common.loading")}</span>
      </Container>
    );
  }

  const pendingIssues = (stats?.pendingVerification ?? 0) + (stats?.openReports ?? 0);

  const tiles = [
    { label: t("admin.totalPharmacies"), value: stats?.pharmacyCount, icon: Building2, tone: "accent" as const },
    { label: t("admin.totalMedicines"), value: stats?.medicineCount, icon: Pill, tone: "neutral" as const },
    { label: t("admin.activeUsers"), value: stats?.userCount, icon: Users, tone: "neutral" as const },
    { label: t("admin.pendingIssues"), value: stats ? pendingIssues : undefined, icon: ShieldAlert, tone: pendingIssues > 0 ? ("critical" as const) : ("neutral" as const) },
  ];

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow={t("admin.eyebrow")}
        title={t("admin.title")}
        description={t("admin.subtitle")}
        className="mb-7"
        action={
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          </span>
        }
      />

      {failed && (
        <p role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {t("admin.statsFailed")}
        </p>
      )}

      <div className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {tiles.map(({ label, value, icon, tone }) => (
          <StatTile
            key={label}
            icon={icon}
            label={label}
            // `undefined` renders the em-dash placeholder rather than a literal
            // "..." that read like real data.
            value={value ?? "—"}
            tone={tone}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {DESTINATIONS.map(({ titleKey, bodyKey, href, icon: Icon, iconClass }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card transition-[box-shadow,border-color] duration-200 hover:border-line-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ease-spring group-hover:scale-105 motion-reduce:transition-none",
                  iconClass
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold text-fg">
                  {t(titleKey)}
                </h3>
                <p className="text-sm text-fg-muted">{t(bodyKey)}</p>
              </div>
            </div>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      <Card variant="muted" className="mt-6 p-4">
        <p className="text-xs leading-relaxed text-fg-muted">
          {t("admin.auditNote")}{" "}
          <Link href="/admin/reports" className="rounded font-semibold text-accent hover:underline">
            {t("admin.reviewQueue")}
          </Link>
          .
        </p>
      </Card>
    </Container>
  );
}
