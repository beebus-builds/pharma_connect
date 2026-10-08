"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, appToast as toast } from "@/components/Providers";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  BadgeCheck,
  Settings,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge, VerifiedBadge, Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Feedback";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import GoogleMapView from "@/components/GoogleMapView";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface Profile {
  name: string;
  email: string;
  role: "PATIENT" | "PHARMACY" | "ADMIN";
  pharmacy?: {
    name?: string;
    phone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    verified?: boolean;
    licenseNumber?: string | null;
  };
}

const ROLE_LABEL: Record<string, MessageKey> = {
  PATIENT: "profile.rolePatient",
  PHARMACY: "profile.rolePharmacy",
  ADMIN: "profile.roleAdmin",
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("profile.loadFailed"));
        setProfile(data.user);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setLoadError(e instanceof Error ? e.message : t("profile.loadFailed"));
      } finally {
        setLoadingProfile(false);
      }
    }
    void loadProfile();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (status === "loading" || !session) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">{t("common.loading")}</span>
      </Container>
    );
  }

  // Falls back to the session while /api/user/profile is still in flight, so the
  // page never renders a hole in the middle of the layout.
  const user: Profile = profile ?? {
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };
  const isPharmacy = user.role === "PHARMACY";
  const hasPin =
    typeof user.pharmacy?.latitude === "number" && typeof user.pharmacy?.longitude === "number";

  return (
    <Container className="max-w-4xl py-8 sm:py-10">
      <SectionHeading
        eyebrow={t("profile.eyebrow")}
        title={t("profile.title")}
        description={t("profile.subtitle")}
        className="mb-7"
        action={
          <Link href="/settings" className={buttonClasses({ variant: "secondary" })}>
            <Settings className="h-4 w-4" aria-hidden="true" />
            {t("nav.settings")}
          </Link>
        }
      />

      {loadError && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {t("profile.loadFailed")} — {loadError}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Identity card */}
        <Card className="flex flex-col items-center p-7 text-center">
          <Avatar name={user.name} size="xl" />
          <h2 className="mt-4 font-display text-xl font-semibold text-fg text-balance">{user.name}</h2>
          <p className="mt-0.5 truncate text-sm text-fg-muted">{user.email}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge tone={isPharmacy ? "accent" : "neutral"} icon={isPharmacy ? Building2 : User}>
              {t(ROLE_LABEL[user.role] ?? "profile.rolePatient")}
            </Badge>
            {user.pharmacy?.verified && <VerifiedBadge />}
          </div>

          <Link
            href="/settings"
            className={buttonClasses({ variant: "ghost", size: "sm", className: "mt-5" })}
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            {t("profile.editDetails")}
          </Link>
        </Card>

        {/* Detail panels */}
        <div className="space-y-5 md:col-span-2">
          <Card className="p-5 sm:p-6">
            <PanelTitle icon={ShieldCheck} title={t("profile.accountDetails")} />
            {loadingProfile && !profile ? (
              <div className="mt-5">
                <CardSkeleton count={1} />
              </div>
            ) : (
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <DetailRow icon={<User className="h-4 w-4" />} label={t("auth.fullName")} value={user.name} />
                <DetailRow icon={<Mail className="h-4 w-4" />} label={t("auth.email")} value={user.email} />
                <DetailRow
                  icon={<BadgeCheck className="h-4 w-4" />}
                  label={t("profile.role")}
                  value={t(ROLE_LABEL[user.role] ?? "profile.rolePatient")}
                />
              </dl>
            )}
          </Card>

          {isPharmacy && (
            <Card className="p-5 sm:p-6">
              <PanelTitle
                icon={Building2}
                title={t("profile.pharmacyInfo")}
                action={user.pharmacy?.verified ? <VerifiedBadge /> : null}
              />
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <DetailRow
                  icon={<Building2 className="h-4 w-4" />}
                  label={t("auth.pharmacyName")}
                  value={user.pharmacy?.name}
                />
                <DetailRow
                  icon={<Phone className="h-4 w-4" />}
                  label={t("auth.phone")}
                  value={user.pharmacy?.phone}
                />
                <DetailRow
                  icon={<MapPin className="h-4 w-4" />}
                  label={t("auth.address")}
                  value={user.pharmacy?.address}
                  className="sm:col-span-2"
                />
              </dl>

              {hasPin && (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
                    {t("profile.pinnedLocation")}
                  </p>
                  <GoogleMapView
                    lat={user.pharmacy!.latitude!}
                    lng={user.pharmacy!.longitude!}
                    name={user.pharmacy?.name ?? t("auth.pharmacyName")}
                  />
                  <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
                    {t("profile.pinNote")}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}

function PanelTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof ShieldCheck;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 font-display text-base font-semibold text-fg">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}

/**
 * Read-only value with a caption.
 *
 * Uses `<dt>`/`<dd>` rather than `<label>`: a label annotates a form control, and
 * pointing one at a static `<div>` is what made this confuse screen readers.
 */
function DetailRow({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <div className={className}>
      <dt className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="truncate rounded-xl border border-line bg-surface-sunken px-3.5 py-2.5 text-sm font-medium text-fg">
        {value || <span className="text-fg-subtle">{t("profile.notAvailable")}</span>}
      </dd>
    </div>
  );
}
