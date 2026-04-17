import {
  getQuestionBankReportUse,
  QUESTION_BANK_V1_IDS,
  getResponseString,
  isIntakeAnswered,
} from '@glc/intake-core';

export function computeIntakeReportAnchors(responses: Record<string, unknown>): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const id of QUESTION_BANK_V1_IDS) {
    if (!Object.prototype.hasOwnProperty.call(responses, id)) continue;
    if (!isIntakeAnswered(responses[id])) continue;
    const tag = getQuestionBankReportUse(id);
    if (!tag) continue;
    const s = getResponseString(responses, id);
    if (s.length === 0) continue;
    if (out[tag] !== undefined) continue;
    out[tag] = s;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
