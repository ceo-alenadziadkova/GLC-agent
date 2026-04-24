import { STRATEGY_BRIEF_SIGNAL_QUESTION_IDS } from '../../../config/strategy-initiative-policy.js';
import type { IdeaStageReadinessView, ReportInput } from '../types.js';

function readResponseValue(responses: Record<string, unknown>, key: string): unknown {
  const raw = responses[key];
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw) && 'value' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).value;
  }
  return raw;
}

export function buildIdeaStageReadiness(input: ReportInput): IdeaStageReadinessView | undefined {
  const responses = input.brief_responses;
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) return undefined;

  const evidence = readResponseValue(responses, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaProblemEvidence);
  const icp = readResponseValue(responses, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaIcpClarity);
  const gtm = readResponseValue(responses, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaGtmTests);
  const constraint = readResponseValue(responses, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaLaunchConstraint);

  const hasAnyIdeaSignals = evidence != null || icp != null || gtm != null || constraint != null;
  if (!hasAnyIdeaSignals) return undefined;

  const validation_signal: IdeaStageReadinessView['validation_signal'] =
    evidence === 'I have paid pilots or early customers'
      ? 'strong'
      : evidence === 'Strong interview or survey validation'
        ? 'partial'
        : evidence === 'Informal conversations only' || evidence === 'Mostly my assumption for now'
          ? 'weak'
          : 'unknown';

  const icp_clarity: IdeaStageReadinessView['icp_clarity'] =
    typeof icp === 'string' && icp.startsWith('Very clear')
      ? 'clear'
      : typeof icp === 'string' && icp.startsWith('Partly clear')
        ? 'partial'
        : typeof icp === 'string' && (icp.startsWith('Broad audience') || icp.startsWith('Not defined'))
          ? 'broad'
          : 'unknown';

  const gtmOptions = Array.isArray(gtm) ? gtm.filter((item): item is string => typeof item === 'string') : [];
  const gtm_test_ready = gtmOptions.length > 0 && !gtmOptions.includes('Not ready to run tests yet');
  const launch_constraint = typeof constraint === 'string' && constraint.trim().length > 0 ? constraint : null;

  const note =
    validation_signal === 'weak' || icp_clarity === 'broad' || !gtm_test_ready
      ? 'Idea-stage signals are still forming. Prioritize validation and low-cost go-to-market experiments before scalable execution tracks.'
      : 'Idea-stage signals are sufficiently defined for execution planning. You can prioritize scalable implementation tracks in the roadmap.';

  return {
    enabled: true,
    validation_signal,
    icp_clarity,
    gtm_test_ready,
    launch_constraint,
    note,
  };
}
