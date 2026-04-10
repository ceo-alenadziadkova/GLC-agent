/**
 * Rules for PUT /brief: which intake_versions tuple is accepted and when we migrate stored rows.
 */
import type { IntakeVersionMigration, IntakeVersionTuple } from '../audit-contract.js';

import { currentIntakeVersionTuple } from './versions.js';
import { isSupportedIntakeArtifactTuple } from './resolve-intake-artifacts.js';
import { tuplesEqual } from './intake-version-tuple.js';

export type IntakeVersionWriteResult =
  | { ok: true; effective: IntakeVersionTuple; migration: IntakeVersionMigration | null }
  | { ok: false; status: 400 | 409; body: Record<string, unknown> };

/**
 * - Body may omit `intake_versions` → replay `stored` or current for new rows.
 * - Body with partial keys is invalid (caller should use parseIntakeVersionTuple first).
 * - Supported tuples: current engine or a frozen registry entry (see resolve-intake-artifacts).
 * - Client may upgrade stored frozen → current by sending the current tuple.
 */
export function validateIntakeVersionsForBriefWrite(args: {
  parsedFromBody?: IntakeVersionTuple;
  stored: IntakeVersionTuple | null | undefined;
}): IntakeVersionWriteResult {
  const current = currentIntakeVersionTuple();

  if (args.parsedFromBody === undefined) {
    let effective: IntakeVersionTuple = args.stored ?? current;
    if (!isSupportedIntakeArtifactTuple(effective)) {
      const migration: IntakeVersionMigration = {
        from: effective,
        to: current,
        at: new Date().toISOString(),
        reason: 'unsupported_stored_repaired',
      };
      effective = current;
      return { ok: true, effective, migration };
    }
    return { ok: true, effective, migration: null };
  }

  if (!isSupportedIntakeArtifactTuple(args.parsedFromBody)) {
    return {
      ok: false,
      status: 400,
      body: {
        code: 'UNSUPPORTED_INTAKE_VERSION',
        message: 'intake_versions tuple is not a supported artifact bundle',
        received: args.parsedFromBody,
        supportedHint: 'Send current engine tuple or omit intake_versions to reuse the stored tuple.',
      },
    };
  }

  if (args.stored == null) {
    return { ok: true, effective: args.parsedFromBody, migration: null };
  }

  if (tuplesEqual(args.stored, args.parsedFromBody)) {
    return { ok: true, effective: args.parsedFromBody, migration: null };
  }

  if (tuplesEqual(args.parsedFromBody, current) && !tuplesEqual(args.stored, current)) {
    const migration: IntakeVersionMigration = {
      from: args.stored,
      to: current,
      at: new Date().toISOString(),
      reason: 'client_upgrade',
    };
    return { ok: true, effective: current, migration };
  }

  return {
    ok: false,
    status: 409,
    body: {
      code: 'INTAKE_VERSION_CONFLICT',
      message: 'intake_versions does not match this brief row; refresh the brief or send the stored tuple.',
      stored: args.stored,
      received: args.parsedFromBody,
    },
  };
}
