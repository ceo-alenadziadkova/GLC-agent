/**
 * Human-readable formatter for IntakePlan (debug CLI and logs).
 */
import type { IntakePlan } from './types.js';

export interface FormatTraceMeta {
  productMode?: string;
  collectionMode?: string;
  surface?: string;
}

function lines(ids: string[], maxList: number): string {
  if (ids.length <= maxList) return ids.join(', ');
  return `${ids.slice(0, maxList).join(', ')} ... (+${ids.length - maxList} more)`;
}

export function formatPlanTrace(plan: IntakePlan, meta?: FormatTraceMeta): string {
  const parts: string[] = [];
  parts.push('=== Intake plan ===');
  if (meta?.productMode != null) parts.push(`product_mode: ${meta.productMode}`);
  if (meta?.collectionMode != null) parts.push(`collection_mode: ${meta.collectionMode}`);
  if (meta?.surface != null) parts.push(`surface: ${meta.surface}`);
  parts.push(
    `versions: bank=${plan.versions.questionBankVersion} policy=${plan.versions.policyVersion} layout=${plan.versions.layoutVersion} resolver=${plan.versions.resolverVersion}`,
  );
  parts.push(
    `counts: eligible=${plan.eligible.length} visible=${plan.visible.length} required=${plan.required.length} hidden=${plan.hidden.length} deferred=${plan.deferred.length} slaVisible=${plan.slaVisibleBankIds.length}`,
  );
  parts.push(`eligible: ${lines(plan.eligible, 80)}`);
  if (plan.slaVisibleBankIds.length !== plan.eligible.length) {
    parts.push(`slaVisibleBankIds: ${lines(plan.slaVisibleBankIds, 80)}`);
  }
  parts.push(`visible: ${lines(plan.visible, 80)}`);
  parts.push(`required: ${lines(plan.required, 40)}`);
  parts.push(`hidden: ${lines(plan.hidden, 40)}`);
  parts.push(`deferred: ${lines(plan.deferred, 20)}`);

  parts.push('--- derived ---');
  parts.push(`aiReadinessScore: ${plan.derivedFacts.aiReadinessScore}`);
  parts.push(`segmentHints.websiteGate: ${plan.derivedFacts.segmentHints.websiteGate}`);
  const covEntries = Object.entries(plan.coverage.byDomain);
  if (covEntries.length > 0) {
    const cov = covEntries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : String(v)}`)
      .join(', ');
    parts.push(`coverage.byDomain: ${cov}`);
  }
  parts.push(`confidence.overall: ${plan.confidence.overall.toFixed(3)}`);
  if (plan.confidence.rationale?.length) {
    parts.push(`confidence.rationale: ${plan.confidence.rationale.join(' | ')}`);
  }
  if (plan.missingForReport.length > 0) {
    parts.push(`missingForReport: ${plan.missingForReport.join(', ')}`);
  }
  if (plan.derivedFacts.reportAnchors && Object.keys(plan.derivedFacts.reportAnchors).length > 0) {
    const ra = plan.derivedFacts.reportAnchors;
    parts.push(
      `reportAnchors: ${Object.keys(ra)
        .sort()
        .map(k => `${k}=${JSON.stringify(ra[k])}`)
        .join('; ')}`,
    );
  }
  if (plan.nextRecommended.length > 0) {
    parts.push(`nextRecommended: ${lines(plan.nextRecommended, 40)}`);
  }

  if (plan.debugTrace && plan.debugTrace.length > 0) {
    parts.push('--- debug trace ---');
    for (const e of plan.debugTrace) {
      parts.push(`[${e.layer}] ${e.level.toUpperCase()} ${e.code}: ${e.message}`);
    }
  }

  if (plan.reasonsById && Object.keys(plan.reasonsById).length > 0) {
    parts.push('--- reasons by question (sample) ---');
    const entries = Object.entries(plan.reasonsById).sort(([a], [b]) => a.localeCompare(b));
    let n = 0;
    const max = 40;
    for (const [qid, reasons] of entries) {
      if (n++ >= max) {
        parts.push(`... (+${entries.length - max} questions)`);
        break;
      }
      const rr = reasons.map(r => `${r.layer}/${r.state}/${r.code}`).join('; ');
      parts.push(`  ${qid}: ${rr}`);
    }
  }

  return parts.join('\n');
}
