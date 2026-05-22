import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Cached formatter instances — created once, reused forever.
// Previously created on every call (1000+ times when rendering 500 rows).
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

export function formatCurrency(valueInPaisa: number) {
  return currencyFormatter.format(valueInPaisa / 100);
}

export function formatDate(date: string | Date) {
  return dateFormatter.format(new Date(date));
}

// Cache "today" at midnight for the current JS tick to avoid
// creating 2 Date objects per call in hot loops.
let _todayCache: number | null = null;
let _todayCacheDay = -1;

function getTodayMidnight() {
  const now = new Date();
  const day = now.getDate();
  if (_todayCache === null || _todayCacheDay !== day) {
    now.setHours(0, 0, 0, 0);
    _todayCache = now.getTime();
    _todayCacheDay = day;
  }
  return _todayCache;
}

export function daysUntil(date: string | Date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - getTodayMidnight()) / 86400000);
}
