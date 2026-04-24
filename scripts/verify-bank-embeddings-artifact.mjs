#!/usr/bin/env node
/**
 * Validates the bank-embeddings registry artifact (phase E — deterministic or future provider vectors).
 * CI-friendly; extend when embedding generation is added.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const path = join(root, 'packages/intake-core/src/artifacts/bank-embeddings.v1.json');
const raw = readFileSync(path, 'utf8');
const j = JSON.parse(raw);
if (typeof j.version !== 'string' || !j.version) {
  console.error('bank-embeddings: missing version');
  process.exit(1);
}
if (typeof j.cosineDuplicateThreshold !== 'number' || j.cosineDuplicateThreshold <= 0 || j.cosineDuplicateThreshold > 1) {
  console.error('bank-embeddings: invalid cosineDuplicateThreshold');
  process.exit(1);
}
console.log('bank-embeddings artifact ok', j.version, j.model);
