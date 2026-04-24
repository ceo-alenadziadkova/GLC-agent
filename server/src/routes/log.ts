import type { Response, RequestHandler } from 'express';
import { Router } from 'express';
import {
  requireAuth,
  attachProfile,
  rejectGuestFromPortal,
  allowGuestSnapshotLogIngest,
  type AuthRequest,
} from '../middleware/auth.js';
import { logIngestLimiter, snapshotLogIngestLimiter } from '../middleware/rate-limit.js';
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import { formatSpaUiIncidentTelegramMessage } from '../config/telegram-notification-format.en.js';
import { isTelegramBotConfigured } from '../config/telegram-credentials.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { tryConsumeSpaUiIncidentTelegramSlot } from '../lib/spa-ui-incident-telegram-cooldown.js';
import { logger } from '../services/logger.js';
import { sendTelegramChatMessage } from '../services/telegram-chat.js';

interface LogBody {
  level?: 'debug' | 'info' | 'warn' | 'error';
  source?: string;
  message?: string;
  context?: Record<string, unknown>;
  timestamp?: string;
}

const SPA_UI_INCIDENT_SOURCE = 'spa_ui_incident';

function fanOutSpaUiIncidentToTelegram(req: AuthRequest, body: LogBody, source: string, timestamp: string, message: string): void {
  if (!req.userId) return;
  if (source !== SPA_UI_INCIDENT_SOURCE) return;
  if (!isTelegramBotConfigured()) return;
  const ctx = body.context;
  if (!ctx || typeof ctx !== 'object') return;
  const refRaw = ctx.ref;
  const ref = typeof refRaw === 'string' ? refRaw.trim() : '';
  if (!ref) return;

  const cooldownMs = SYSTEM_DEFAULTS.alerts.spaUiIncidentTelegramCooldownMs;
  if (!tryConsumeSpaUiIncidentTelegramSlot(`${req.userId}:${ref}`, cooldownMs)) {
    return;
  }

  const pathRaw = ctx.path;
  const path = typeof pathRaw === 'string' ? pathRaw : '';
  const detailRaw = ctx.detail;
  const detail = typeof detailRaw === 'string' ? detailRaw : undefined;

  const text = formatSpaUiIncidentTelegramMessage({
    supportRef: ref.slice(0, 256),
    path: path.slice(0, 512),
    userId: req.userId,
    messageKind: message.slice(0, 120),
    detail,
    clientEnv: ctx.client_env,
    timestamp,
  });

  void sendTelegramChatMessage({ text, parse_mode: 'HTML' });
}

function ingestFrontendLog(req: AuthRequest, res: Response): void {
  const body = (req.body ?? {}) as LogBody;
  const level = body.level ?? 'info';
  const source = String(body.source ?? 'frontend').slice(0, REQUEST_FIELD_LIMITS.logSourceMax);
  const message = String(body.message ?? '').slice(0, REQUEST_FIELD_LIMITS.logMessageMax);
  const context = body.context && typeof body.context === 'object' ? body.context : undefined;
  const timestamp = body.timestamp ?? new Date().toISOString();

  logger.info('Frontend log', {
    level,
    source,
    timestamp,
    message,
    user_id: req.userId,
    context: context ?? {},
  });

  fanOutSpaUiIncidentToTelegram(req, body, source, timestamp, message);

  res.status(204).end();
}

const postRegisteredLog: RequestHandler[] = [
  requireAuth,
  attachProfile,
  rejectGuestFromPortal,
  logIngestLimiter,
  (req, res) => ingestFrontendLog(req as AuthRequest, res),
];

const postSnapshotLog: RequestHandler[] = [
  requireAuth,
  attachProfile,
  allowGuestSnapshotLogIngest,
  snapshotLogIngestLimiter,
  (req, res) => ingestFrontendLog(req as AuthRequest, res),
];

export const logRouter = Router();

logRouter.post('/', ...postRegisteredLog);
logRouter.post('/snapshot', ...postSnapshotLog);
