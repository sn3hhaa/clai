import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Prefix a public/ path with the deployment base path (GitHub Pages serves under /clai). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (path: string) => `${BASE_PATH}${path}`;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Clause 8.1 · p. 2" style reference for a passage. */
export function sourceLabel(e: { clause: string | null; page_number: number; page_end?: number; section?: string | null }) {
  const pages = e.page_end && e.page_end !== e.page_number ? `pp. ${e.page_number}–${e.page_end}` : `p. ${e.page_number}`;
  if (e.clause) return `Clause ${e.clause} · ${pages}`;
  if (e.section) return `${e.section} · ${pages}`;
  return pages;
}
