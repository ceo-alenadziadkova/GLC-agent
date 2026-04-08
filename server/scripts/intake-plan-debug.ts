/**
 * Debug CLI for buildIntakePlan — no server, no DB.
 *
 * Usage (from server/):
 *   npx tsx scripts/intake-plan-debug.ts --product-mode=full --collection-mode=discovery --responses='{"a2":"hospitality","a5":"no_website"}'
 *
 * Flags:
 *   --product-mode=   full | express | free_snapshot (default: full)
 *   --collection-mode=  discovery | pre_brief | self_serve | interview (optional)
 *   --surface=        optional label for trace header only
 *   --responses=      JSON object string (default: {})
 */
import type { IntakeBriefCollectionMode, ProductMode } from '../src/types/audit.js';
import { buildIntakePlan } from '../src/intake/core/build-intake-plan.js';
import { formatPlanTrace } from '../src/intake/core/format-trace.js';

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

function main(): void {
  const args = parseArgs(process.argv);
  const productMode = parseProductMode(args.product_mode);
  const collectionMode = parseCollectionMode(args.collection_mode);
  const surface = args.surface;

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

  const plan = buildIntakePlan({ responses, productMode, collectionMode });
  const text = formatPlanTrace(plan, {
    productMode,
    collectionMode: collectionMode ?? '(default self_serve visibility)',
    surface,
  });
  console.log(text);
}

main();
