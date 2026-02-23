import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatSmartTimestamp(
  timestamp: number | Date,
  options?: {
    now?: Date;
    locale?: string;
  },
) {
  const locale = options?.locale ?? "en-US";
  const now = options?.now ?? new Date();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (isSameDay(date, now)) {
    return time;
  }

  const isSameYear = date.getFullYear() === now.getFullYear();

  if (isSameYear) {
    const monthDay = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(date);

    return `${monthDay}, ${time}`;
  }

  const fullDate = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  return `${fullDate}, ${time}`;
}
