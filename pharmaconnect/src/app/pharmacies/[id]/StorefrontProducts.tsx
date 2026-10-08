"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast as toast } from "@/components/Providers";
import { Search, Send, CheckCircle2, Pill, Package } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StockBadge, Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocale } from "@/components/LocaleProvider";
import { formatExpiry, isExpiringSoon } from "@/lib/inventory";
import type { PharmacyStorefrontDTO } from "@/types";

interface Props {
  pharmacy: PharmacyStorefrontDTO;
  canRequest: boolean;
}

type Filter = "all" | "in-stock" | "out-of-stock";

export default function StorefrontProducts({ pharmacy, canRequest }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [requestingKey, setRequestingKey] = useState<string | null>(null);
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());

  const hasProducts = pharmacy.products.length > 0;
  const branchCount = new Set(pharmacy.products.map((p) => p.locationId)).size;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pharmacy.products.filter((p) => {
      if (filter === "in-stock" && p.quantity === 0) return false;
      if (filter === "out-of-stock" && p.quantity > 0) return false;
      if (!q) return true;
      return `${p.medicine.genericName} ${p.medicine.brandName} ${p.medicine.strength} ${p.medicine.manufacturer}`
        .toLowerCase()
        .includes(q);
    });
  }, [pharmacy.products, query, filter]);

  const visibleCount = filtered.length;

  async function handleRequest(medicineId: string, locationId: string) {
    if (!canRequest) {
      toast.error(t("card.requestLogin"));
      router.push("/login");
      return;
    }
    const key = `${locationId}:${medicineId}`;
    setRequestingKey(key);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId: pharmacy.id, medicineId, locationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("card.requestFailed"));
      toast.success(t("card.requestSentTo", { name: pharmacy.name }));
      setSentKeys((prev) => new Set(prev).add(key));
      // Let the "Sent" state register before the route change unmounts us.
      setTimeout(() => router.push(`/chat/${data.request.id}`), 700);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setRequestingKey(null);
    }
  }

  return (
    <div>
      <SectionHeading
        eyebrow={t("store.productsEyebrow")}
        title={t("store.productsTitle")}
        description={
          branchCount > 1
            ? t("store.productsBodyBranches", { count: branchCount })
            : t("store.productsBody")
        }
        className="mb-5"
        action={
          <Badge tone="success" icon={Package}>
            {t("store.inStockNow", { count: pharmacy.inStockCount })}
          </Badge>
        }
      />

      {hasProducts && (
        <div className="mb-5 space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("store.searchPlaceholder")}
            aria-label={t("store.searchPlaceholder")}
            leading={<Search />}
          />
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("home.filter")}>
            {(
              [
                ["all", t("store.filterAll")],
                ["in-stock", t("badge.inStock")],
                ["out-of-stock", t("badge.outOfStock")],
              ] as const
            ).map(([value, label]) => (
              <Chip key={value} size="sm" selected={filter === value} onClick={() => setFilter(value)}>
                {label}
              </Chip>
            ))}
            {visibleCount !== pharmacy.products.length && (
              <span className="tabular ml-auto text-xs text-fg-subtle">
                {t("store.showing", { count: visibleCount, total: pharmacy.products.length })}
              </span>
            )}
          </div>
        </div>
      )}

      {!hasProducts && (
        <EmptyState
          icon={Pill}
          title={t("store.noProducts")}
          body={t("store.noProductsBody")}
          action={
            <a
              href={`tel:${pharmacy.phone.replace(/[^+\d]/g, "")}`}
              className={buttonClasses({ variant: "secondary" })}
            >
              {t("card.callNumber", { phone: pharmacy.phone })}
            </a>
          }
        />
      )}

      {hasProducts && visibleCount === 0 && (
        <EmptyState
          icon={Search}
          title={t("store.noMatches")}
          body={t("store.noMatchesBody", { query })}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              {t("common.clearFilters")}
            </Button>
          }
        />
      )}

      {visibleCount > 0 && (
        <ul className="space-y-2">
          {filtered.map((p, i) => {
            const key = `${p.locationId}:${p.medicine.id}`;
            const sent = sentKeys.has(key);
            return (
              <li
                key={key}
                className="flex animate-rise items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card transition-shadow hover:shadow-card-hover motion-reduce:animate-none"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              >
                {p.medicine.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- catalog
                  // photos come from arbitrary user uploads at unknown sizes, so
                  // next/image cannot infer dimensions or optimise them safely.
                  <img
                    src={p.medicine.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-fg-subtle"
                    aria-hidden="true"
                  >
                    <Pill className="h-4.5 w-4.5" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">
                    {p.medicine.genericName}
                    <span className="ml-1.5 text-xs font-normal text-fg-muted">
                      {p.medicine.brandName} · {p.medicine.strength}
                    </span>
                  </p>
                  {p.medicine.manufacturer && (
                    <p className="truncate text-xs text-fg-subtle">{p.medicine.manufacturer}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StockBadge status={p.stockStatus} />
                    <Badge tone="neutral" className="tabular">
                      {t("card.quantityLabel", { count: p.quantity })}
                    </Badge>
                    {p.mrp != null && (
                      <Badge tone="accent" className="tabular">
                        Rs. {p.mrp}
                      </Badge>
                    )}
                    <span className="truncate text-[11px] text-fg-subtle">{p.locationName}</span>
                    {p.expiryDate && (
                      <span
                        className={`tabular text-[11px] ${
                          isExpiringSoon(p.expiryDate)
                            ? "font-bold text-amber-600"
                            : "text-fg-subtle"
                        }`}
                      >
                        {t("pharmacy.expShort")} {formatExpiry(p.expiryDate)}
                      </span>
                    )}
                  </div>
                </div>

                {canRequest && (
                  <Button
                    variant={sent ? "accent" : "secondary"}
                    size="sm"
                    className="shrink-0"
                    loading={requestingKey === key}
                    disabled={sent}
                    onClick={() => void handleRequest(p.medicine.id, p.locationId)}
                    aria-label={t("card.requestAria", {
                      medicine: p.medicine.genericName,
                      name: pharmacy.name,
                    })}
                  >
                    {sent ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("card.sent")}
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("home.request")}
                      </>
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
