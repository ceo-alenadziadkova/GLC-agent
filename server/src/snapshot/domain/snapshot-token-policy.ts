export function isSnapshotTokenFormatValid(token: string): boolean {
  const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_V4_RE.test(token);
}

export function isSnapshotTokenExpired(createdAt: string, ttlHours: number, nowMs = Date.now()): boolean {
  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) {
    return true;
  }
  const ageHours = (nowMs - createdAtMs) / (1000 * 60 * 60);
  return ageHours > ttlHours;
}
