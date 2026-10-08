"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, TriangleAlert } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { PharmacyDirectory } from "@/components/PharmacyDirectory";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocale } from "@/components/LocaleProvider";
import type { DirectoryEntry } from "@/lib/directory";

export default function CityView({
  cityName,
  entries,
  unavailable,
}: {
  cityName: string;
  entries: DirectoryEntry[];
  unavailable: boolean;
}) {
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        icon={MapPin}
        badge={t("city.badge")}
        title={t("city.title", { name: cityName })}
        subtitle={t("city.subtitle", { name: cityName })}
      />

      <Section>
        <Container wide>
          <Link
            href="/pharmacies"
            className="mb-6 inline-flex items-center gap-1.5 rounded text-sm font-medium text-fg-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("city.backToDirectory")}
          </Link>

          {unavailable ? (
            <EmptyState tone="error" icon={TriangleAlert} title={t("dir.unavailable")} body={t("dir.unavailableBody")} />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title={t("city.notFoundTitle", { name: cityName })}
              body={t("city.notFoundBody")}
              action={
                <Link href="/" className="rounded font-semibold text-accent hover:underline">
                  {t("details.findNow")}
                </Link>
              }
            />
          ) : (
            <PharmacyDirectory entries={entries} />
          )}
        </Container>
      </Section>
    </div>
  );
}
