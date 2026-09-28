"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tilt3DProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Lightweight hover-lift wrapper. Named for the effect it replaced — a real
 * 3D tilt cost more GPU time than it was worth on the devices this app targets,
 * so this is now just a transform on hover.
 */
export default function Tilt3D({ children, className, disabled, onClick }: Tilt3DProps) {
  return (
    <div
      className={cn(!disabled && "transition-transform duration-200 hover:-translate-y-0.5", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
