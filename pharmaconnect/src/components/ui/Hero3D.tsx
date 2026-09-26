"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// WebGL bundle is only fetched on the client when actually rendered
const Hero3DScene = lazy(() => import("./Hero3DScene"));

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/**
 * Hero centerpiece with layered fallbacks:
 *  - no WebGL       -> pure-CSS gradient pill (always works)
 *  - reduced motion -> pure-CSS gradient pill (no animation)
 *  - off-screen     -> frameloop paused so the GPU idles
 */
export default function Hero3D({ className }: { className?: string }) {
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null); // null = not yet checked
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        // Capability check piggybacks on the observer callback (async, not during render)
        setWebgl(supportsWebGL());
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reduced-motion users get the static CSS pill, never an animation loop
  const showScene = webgl === true && inView && !reduceMotion;

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      {showScene ? (
        <Suspense fallback={null}>
          <Hero3DScene paused={!inView} />
        </Suspense>
      ) : (
        // Static fallback: CSS-only pill, also shown before WebGL check resolves
        <div className="flex h-full w-full items-center justify-center">
          <div className="relative" style={{ transform: "rotate(-28deg)" }}>
            <div className="h-40 w-16 sm:h-48 sm:w-20 rounded-full bg-gradient-to-b from-primary-400 to-primary-600 shadow-[0_20px_60px_-15px_rgba(47,148,128,0.6)]" />
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-white/40" />
            <div className="absolute -inset-6 -z-10 rounded-full bg-primary-500/20 blur-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
