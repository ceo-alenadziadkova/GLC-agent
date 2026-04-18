import { getQuestionBankSchemaMeta } from '@glc/intake-core';
import type { IntakeQuestionStub } from '@glc/intake-core';

/** Fallback when schema meta has no section (matches legacy Studio behavior). */
export const STUDIO_GRAPH_UNKNOWN_SECTION_KEY = '—';

/**
 * Canon section order and membership from `question-bank.v1.json` stub order (single source for Studio tree).
 */
export function partitionStubsByCanonSection(stubs: readonly IntakeQuestionStub[]): {
  sectionKeysInOrder: string[];
  sectionMembers: Map<string, IntakeQuestionStub[]>;
} {
  const sectionOrder: string[] = [];
  const sectionMembers = new Map<string, IntakeQuestionStub[]>();
  for (const stub of stubs) {
    const meta = getQuestionBankSchemaMeta(stub.id);
    const sectionKey = meta?.section ?? STUDIO_GRAPH_UNKNOWN_SECTION_KEY;
    if (!sectionMembers.has(sectionKey)) {
      sectionMembers.set(sectionKey, []);
      sectionOrder.push(sectionKey);
    }
    sectionMembers.get(sectionKey)!.push(stub);
  }
  return { sectionKeysInOrder: sectionOrder, sectionMembers };
}
