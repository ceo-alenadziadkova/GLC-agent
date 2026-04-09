/**
 * Simple cold/warm benchmark for buildIntakePlan caching paths.
 *
 * Usage:
 *   pnpm --dir server intake-plan-benchmark
 */
import { buildIntakePlan } from '../src/intake/core/build-intake-plan.js';
import { getBranchDepsCacheStats, resetBranchDepsCacheStats } from '../src/intake/core/branch-condition-deps.js';
import { currentIntakeVersionTuple } from '../src/intake/core/versions.js';
import type { IntakeVersionTuple } from '../src/types/audit.js';

type CaseInput = {
  label: string;
  tuple: IntakeVersionTuple;
  responses: Record<string, unknown>;
  productMode: 'full' | 'express';
  collectionMode: 'self_serve' | 'interview' | 'pre_brief' | 'discovery';
  iterations: number;
};

const FROZEN_TUPLE: IntakeVersionTuple = {
  questionBankVersion: '1.1.0',
  policyVersion: '1.0.0',
  layoutVersion: '1.1.0',
  resolverVersion: '1.0.0',
};

function elapsedMs(fn: () => void): number {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

function runCase(input: CaseInput): {
  label: string;
  coldMs: number;
  warmMs: number;
  perRunWarmMs: number;
  stats: ReturnType<typeof getBranchDepsCacheStats>;
} {
  resetBranchDepsCacheStats();

  const coldMs = elapsedMs(() => {
    buildIntakePlan({
      responses: input.responses,
      productMode: input.productMode,
      collectionMode: input.collectionMode,
      intakeVersionTuple: input.tuple,
    });
  });

  const warmMs = elapsedMs(() => {
    for (let i = 0; i < input.iterations; i += 1) {
      buildIntakePlan({
        responses: input.responses,
        productMode: input.productMode,
        collectionMode: input.collectionMode,
        intakeVersionTuple: input.tuple,
      });
    }
  });

  return {
    label: input.label,
    coldMs: Number(coldMs.toFixed(3)),
    warmMs: Number(warmMs.toFixed(3)),
    perRunWarmMs: Number((warmMs / input.iterations).toFixed(4)),
    stats: getBranchDepsCacheStats(),
  };
}

function main() {
  const current = currentIntakeVersionTuple();
  const cases: CaseInput[] = [
    {
      label: `current tuple (${current.policyVersion})`,
      tuple: current,
      responses: { a2: 'hospitality', a5: 'no_website', d1: ['CRM'], f1: 'Need growth' },
      productMode: 'full',
      collectionMode: 'self_serve',
      iterations: 1000,
    },
    {
      label: `frozen tuple (${FROZEN_TUPLE.policyVersion})`,
      tuple: FROZEN_TUPLE,
      responses: { a2: 'hospitality', a5: 'Yes, multi-page site', d1: ['Email'], f1: 'Need growth' },
      productMode: 'express',
      collectionMode: 'self_serve',
      iterations: 1000,
    },
  ];

  const rows = cases.map(runCase).map(r => ({
    case: r.label,
    cold_ms: r.coldMs,
    warm_total_ms: r.warmMs,
    warm_per_run_ms: r.perRunWarmMs,
    eval_order_builds: r.stats.evalOrderBuilds,
    response_deps_builds: r.stats.responseDepsBuilds,
  }));

  console.table(rows);
}

main();
