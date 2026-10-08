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

/** Wraps a skeleton block with the right a11y announcement. */
export function SkeletonBlock({
  children,
  className,
  label = "Loading",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function PharmacyCardSkeleton() {
  return (
    <div className="border-t rule py-5 first:border-t-0 first:pt-1" aria-hidden="true">
      {/* Meta row: status + distance chips, timestamp on the right */}
      <div className="mb-3 flex items-center gap-2">
        <Bar className="h-5 w-20 !rounded-full" />
        <Bar className="h-5 w-16 !rounded-full" />
        <Bar className="ml-auto h-3 w-16" />
      </div>

      <div className="flex items-start gap-3">
        <Bar className="h-12 w-12 !rounded-xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="h-5 w-2/3" />
              <Bar className="h-3.5 w-1/2" />
            </div>
            <Bar className="h-5 w-12" />
          </div>

          <div className="flex items-center gap-3">
            <Bar className="h-10 w-10 !rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
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
    <SkeletonBlock label="Loading pharmacies">
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <PharmacyCardSkeleton key={i} />
        ))}
      </div>
    </SkeletonBlock>
  );
}

/** Bordered-card skeletons — matches Card. Use on the dashboards. */
export function CardSkeleton({ count = 3, className = "" }: { count?: number; className?: string }) {
  return (
    <SkeletonBlock label="Loading" className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="space-y-3 rounded-2xl border border-line bg-surface p-4"
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
    </SkeletonBlock>
  );
}

/** Table-shaped skeleton — matches the dashboards' data tables. */
export function TableSkeleton({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <SkeletonBlock
      label="Loading"
      className={`overflow-hidden rounded-2xl border border-line bg-surface ${className}`}
    >
      <div className="flex gap-4 border-b border-line bg-surface-sunken px-4 py-3" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div aria-hidden="true">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-0">
            <Bar className="h-4 w-6" />
            <Bar className="h-4 flex-1" />
            <Bar className="h-5 w-20 !rounded-full" />
            <Bar className="h-4 w-16" />
          </div>
        ))}
      </div>
    </SkeletonBlock>
  );
}

/** Generic text/shape skeleton for ad-hoc panels. */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <SkeletonBlock label="Loading" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bar
          key={i}
          className="h-3.5"
          // Ragged right edge reads as text rather than as a progress bar.
        />
      ))}
    </SkeletonBlock>
  );
}
