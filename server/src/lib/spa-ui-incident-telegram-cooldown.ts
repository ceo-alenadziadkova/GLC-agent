/** In-process dedupe for SPA error-screen Telegram fan-out (per API instance). */

const lastSentAtMs = new Map<string, number>();

export function tryConsumeSpaUiIncidentTelegramSlot(key: string, cooldownMs: number): boolean {
  const now = Date.now();
  const last = lastSentAtMs.get(key) ?? 0;
  if (now - last < cooldownMs) return false;
  lastSentAtMs.set(key, now);
  return true;
}
