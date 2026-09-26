"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast as toast } from "@/components/Providers";
import { Search, Send, CheckCircle2, Pill } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StockBadge } from "@/components/ui/Badge";
import { formatExpiry, isExpiringSoon } from "@/lib/inventory";
import type { PharmacyStorefrontDTO } from "@/types";

interface Props {
  pharmacy: PharmacyStorefrontDTO;
  canRequest: boolean;
}

export default function StorefrontProducts({ pharmacy, canRequest }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pharmacy.products;
    return pharmacy.products.filter((p) =>
      `${p.medicine.genericName} ${p.medicine.brandName} ${p.medicine.strength} ${p.medicine.manufacturer}`
        .toLowerCase()
        .includes(q)
    );
  }, [pharmacy.products, query]);

  async function handleRequest(medicineId: string, label: string) {
    if (!canRequest) {
      toast.error("Please log in as a patient to send a request");
      router.push("/login");
      return;
    }
    setRequestingId(medicineId);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId: pharmacy.id, medicineId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send request");
      toast.success(`Request sent to ${pharmacy.name} — opening chat…`);
      setSentIds((prev) => new Set(prev).add(medicineId));
      setTimeout(() => router.push(`/chat/${data.request.id}`), 600);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-lg">
          Products <span className="text-sm font-normal text-slate-500">({pharmacy.products.length})</span>
        </h2>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
          {pharmacy.inStockCount} in stock
        </span>
      </div>

      {pharmacy.products.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this pharmacy's products…"
            aria-label="Search products"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
      )}

      {pharmacy.products.length === 0 && (
        <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
          <Pill className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">This pharmacy hasn&apos;t listed any products yet.</p>
        </Card>
      )}

      {filtered.length === 0 && pharmacy.products.length > 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-500">No matches for “{query}”</p>
          <button onClick={() => setQuery("")} className="text-xs font-semibold text-primary-600 hover:underline mt-1">
            Clear search
          </button>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((p) => {
          const sent = sentIds.has(p.medicine.id);
          return (
            <Card key={p.medicine.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm">
                  {p.medicine.genericName}{" "}
                  <span className="text-slate-500 font-normal">
                    {p.medicine.brandName} · {p.medicine.strength}
                  </span>
                </p>
                <p className="text-xs text-slate-400 truncate">{p.medicine.manufacturer}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
                    Qty: {p.quantity}
                  </span>
                  <StockBadge status={p.stockStatus} />
                  {p.mrp !== null && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Rs. {p.mrp}
                    </span>
                  )}
                  {p.expiryDate && (
                    <span
                      className={`text-[11px] font-medium ${
                        isExpiringSoon(p.expiryDate) ? "text-amber-600" : "text-slate-400"
                      }`}
                    >
                      Exp: {formatExpiry(p.expiryDate)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant={sent ? "primary" : "secondary"}
                className="text-xs px-4 py-2 shrink-0"
                loading={requestingId === p.medicine.id}
                disabled={sent}
                onClick={() => handleRequest(p.medicine.id, p.medicine.genericName)}
                aria-label={`Request ${p.medicine.genericName} from ${pharmacy.name}`}
              >
                {sent ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Request
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
