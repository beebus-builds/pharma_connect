"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Phone, ArrowRight, Crown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useLocale } from "@/components/LocaleProvider";
import type { DirectoryEntry } from "@/lib/directory";

/**
 * Client-side searchable list of verified pharmacies.
 *
 * The verified set is already fetched on the server and passed in, so this only
 * filters client-side — no extra round-trips, and it stays indexable because the
 * full list is server-rendered first.
 */
export function PharmacyDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      `${entry.name} ${entry.address} ${entry.cityName}`.toLowerCase().includes(needle)
    );
  }, [query, entries]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          hideLabel
          label={t("dir.searchPlaceholder")}
          leading={<Search />}
          placeholder={t("dir.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <p className="tabular text-sm text-fg-muted" aria-live="polite">
          {t("dir.resultCount", { count: filtered.length })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-semibold text-fg">{t("dir.emptyTitle")}</p>
          <p className="mt-1 text-sm text-fg-muted">{t("dir.emptyBody")}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry, i) => (
            <Reveal key={entry.id} delay={Math.min(i, 8) * 0.05} className="h-full">
              <Card as="article" className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-fg text-balance">
                    {entry.name}
                  </h3>
                  {entry.plan === "FEATURED" && (
                    <Badge tone="accent" icon={Crown} className="shrink-0">
                      {t("dir.planFeatured")}
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {entry.verified && <VerifiedBadge />}
                  {entry.cityName && <Badge tone="neutral">{entry.cityName}</Badge>}
                </div>

                <p className="mt-3 flex items-start gap-1.5 text-sm leading-relaxed text-fg-muted">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                  <span className="line-clamp-2">{entry.address}</span>
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={`/pharmacies/${entry.id}`} className={buttonClasses({ size: "sm" })}>
                    {t("dir.viewStorefront")}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  {entry.phone && (
                    <a
                      href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`}
                      className={buttonClasses({ size: "sm", variant: "secondary" })}
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("dir.call")}
                    </a>
                  )}
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${entry.lat},${entry.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 self-start rounded text-xs font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  {t("dir.directions")}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
