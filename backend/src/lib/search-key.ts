/**
 * Prefix search that can use a normal MongoDB index.
 *
 * Each document stores `searchKey`: lowercased tokens (every name word, the full email,
 * the phone digits). A search term becomes an anchored, case-sensitive regex like /^oka/,
 * which MongoDB answers with an index range scan on the multikey `searchKey` index.
 * A case-insensitive or unanchored regex would have to scan every document.
 */

const MAX_TERMS = 5;

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');
const looksLikePhone = (value: string) => /^[\d\s()+-]+$/.test(value) && /\d/.test(value);

export function buildSearchKey(fields: { name: string; email?: string | null; phone?: string | null }): string[] {
  const tokens = new Set<string>();

  for (const word of fields.name.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (word) tokens.add(word);
  }
  if (fields.email) tokens.add(fields.email.trim().toLowerCase());
  if (fields.phone) {
    const digits = digitsOnly(fields.phone);
    if (digits) tokens.add(digits);
  }

  return [...tokens];
}

/** Turns "Lena oka" into `{ $all: [/^lena/, /^oka/] }`: every term must prefix-match some token. */
export function searchKeyFilter(search: string | undefined): { $all: RegExp[] } | undefined {
  if (!search) return undefined;

  const terms = search
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((term) => (looksLikePhone(term) ? digitsOnly(term) : term))
    .filter(Boolean)
    .slice(0, MAX_TERMS);

  if (terms.length === 0) return undefined;

  return { $all: terms.map((term) => new RegExp(`^${escapeRegex(term)}`)) };
}
