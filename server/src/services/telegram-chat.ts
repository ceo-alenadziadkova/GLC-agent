import { getTelegramApiBase } from '../config/integrations.js';
import { getTelegramBotCredentials } from '../config/telegram-credentials.js';
import { logger } from './logger.js';

export type TelegramSendMessageBody = {
  text: string;
  parse_mode?: 'HTML';
};

/**
 * Low-level Telegram Bot API sendMessage. Used by ops alerts and registered client log fan-out.
 */
export async function sendTelegramChatMessage(body: TelegramSendMessageBody): Promise<void> {
  const creds = getTelegramBotCredentials();
  if (!creds) return;
  try {
    const payload: Record<string, unknown> = { chat_id: creds.chatId, text: body.text };
    if (body.parse_mode) payload.parse_mode = body.parse_mode;
    const response = await fetch(`${getTelegramApiBase()}/bot${creds.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      logger.warn('telegram_chat.send_failed', { status: response.status });
    }
  } catch (err) {
    logger.warn('telegram_chat.send_exception', {
      error: (err as Error).message,
    });
  }
}
