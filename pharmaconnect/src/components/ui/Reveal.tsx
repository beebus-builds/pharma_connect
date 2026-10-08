"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLiteMode } from "@/hooks/useLiteMode";

interface RevealProps {
  children: ReactNode;
  /** Stagger, in seconds, for a cascade inside a grid or list. */
  delay?: number;
  className?: string;
}

/**
 * Scroll-entrance wrapper.
 *
 * Content eases up and fades in the first time it scrolls into view. Two cases
 * short-circuit to "already visible" so nothing is ever stuck transparent:
 * lite mode (see `useLiteMode`) and `prefers-reduced-motion`. When
 * IntersectionObserver is unavailable the element simply renders in place.
 *
 * The hidden start state still applies to reduce-motion users before JS runs,
 * so `motion-reduce:` keeps it visible — the global reduced-motion rule in
 * `globals.css` also collapses the transition to a no-op.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const { lite } = useLiteMode();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (lite) {
      setShown(true);
      return;
    }
    const el = ref.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (reduce || typeof IntersectionObserver === "undefined" || !el) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lite]);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-spring motion-reduce:transition-none",
        shown
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}
