"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { TriangleAlert, RotateCcw, Home } from "lucide-react";
import { Stethoscope } from "lucide-react";

/**
 * Root error boundary.
 *
 * Next's built-in fallback renders an unstyled page: no fonts, no CSS variables,
 * no `dark` class, and no way out except the browser's back button. This replaces
 * it with the real brand chrome and — critically — a `reset()` affordance, so a
 * transient failure does not become a dead end.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "rgb(251 249 245)",
          color: "rgb(26 27 25)",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              height: "3rem",
              width: "3rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "1rem",
              background: "rgb(23 94 76)",
              color: "#fff",
              marginBottom: "1.5rem",
            }}
          >
            <Stethoscope width={22} height={22} />
          </span>

          <p
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgb(23 94 76)",
              margin: 0,
            }}
          >
            Something broke
          </p>
          <h1
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              fontWeight: 600,
              lineHeight: 1.15,
              margin: "0.5rem 0 0",
            }}
          >
            We could not load this page
          </h1>
          <p
            style={{
              margin: "0.75rem 0 0",
              color: "rgb(94 100 96)",
              lineHeight: 1.65,
              fontSize: "0.9375rem",
            }}
          >
            This is our fault, not yours. Try again — and if it keeps happening, send us the
            reference below so we can find it in the logs.
          </p>

          {error.digest && (
            <p
              style={{
                marginTop: "1rem",
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: "0.75rem",
                color: "rgb(141 148 143)",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <div
            style={{
              marginTop: "1.75rem",
              display: "flex",
              gap: "0.625rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                height: "2.75rem",
                padding: "0 1.25rem",
                borderRadius: "0.75rem",
                border: 0,
                background: "rgb(23 94 76)",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RotateCcw width={16} height={16} />
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                height: "2.75rem",
                padding: "0 1.25rem",
                borderRadius: "0.75rem",
                border: "1px solid rgb(208 202 191)",
                background: "transparent",
                color: "rgb(26 27 25)",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Home width={16} height={16} />
              Back to search
            </a>
          </div>

          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.75rem",
              color: "rgb(141 148 143)",
            }}
          >
            <TriangleAlert
              width={12}
              height={12}
              style={{ verticalAlign: "-1px", marginRight: 4 }}
            />
            In an emergency, call 102 or go to the nearest hospital — do not wait for this page.
          </p>
        </main>
      </body>
    </html>
  );
}
