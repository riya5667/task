import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success";
}

const variantClassName: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-foreground text-background",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-emerald-600 text-white",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold shadow-sm",
        variantClassName[variant],
        className,
      )}
      {...props}
    />
  );
}
