import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
}

function DefaultPlaceholderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="14" rx="3" />
      <path d="M7 9h10" />
      <path d="M7 13h6" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/35 px-4 text-center shadow-sm transition-all duration-200",
        compact ? "py-6" : "py-10",
        className,
      )}
    >
      <div className="mb-3 rounded-full border bg-background/80 p-2.5 text-muted-foreground shadow-sm">
        {icon ?? <DefaultPlaceholderIcon />}
      </div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
