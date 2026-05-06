/**
 * Stable cross-pack-version identity for orchestration nodes (Delivery Board operational layer).
 * Pure deterministic hash — not a cryptography-grade digest.
 */

export const CANONICAL_NODE_KEY_TITLE_MAX_CHARS = 180 as const;

/** Consultant-supplied stable token for Epic 1 (Delivery Board identity across title edits). */
export const CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS = 64 as const;

function fnv1a32Hex(bytes: Uint8Array): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** NFKD normalization, punctuation stripped, lowercase, whitespace collapsed, length capped. */
export function normalizeTitleForCanonicalNodeKey(title: string): string {
  const nfkd = title.normalize('NFKD').replace(/\p{M}/gu, '');
  const slug = nfkd
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return slug.length > CANONICAL_NODE_KEY_TITLE_MAX_CHARS
    ? slug.slice(0, CANONICAL_NODE_KEY_TITLE_MAX_CHARS)
    : slug;
}

export function normalizeLaneKeyForCanonicalNodeKey(lane: string): string {
  return lane.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Normalises optional Board identity hint (same NFKD hygiene as titles; tighter cap). */
export function normalizeBoardIdentityKeyForCanonicalNodeKey(raw: string): string {
  const slug = normalizeTitleForCanonicalNodeKey(raw);
  return slug.length > CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS
    ? slug.slice(0, CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS)
    : slug;
}

export function canonicalNodeKeyFromParts(args: {
  manifest_signature: string;
  lane: string;
  normalized_title: string;
}): string {
  const encoder = new TextEncoder();
  const basis =
    `${args.manifest_signature.trim()}::${args.lane.trim()}::${args.normalized_title.trim()}`;
  const hex = fnv1a32Hex(encoder.encode(basis));
  return `cnk_v1_${hex}`;
}

export function canonicalNodeKeyFromManifestAndNode(args: {
  manifest_signature: string;
  lane_id: string;
  title: string;
  /** When set (non-whitespace after normalisation), key is stable across title edits (ADR Epic 1). */
  board_identity_key?: string | null;
}): string {
  const lane = normalizeLaneKeyForCanonicalNodeKey(args.lane_id);
  const idRaw =
    typeof args.board_identity_key === 'string' ? args.board_identity_key.trim() : '';
  const idNorm =
    idRaw.length > 0 ? normalizeBoardIdentityKeyForCanonicalNodeKey(idRaw) : '';
  const normalized_title =
    idNorm.length > 0
      ? `identity:${idNorm}`
      : normalizeTitleForCanonicalNodeKey(args.title);
  return canonicalNodeKeyFromParts({
    manifest_signature: args.manifest_signature,
    lane,
    normalized_title,
  });
}
