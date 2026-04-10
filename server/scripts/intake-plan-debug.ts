/**
 * Debug CLI for buildIntakePlan — no server, no DB.
 *
 * Usage (from server/):
 *   pnpm intake-plan-debug --product-mode=full --collection-mode=discovery --surface=public_discovery --responses='{"a2":"hospitality","a5":"no_website"}'
 *   pnpm intake-plan-debug --format=json --responses='{}'
 *
 * Flags:
 *   --product-mode=     full | express | free_snapshot (default: full)
 *   --collection-mode=  discovery | pre_brief | self_serve | interview (optional)
 *   --surface=          consultant_interview | client_form | client_portal | internal_review | public_discovery (optional; drives layout when discovery + public_discovery)
 *   --responses=        JSON object string (default: {})
 *   --format=           text (default) | json — full IntakePlan JSON for tooling / diff
 */
import type { IntakeBriefCollectionMode, ProductMode } from '../src/types/audit.js';
import { buildIntakePlan } from '@glc/intake-core';
import type { IntakeSurface } from '@glc/intake-core';
import { formatPlanTrace } from '@glc/intake-core';

const SURFACES: IntakeSurface[] = [
  'consultant_interview',
  'client_form',
  'client_portal',
  'internal_review',
  'public_discovery',
];

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq === -1) continue;
    const k = a.slice(2, eq).replace(/-/g, '_');
    out[k] = a.slice(eq + 1);
  }
  return out;
}

function parseProductMode(s: string | undefined): ProductMode {
  if (s === 'express' || s === 'full' || s === 'free_snapshot') return s;
  return 'full';
}

function parseCollectionMode(s: string | undefined): IntakeBriefCollectionMode | undefined {
  if (!s) return undefined;
  if (s === 'discovery' || s === 'pre_brief' || s === 'self_serve' || s === 'interview') return s;
  console.error(`Unknown collection_mode: ${s}`);
  process.exit(1);
}

function parseSurface(s: string | undefined): IntakeSurface | undefined {
  if (!s) return undefined;
  if ((SURFACES as string[]).includes(s)) return s as IntakeSurface;
  console.error(`Unknown surface: ${s}. Expected one of: ${SURFACES.join(', ')}`);
  process.exit(1);
}

function main(): void {
  const args = parseArgs(process.argv);
  const productMode = parseProductMode(args.product_mode);
  const collectionMode = parseCollectionMode(args.collection_mode);
  const surface = parseSurface(args.surface);

  let responses: Record<string, unknown> = {};
  if (args.responses) {
    try {
      const parsed = JSON.parse(args.responses) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.error('--responses must be a JSON object');
        process.exit(1);
      }
      responses = parsed as Record<string, unknown>;
    } catch {
      console.error('Invalid JSON for --responses');
      process.exit(1);
    }
  }

  const plan = buildIntakePlan({ responses, productMode, collectionMode, surface });
  const fmt = (args.format ?? 'text').toLowerCase();
  if (fmt === 'json') {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  if (fmt !== 'text') {
    console.error(`Unknown --format: ${args.format}. Use text or json.`);
    process.exit(1);
  }
  const text = formatPlanTrace(plan, {
    productMode,
    collectionMode: collectionMode ?? '(none)',
    surface: surface ?? '(none)',
  });
  console.log(text);
}

main();
