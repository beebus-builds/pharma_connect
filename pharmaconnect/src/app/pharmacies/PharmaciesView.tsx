"use client";

import Link from "next/link";
import { Store, TriangleAlert } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { PharmacyDirectory } from "@/components/PharmacyDirectory";
import { EmptyState } from "@/components/ui/EmptyState";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/ui/Reveal";
import { useLocale } from "@/components/LocaleProvider";
import type { CityGroup, DirectoryEntry } from "@/lib/directory";

export default function PharmaciesView({
  entries,
  cities,
}: {
  entries: DirectoryEntry[] | null;
  cities: CityGroup[];
}) {
  const { t } = useLocale();

  return (
    <div>
      <PageHero icon={Store} badge={t("dir.badge")} title={t("dir.title")} subtitle={t("dir.subtitle")} />

      <Section>
        <Container wide>
          {entries === null ? (
            <EmptyState
              tone="error"
              className="mt-6"
              icon={TriangleAlert}
              title={t("dir.unavailable")}
              body={t("dir.unavailableBody")}
            />
          ) : entries.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={Store}
              title={t("dir.emptyDirectoryTitle")}
              body={t("dir.emptyDirectoryBody")}
              action={
                <Link href="/medicines" className="mt-2 font-semibold text-accent hover:underline">
                  {t("footer.browseCatalog")}
                </Link>
              }
            />
          ) : (
            <>
              {cities.length > 0 && (
                <Reveal className="mb-8">
                  <h2 className="font-display text-lg font-semibold text-fg">{t("dir.byCityTitle")}</h2>
                  <p className="mt-1 text-sm text-fg-muted">{t("dir.byCitySubtitle")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cities.map((city) => (
                      <Link
                        key={city.slug}
                        href={`/pharmacies/in/${city.slug}`}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                      >
                        {city.name}
                        <span className="tabular text-fg-subtle">· {city.count}</span>
                      </Link>
                    ))}
                  </div>
                </Reveal>
              )}

              <PharmacyDirectory entries={entries} />
            </>
          )}
        </Container>
      </Section>

      <CtaBand
        title={t("about.ctaTitle")}
        body={t("about.ctaBody")}
        primary={{ href: "/", label: t("details.findNow") }}
        secondary={{ href: "/contact", label: t("nav.contact") }}
      />
    </div>
  );
}
