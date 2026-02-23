import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
