"use client";

import { useRef, useState, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tilt3DProps {
  children: ReactNode;
  /** Max rotation in degrees. Subtle for cards, higher for showcase panels. */
  maxTilt?: number;
  /** How far the "popped" layer lifts off the card in px (used via data-tilt-depth children). */
  className?: string;
  /** Children rendered at a raised depth (icon/number that pops off the surface). */
  popLayer?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Cursor-tracking 3D tilt card.
 * Wrap content normally; pass `popLayer` for an element that floats above
 * the surface at a raised translateZ (true 3D depth, not just scale).
 * Respects prefers-reduced-motion by rendering a static wrapper.
 */
export default function Tilt3D({
  children,
  maxTilt = 8,
  className,
  popLayer,
  disabled,
  onClick,
}: Tilt3DProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const px = useMotionValue(0.5); // 0..1 cursor position within card
  const py = useMotionValue(0.5);

  const spring = { stiffness: 260, damping: 22, mass: 0.6 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  // -1..1 normalized, then rotated around the opposite axis for perspective tilt
  const rotateX = useTransform(sy, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(sx, [0, 1], [-maxTilt, maxTilt]);

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el || disabled) return;
      const rect = el.getBoundingClientRect();
      px.set((e.clientX - rect.left) / rect.width);
      py.set((e.clientY - rect.top) / rect.height);
    },
    [px, py, disabled]
  );

  const handleEnter = useCallback(() => {
    if (!disabled) setHovered(true);
  }, [disabled]);

  const handleLeave = useCallback(() => {
    setHovered(false);
    px.set(0.5);
    py.set(0.5);
  }, [px, py]);

  if (shouldReduceMotion || disabled) {
    return (
      <div className={cn("will-change-transform", className)} onClick={onClick}>
        {children}
        {popLayer}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={onClick}
      style={{
        rotateX: hovered ? rotateX : 0,
        rotateY: hovered ? rotateY : 0,
        transformStyle: "preserve-3d",
        transformPerspective: 900,
      }}
      className={cn("will-change-transform [transform-style:preserve-3d]", className)}
    >
      {children}
      {popLayer && (
        <div
          className="pointer-events-none absolute inset-0 [transform:translateZ(38px)] [transform-style:preserve-3d]"
          aria-hidden="true"
        >
          {popLayer}
        </div>
      )}
    </motion.div>
  );
}
