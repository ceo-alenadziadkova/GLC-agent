/**
 * Public entrypoints for deterministic snapshot orchestration and API mapping.
 * Implementation lives in `services/`, `domain/`, `mappers/`, and `observability/`.
 */
export type { DeterministicSnapshotResult } from './services/run-deterministic-snapshot.service.js';
export { runDeterministicSnapshot } from './services/run-deterministic-snapshot.service.js';
export { derivePublicUxFieldsFromSnapshotPayload } from './domain/snapshot-domain-result.js';
export { toApiSiteProfile } from './mappers/snapshot-site-profile-api.mapper.js';
export { toApiScanCoverage } from './mappers/snapshot-scan-coverage-api.mapper.js';
export { snapshotPayloadToDeterministicApiRecord } from './mappers/snapshot-deterministic-api.mapper.js';
