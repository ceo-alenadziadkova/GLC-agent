import type { Response } from 'express';
import type { SnapshotClaimResult } from '../../../snapshot/services/snapshot-claim.service.js';
import type { SnapshotPollResult } from '../../../snapshot/services/snapshot-poll.service.js';
import type { StartSnapshotResult } from '../../../snapshot/services/snapshot-start.service.js';
import {
  API_ERROR_CODES,
  SNAPSHOT_CLAIM_CONFLICT_MESSAGE,
  SNAPSHOT_COMPANY_URL_REQUIRED_MESSAGE,
  SNAPSHOT_DOMAIN_FRESH_COOLDOWN_MESSAGE,
  SNAPSHOT_FAILED_MESSAGE,
  SNAPSHOT_INVALID_TOKEN_MESSAGE,
  SNAPSHOT_NOT_FOUND_MESSAGE,
  SNAPSHOT_TOKEN_EXPIRED_MESSAGE,
  SNAPSHOT_TOKEN_REQUIRED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';

export function sendSnapshotTokenRequired(res: Response): void {
  res
    .status(400)
    .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_TOKEN_REQUIRED, SNAPSHOT_TOKEN_REQUIRED_MESSAGE));
}

export function sendSnapshotInvalidToken(res: Response): void {
  res
    .status(400)
    .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_INVALID_TOKEN, SNAPSHOT_INVALID_TOKEN_MESSAGE));
}

export function sendSnapshotCompanyUrlRequired(res: Response): void {
  res
    .status(400)
    .json(
      apiErrorJson(
        API_ERROR_CODES.SNAPSHOT_COMPANY_URL_REQUIRED,
        SNAPSHOT_COMPANY_URL_REQUIRED_MESSAGE,
      ),
    );
}

export function sendClaimSnapshotResult(res: Response, result: SnapshotClaimResult): void {
  switch (result.type) {
    case 'not_found':
      res.status(404).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_NOT_FOUND, SNAPSHOT_NOT_FOUND_MESSAGE));
      return;
    case 'expired':
      res
        .status(410)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_TOKEN_EXPIRED, SNAPSHOT_TOKEN_EXPIRED_MESSAGE));
      return;
    case 'conflict':
      res
        .status(409)
        .json(
          apiErrorJson(
            API_ERROR_CODES.SNAPSHOT_CLAIM_CONFLICT,
            SNAPSHOT_CLAIM_CONFLICT_MESSAGE,
          ),
        );
      return;
    case 'ok':
      res.json({ ok: true, audit_id: result.auditId, already_claimed: result.alreadyClaimed });
      return;
  }
}

export function sendStartSnapshotResult(res: Response, result: StartSnapshotResult): void {
  switch (result.type) {
    case 'invalid_public_url':
      res.status(400).json(apiErrorJson(result.code, result.message));
      return;
    case 'cooldown': {
      const body = apiErrorJson(
        API_ERROR_CODES.SNAPSHOT_DOMAIN_FRESH_COOLDOWN,
        SNAPSHOT_DOMAIN_FRESH_COOLDOWN_MESSAGE,
      );
      if (result.retryAfterSec > 0) body.retry_after_seconds = result.retryAfterSec;
      res.status(429).json(body);
      return;
    }
    case 'owner_resolution_error':
      res.status(result.statusCode).json(apiErrorJson(result.code, result.error));
      return;
    case 'ok':
      res.status(202).json({
        snapshot_token: result.snapshotToken,
        status: 'running',
      });
      return;
    case 'create_failed':
    case 'init_failed':
      return;
  }
}

export function sendPollSnapshotResult(
  res: Response,
  snapshotToken: string,
  result: SnapshotPollResult,
): 'completed' | 'failed' | 'running' | 'not_found' | 'expired' {
  switch (result.type) {
    case 'not_found':
      res.status(404).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_NOT_FOUND, SNAPSHOT_NOT_FOUND_MESSAGE));
      return 'not_found';
    case 'expired':
      res
        .status(410)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_TOKEN_EXPIRED, SNAPSHOT_TOKEN_EXPIRED_MESSAGE));
      return 'expired';
    case 'running':
      res.json({ status: result.status, snapshot_token: result.snapshotToken });
      return 'running';
    case 'data_not_ready':
      res.json({ status: 'running', snapshot_token: result.snapshotToken });
      return 'running';
    case 'failed':
      res.json({
        status: 'failed',
        snapshot_token: snapshotToken,
        ...apiErrorJson(API_ERROR_CODES.SNAPSHOT_FAILED, SNAPSHOT_FAILED_MESSAGE),
      });
      return 'failed';
    case 'completed':
      res.json(result.preview);
      return 'completed';
  }
}
