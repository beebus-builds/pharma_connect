/**
 * Loading states that mirror the real component shapes.
 *
 * These used to render as bordered cards while the pharmacy card itself is a
 * borderless ledger row, so every search visibly reshuffled on resolve. The
 * silhouette now matches: hairline-separated rows with the same metrics.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function PharmacyCardSkeleton() {
  return (
    <div
      className="border-t rule py-5 first:border-t-0 first:pt-1"
      aria-hidden="true"
    >
      {/* Meta row: status + distance chips, timestamp on the right */}
      <div className="flex items-center gap-2 mb-3">
        <Bar className="h-5 w-20 !rounded-full" />
        <Bar className="h-5 w-16 !rounded-full" />
        <Bar className="h-3 w-16 ml-auto" />
      </div>

      <div className="flex items-start gap-3">
        <Bar className="h-12 w-12 !rounded-xl shrink-0" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <Bar className="h-5 w-2/3" />
              <Bar className="h-3.5 w-1/2" />
            </div>
            <Bar className="h-5 w-12 shrink-0" />
          </div>

          <div className="flex items-center gap-3">
            <Bar className="h-10 w-10 !rounded-lg shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Bar className="h-4 w-3/4" />
              <Bar className="h-3 w-1/3" />
            </div>
          </div>

          <div className="flex gap-2">
            <Bar className="h-8 w-16 !rounded-lg" />
            <Bar className="h-8 w-28 !rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ledger-row skeletons — matches PharmacyCard. Use for search result lists. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <PharmacyCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Bordered-card skeletons — matches Card. Use on the dashboards. */
export function CardSkeleton({ count = 3, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
          aria-hidden="true"
        >
          <Bar className="h-5 w-2/3" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Bar className="h-6 w-20 !rounded-full" />
            <Bar className="h-6 w-24 !rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}