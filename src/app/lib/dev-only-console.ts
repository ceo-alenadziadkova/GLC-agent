/**
 * Bootstrap-safe logging: must not import `logger` (logger depends on supabase).
 * Only emits in Vite dev; production users see nothing in the console.
 */
export function devWarn(message: string, ...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  console.warn(message, ...args);
}
