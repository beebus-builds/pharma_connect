import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  href?: string;
  label: string;
}

/**
 * Breadcrumb trail.
 *
 * Hand-rolled three times (medicines index, medicine detail) with slightly
 * different separators. `aria-current="page"` on the last crumb is what tells a
 * screen reader which page you are on.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs text-fg-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              {crumb.href && !last ? (
                <li>
                  <Link
                    href={crumb.href}
                    className="rounded transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                  >
                    {crumb.label}
                  </Link>
                </li>
              ) : (
                <li aria-current={last ? "page" : undefined} className={last ? "text-fg" : undefined}>
                  {crumb.label}
                </li>
              )}
              {!last && (
                <li aria-hidden="true" className="text-fg-subtle">
                  <ChevronRight className="h-3 w-3" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
