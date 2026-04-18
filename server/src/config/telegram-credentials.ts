/**
 * Telegram bot credentials (infrastructure ENV). Services should use this module, not `process.env` directly.
 */

export interface TelegramBotCredentials {
  token: string;
  chatId: string;
}

export function getTelegramBotCredentials(): TelegramBotCredentials | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return null;
  return { token, chatId };
}

export function isTelegramBotConfigured(): boolean {
  return getTelegramBotCredentials() !== null;
}
