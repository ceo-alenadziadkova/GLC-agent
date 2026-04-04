/**
 * Agent context slices — docs/QUESTION_BANK.md §5.
 * Canonical map is built from primary/secondary feeds in question-feed-roles.ts; ordered per bank in question-bank.ts.
 */
export {
  DOMAIN_TO_QUESTIONS_RAW,
  QUESTION_FEED_ROLES,
  buildDomainToQuestionsRawFromRoles,
  getDomainsForQuestionId,
  isPrimaryFeedForDomain,
  isSecondaryFeedForDomain,
  SLICE_DOMAIN_ORDER,
} from './question-feed-roles.js';
export type { QuestionFeedRoles } from './question-feed-roles.js';
