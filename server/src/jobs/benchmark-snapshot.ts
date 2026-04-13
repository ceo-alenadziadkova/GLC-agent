/**
 * Entry point for scheduled benchmark recomputation (ADR-DOMAIN-BENCHMARKS).
 * Prefer HTTP: POST /api/benchmarks/recompute with `x-benchmark-recompute-secret`.
 */

export { computeAndStoreBenchmarkSnapshots } from '../services/benchmark-snapshot.js';
