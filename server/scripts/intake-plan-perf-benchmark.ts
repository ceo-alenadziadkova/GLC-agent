/**
 * Baseline benchmark for ADR performance roadmap.
 *
 * Usage:
 *   pnpm --dir server intake-plan-benchmark
 */
import {
  buildIntakePlan,
  recomputePlanIncremental,
} from '@glc/intake-core';
import { getBranchDepsCacheStats, resetBranchDepsCacheStats } from '@glc/intake-core';
import { currentIntakeVersionTuple } from '@glc/intake-core';
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
  questionBankVersion: '1.0.0',
  policyVersion: '1.0.0',
  layoutVersion: '1.1.0',
  resolverVersion: '1.0.0',
  sequencingVersion: '1.0.0',
};

function elapsedMs(fn: () => void): number {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function runCase(input: CaseInput): {
  label: string;
  coldMs: number;
  warmMs: number;
  perRunWarmMs: number;
  fullRebuildP95: number;
  incrementalP95: number;
  speedupP95: number;
  memoryRssDeltaMb: number;
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

  const fullRebuildSamples: number[] = [];
  const incrementalSamples: number[] = [];
  let prev = buildIntakePlan({
    responses: input.responses,
    productMode: input.productMode,
    collectionMode: input.collectionMode,
    intakeVersionTuple: input.tuple,
  });
  for (let i = 0; i < input.iterations; i += 1) {
    const nextResponses = {
      ...input.responses,
      f1: `Need growth ${i % 7}`,
    };
    fullRebuildSamples.push(
      elapsedMs(() => {
        buildIntakePlan({
          responses: nextResponses,
          productMode: input.productMode,
          collectionMode: input.collectionMode,
          intakeVersionTuple: input.tuple,
        });
      }),
    );
    incrementalSamples.push(
      elapsedMs(() => {
        prev = recomputePlanIncremental(prev.runtimeState!, {
          responses: nextResponses,
          changedResponseKeys: ['f1'],
          productMode: input.productMode,
          collectionMode: input.collectionMode,
          intakeVersionTuple: input.tuple,
        });
      }),
    );
  }
  const fullRebuildP95 = percentile(fullRebuildSamples, 95);
  const incrementalP95 = percentile(incrementalSamples, 95);
  const speedupP95 = incrementalP95 > 0 ? fullRebuildP95 / incrementalP95 : 0;
  const memBefore = process.memoryUsage().rss;
  for (let i = 0; i < 100; i += 1) {
    recomputePlanIncremental(prev.runtimeState!, {
      responses: { ...input.responses, f1: `warm ${i}` },
      changedResponseKeys: ['f1'],
      productMode: input.productMode,
      collectionMode: input.collectionMode,
      intakeVersionTuple: input.tuple,
    });
  }
  const memAfter = process.memoryUsage().rss;
  const memoryRssDeltaMb = (memAfter - memBefore) / (1024 * 1024);

  return {
    label: input.label,
    coldMs: Number(coldMs.toFixed(3)),
    warmMs: Number(warmMs.toFixed(3)),
    perRunWarmMs: Number((warmMs / input.iterations).toFixed(4)),
    fullRebuildP95: Number(fullRebuildP95.toFixed(4)),
    incrementalP95: Number(incrementalP95.toFixed(4)),
    speedupP95: Number(speedupP95.toFixed(2)),
    memoryRssDeltaMb: Number(memoryRssDeltaMb.toFixed(3)),
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
    full_rebuild_p95_ms: r.fullRebuildP95,
    incremental_p95_ms: r.incrementalP95,
    speedup_p95_x: r.speedupP95,
    memory_rss_delta_mb: r.memoryRssDeltaMb,
    eval_order_builds: r.stats.evalOrderBuilds,
    response_deps_builds: r.stats.responseDepsBuilds,
  }));

  console.table(rows);
  console.log('Suggested SLO baseline: incremental_p95_ms <= 0.75 * full_rebuild_p95_ms');
}

main();
