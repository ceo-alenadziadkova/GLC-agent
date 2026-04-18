/**
 * §4.1 migration drift: run the same audits as violations-export with missing baseline/PB allowlists,
 * parse stdout signatures, and expose line-based vs stable-key metrics.
 */

import { execSync } from 'node:child_process';

/** Subprocess env aligned with `design-system-runtime-ci.mjs` / export-violations §4.1 capture. */
export function migrationDriftSubprocessEnv() {
  return {
    ...process.env,
    DS_RAW_SCOPE: 'app',
    DS_ENFORCEMENT_SCOPE: 'app',
    DS_BASELINE_ALLOWLIST_PATH: '__missing_allowlist__',
    DS_PRIMITIVE_BOUNDARY_ALLOWLIST_PATH: '__missing_allowlist__',
  };
}

/**
 * @param {string} root Repo root (absolute).
 * @param {string} cmd Shell command (e.g. `node scripts/...`).
 * @param {Record<string, string | undefined>} [extraEnv]
 */
export function runAuditCaptureStdout(root, cmd, extraEnv = {}) {
  try {
    return execSync(cmd, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      env: { ...migrationDriftSubprocessEnv(), ...extraEnv },
    });
  } catch (e) {
    const out = [e.stdout, e.stderr].filter(Boolean).join('\n');
    if (out) return out;
    throw e;
  }
}

/**
 * @param {string} output Checker stdout/stderr mix
 * @returns {{ file: string, line: number, type: string, value: string }[]}
 */
export function parseViolationStdout(output) {
  const sigs = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.startsWith('src/') && !line.startsWith('server/')) continue;
    const m = line.match(/^([^:]+):(\d+) \[([^\]]+)\] (.*)$/);
    if (!m) continue;
    sigs.push({ file: m[1], line: Number(m[2]), type: m[3], value: m[4] });
  }
  return sigs;
}

/**
 * Run all five §4.1 audits and merge parsed rows (not deduped).
 * @param {string} root
 */
export function collectMigrationDriftMergedRows(root) {
  const rawOut = runAuditCaptureStdout(root, 'node scripts/design-system-raw-values-check.mjs');
  const enfOut = runAuditCaptureStdout(root, 'node scripts/design-system-enforcement-check.mjs');
  const tsColorOut = runAuditCaptureStdout(root, 'node scripts/design-system-ts-color-literals-check.mjs');
  const primitiveBoundaryOut = runAuditCaptureStdout(root, 'node scripts/design-system-primitive-boundary-check.mjs');
  const patternsLockOut = runAuditCaptureStdout(root, 'node scripts/design-system-patterns-lock-check.mjs');

  const rawSigs = parseViolationStdout(rawOut);
  const enfSigs = parseViolationStdout(enfOut);
  const tsColorSigs = parseViolationStdout(tsColorOut);
  const primitiveBoundarySigs = parseViolationStdout(primitiveBoundaryOut);
  const patternsLockSigs = parseViolationStdout(patternsLockOut);
  const merged = [...rawSigs, ...enfSigs, ...tsColorSigs, ...primitiveBoundarySigs, ...patternsLockSigs];

  return {
    rawSigs,
    enfSigs,
    tsColorSigs,
    primitiveBoundarySigs,
    patternsLockSigs,
    merged,
  };
}

/** Stable drift identity: ignore line churn (Drift Budget gate). */
export function stableDriftKey(sig) {
  return `${sig.file}\0${sig.type}\0${sig.value}`;
}

/** @param {{ file: string, line: number, type: string, value: string }[]} merged */
export function stableSignatureCount(merged) {
  const seen = new Set();
  for (const s of merged) {
    seen.add(stableDriftKey(s));
  }
  return seen.size;
}

/**
 * Line-accurate dedupe (export / compliance-findings.full.txt).
 * @param {{ file: string, line: number, type: string, value: string }[]} merged
 */
export function dedupeLineBased(merged) {
  const seenSig = new Set();
  const deduped = [];
  for (const s of merged) {
    const line = `${s.file}:${s.line} [${s.type}] ${s.value}`;
    if (seenSig.has(line)) continue;
    seenSig.add(line);
    deduped.push(s);
  }
  deduped.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.type.localeCompare(b.type) ||
      a.value.localeCompare(b.value),
  );
  return deduped;
}

/**
 * @param {{ file: string, line: number, type: string, value: string }[]} dedupedLineBased
 */
export function findingsFullTextFromRows(dedupedLineBased) {
  return dedupedLineBased.map((s) => `${s.file}:${s.line} [${s.type}] ${s.value}`).join('\n') + '\n';
}
