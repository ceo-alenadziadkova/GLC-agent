import type { FreeSnapshotPreview, SnapshotScanCoverageApi } from '../../types/audit.js';
import { normalizeScanCoverageFromStoredJson } from '@glc/snapshot-scan-coverage';

function normalizeSnapshotScanCoverageFromStoredDet(stored: unknown): SnapshotScanCoverageApi | null {
  return normalizeScanCoverageFromStoredJson(stored) as SnapshotScanCoverageApi | null;
}

export function applyDeterministicRecordToPreview(
  preview: FreeSnapshotPreview,
  det: Record<string, unknown>,
): void {
  if (typeof det.overall_score === 'number') preview.overall_score = det.overall_score;
  if (det.category_scores && typeof det.category_scores === 'object') {
    preview.category_scores = det.category_scores as FreeSnapshotPreview['category_scores'];
  }
  if (typeof det.scan_basis === 'string') preview.scan_basis = det.scan_basis;
  if (Array.isArray(det.signals_found)) {
    preview.signals_found = det.signals_found as string[];
  }
  if (det.scan_confidence_band === 'high' || det.scan_confidence_band === 'medium' || det.scan_confidence_band === 'low') {
    preview.scan_confidence_band = det.scan_confidence_band;
  }
  if (det.site_profile && typeof det.site_profile === 'object') {
    preview.site_profile = det.site_profile as FreeSnapshotPreview['site_profile'];
  }
  if (
    det.classification_confidence_band === 'high' ||
    det.classification_confidence_band === 'medium' ||
    det.classification_confidence_band === 'low'
  ) {
    preview.classification_confidence_band = det.classification_confidence_band;
  } else if (preview.site_profile?.classificationConfidenceBand) {
    preview.classification_confidence_band = preview.site_profile.classificationConfidenceBand;
  }
  const normalizedCov = normalizeSnapshotScanCoverageFromStoredDet(det.scan_coverage);
  if (normalizedCov) {
    preview.scan_coverage = normalizedCov;
  }
  if (typeof det.audit_rules_version === 'number') {
    preview.audit_rules_version = det.audit_rules_version;
  }
  if (det.cache_hit === true) {
    preview.cache_hit = true;
    preview.scan_basis_code = 'cache_hit';
  } else if (
    det.scan_basis_code === 'homepage_only' ||
    det.scan_basis_code === 'homepage_plus_core_pages' ||
    det.scan_basis_code === 'homepage_rendered_fallback' ||
    det.scan_basis_code === 'degraded' ||
    det.scan_basis_code === 'cache_hit'
  ) {
    preview.scan_basis_code = det.scan_basis_code;
  }
  if (typeof det.scanned_at === 'string') {
    preview.scanned_at = det.scanned_at;
  }
  if (Array.isArray(det.limitations)) {
    preview.limitations = det.limitations as string[];
  }
  if (typeof det.classification_version === 'number') {
    preview.classification_version = det.classification_version;
  }
  if (det.classification_transparency && typeof det.classification_transparency === 'object') {
    preview.classification_transparency =
      det.classification_transparency as FreeSnapshotPreview['classification_transparency'];
  }
  if (typeof det.fetch_strategy_version === 'string') {
    preview.fetch_strategy_version = det.fetch_strategy_version;
  }
  if (typeof det.snapshot_engine_version === 'string') {
    preview.snapshot_engine_version = det.snapshot_engine_version;
  }
  if (det.snapshot_access_blocked === true) {
    preview.snapshot_access_blocked = true;
    preview.snapshot_access_robots_blocked = det.snapshot_access_robots_blocked === true;
  }
  const hs = det.homepage_snippet;
  if (hs && typeof hs === 'object' && hs !== null) {
    const o = hs as { title?: unknown; description?: unknown };
    const title = typeof o.title === 'string' ? o.title : '';
    const description = typeof o.description === 'string' ? o.description : '';
    if (title.trim() || description.trim()) {
      preview.homepage_snippet = { title, description };
    }
  }
  const tst = det.tech_stack_tentative;
  if (Array.isArray(tst) && tst.length > 0) {
    preview.tech_stack_tentative = tst as FreeSnapshotPreview['tech_stack_tentative'];
  }
  const av = det.ai_visibility as FreeSnapshotPreview['ai_visibility'] | undefined;
  if (av && Array.isArray(av.gaps)) {
    preview.ai_visibility = { gaps: av.gaps };
  }
}
