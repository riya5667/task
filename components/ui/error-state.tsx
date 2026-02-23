import { cn } from "../../lib/utils";
import { Button } from "./button";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-red-200/80 bg-red-50/80 p-3 text-red-900 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100",
        className,
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs">{description}</p>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 border-red-300/70 bg-background/80 text-red-900 hover:bg-red-100 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-900/50"
        >
          Retry
        </Button>
      ) : null}
    </div>
  );
}
