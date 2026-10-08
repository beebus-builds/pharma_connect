"use client";

import { useEffect } from "react";
import { TriangleAlert, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Route-level error boundary.
 *
 * The app had no `error.tsx` at all, so any thrown render error went straight to
 * the bare `global-error.tsx` — the whole chrome disappeared for one broken card.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry is already wired at the edge; the console keeps the trace in dev.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-16">
      <EmptyState
        tone="error"
        icon={TriangleAlert}
        title="This section could not load"
        body={
          error.message ||
          "Something went wrong while fetching data. Your account and saved requests are unaffected."
        }
        action={
          <>
            <Button onClick={reset}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button variant="secondary" onClick={() => window.location.assign("/")}>
              Back to search
            </Button>
          </>
        }
      />
    </Container>
  );
}
