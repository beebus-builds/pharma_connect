"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

export default function PageWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  // Zoom-through transition: page recedes into z-depth on exit, arrives from depth on enter
  const initial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 12 };
  const animate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 };
  const exit = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
