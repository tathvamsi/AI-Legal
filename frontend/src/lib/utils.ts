import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeDate(val: string | number | Date | null | undefined): Date | null {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "number") {
    if (isNaN(val) || !isFinite(val)) return null;
    // Unix timestamp in seconds (< 1e11) vs milliseconds
    const ms = val < 1e11 ? val * 1000 : val;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "Invalid Date" || trimmed === "null" || trimmed === "undefined") {
      return null;
    }
    // Pure numeric string
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (isNaN(num)) return null;
      const ms = num < 1e11 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  return null;
}

export function formatDate(val: string | number | Date | null | undefined, fallback = ""): string {
  const d = safeDate(val);
  if (!d) return fallback;
  try {
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return fallback;
  }
}

export function formatTime(val: string | number | Date | null | undefined, fallback = ""): string {
  const d = safeDate(val);
  if (!d) return fallback;
  try {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return fallback;
  }
}

export function formatRelative(val: string | number | Date | null | undefined, fallback = "—"): string {
  const d = safeDate(val);
  if (!d) return fallback;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return "just now";
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return formatDate(d, fallback);
}
