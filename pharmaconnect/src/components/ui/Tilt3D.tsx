"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tilt3DProps {
  children: ReactNode;
  maxTilt?: number;
  className?: string;
  popLayer?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

export default function Tilt3D({ children, className, popLayer, disabled, onClick }: Tilt3DProps) {
  return (
    <div
      className={cn(!disabled && "transition-transform duration-200 hover:-translate-y-0.5", className)}
      onClick={onClick}
    >
      {children}
      {popLayer && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {popLayer}
        </div>
      )}
    </div>
  );
}
