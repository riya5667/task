import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize = "default" | "sm" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClassName: Record<ButtonVariant, string> = {
  default:
    "bg-foreground text-background shadow-sm hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-ring",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/85 focus-visible:ring-2 focus-visible:ring-ring",
  ghost: "hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
  outline:
    "border border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
  destructive:
    "bg-red-600 text-white shadow-sm hover:bg-red-600/90 focus-visible:ring-2 focus-visible:ring-red-500",
};

const sizeClassName: Record<ButtonSize, string> = {
  default: "h-9 rounded-md px-4 py-2 text-sm font-medium",
  sm: "h-8 rounded-md px-3 text-xs font-medium",
  icon: "h-9 w-9 rounded-md",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 ease-out outline-none disabled:pointer-events-none disabled:opacity-50",
        variantClassName[variant],
        sizeClassName[size],
        className,
      )}
      {...props}
    />
  );
}
