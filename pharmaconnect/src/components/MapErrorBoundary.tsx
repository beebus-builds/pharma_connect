"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { MapPin } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useLocale } from "@/components/LocaleProvider";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

function MapFallback() {
  const { t } = useLocale();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-sunken p-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-sunken text-fg-subtle ring-1 ring-line">
        <MapPin className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-fg">{t("map.failed")}</p>
      <p className="max-w-[34ch] text-xs leading-relaxed text-fg-muted">{t("map.failedBody")}</p>
      <button type="button" className={buttonClasses({ variant: "secondary", size: "xs" })}>
        {t("common.retry")}
      </button>
    </div>
  );
}

/**
 * Local boundary around the Leaflet map only. If the map crashes, the rest of
 * the page (search results, request buttons) keeps working instead of showing
 * the full-page error screen.
 */
export class MapErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[map] Map failed to render:", error, errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) return <MapFallback />;
    return this.props.children;
  }
}
