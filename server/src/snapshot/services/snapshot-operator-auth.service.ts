import type { Request } from 'express';
import {
  getSnapshotOperatorToken,
  SNAPSHOT_OPERATOR_TOKEN_HEADER,
} from '../../config/snapshot-operator.js';

export function isSnapshotOperatorAuthorized(req: Request): boolean {
  const token = getSnapshotOperatorToken();
  if (!token) return false;

  if (req.headers.authorization === `Bearer ${token}`) return true;
  const tokenHeader = req.headers[SNAPSHOT_OPERATOR_TOKEN_HEADER];
  return typeof tokenHeader === 'string' && tokenHeader === token;
}
