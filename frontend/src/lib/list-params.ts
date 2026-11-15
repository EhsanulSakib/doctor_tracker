import { PAGE_SIZES } from "@/lib/constants";

/**
 * Reading list filters from the URL. A hand-edited or stale URL must never break a page, so every
 * value is checked and anything invalid is simply dropped (the API would answer 400 otherwise).
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_PAGE_SIZE = 10;

/** First value of a param (`?a=1&a=2` → "1"), trimmed; empty → undefined. */
export function readString(raw: RawSearchParams, key: string, max = 120): string | undefined {
  const value = raw[key];
  const first = (Array.isArray(value) ? value[0] : value)?.trim();
  return first && first.length <= max ? first : undefined;
}

export function readEnum<T extends string>(raw: RawSearchParams, key: string, allowed: readonly T[]): T | undefined {
  const value = readString(raw, key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function readInt(raw: RawSearchParams, key: string, min: number, max: number): number | undefined {
  const value = readString(raw, key, 10);
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

/** A real calendar date as `YYYY-MM-DD` (rejects `2026-02-31`). */
export function readDate(raw: RawSearchParams, key: string): string | undefined {
  const value = readString(raw, key, 10);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return new Date(`${value}T00:00:00Z`).toISOString().startsWith(value) ? value : undefined;
}

export function readPaging(raw: RawSearchParams) {
  const limit = readInt(raw, "limit", 1, 50);
  return {
    page: readInt(raw, "page", 1, 10_000) ?? 1,
    limit: limit && (PAGE_SIZES as readonly number[]).includes(limit) ? limit : DEFAULT_PAGE_SIZE,
  };
}

/** Keeps `[from, to]` only when ordered; otherwise drops `to`. */
export function orderedRange<T extends string | number>(from: T | undefined, to: T | undefined): [T | undefined, T | undefined] {
  return from !== undefined && to !== undefined && from > to ? [from, undefined] : [from, to];
}
