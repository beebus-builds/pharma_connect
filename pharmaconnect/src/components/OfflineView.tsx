"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/LocaleProvider";

export default function OfflineView() {
  const { t } = useLocale();

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
        <WifiOff className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="headline font-display text-2xl text-fg sm:text-3xl">{t("offline.title")}</h1>
      <p className="lede mt-3 max-w-md text-sm text-fg-muted">{t("offline.body")}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => window.location.reload()}>{t("offline.retry")}</Button>
        <Link href="/medicines">
          <Button variant="secondary">{t("offline.cached")}</Button>
        </Link>
      </div>
    </Container>
  );
}
