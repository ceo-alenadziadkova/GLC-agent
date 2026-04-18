import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import type { SnapshotApiErrorPayload } from '../../../lib/snapshot-api-errors';

export type SnapshotStatusDto = FreeSnapshotPreview;
export type SnapshotErrorDto = SnapshotApiErrorPayload;

export type SnapshotStatusResponse =
  | { ok: true; data: SnapshotStatusDto }
  | { ok: false; status: number; payload: SnapshotErrorDto };

export function toSnapshotStatusResponse(
  status: number,
  ok: boolean,
  payload: unknown,
): SnapshotStatusResponse {
  if (!ok) {
    return {
      ok: false,
      status,
      payload: (payload ?? {}) as SnapshotErrorDto,
    };
  }

  return {
    ok: true,
    data: payload as SnapshotStatusDto,
  };
}
