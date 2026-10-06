import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  wide?: boolean;
}

/** Single source of truth for page width + gutters. */
export function Container({ wide, className, children, ...props }: ContainerProps) {
  return (
    <div className={cn(wide ? "container-wide" : "container-app", className)} {...props}>
      {children}
    </div>
  );
}
