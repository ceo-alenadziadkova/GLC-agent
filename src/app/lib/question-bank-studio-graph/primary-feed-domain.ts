import { QUESTION_FEED_ROLES } from '@glc/intake-core';

export const STUDIO_GRAPH_UNASSIGNED_PRIMARY_DOMAIN = 'unassigned';

export function primaryFeedDomain(questionId: string): string {
  const roles = QUESTION_FEED_ROLES[questionId];
  if (roles?.primary?.length) return roles.primary[0];
  return STUDIO_GRAPH_UNASSIGNED_PRIMARY_DOMAIN;
}
