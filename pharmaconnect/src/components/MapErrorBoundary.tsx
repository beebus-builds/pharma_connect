"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { MapPin } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
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
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 p-6 text-center">
          <MapPin className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Map is unavailable right now
          </p>
          <p className="text-xs text-slate-500">
            You can still use the list and send requests to pharmacies.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
