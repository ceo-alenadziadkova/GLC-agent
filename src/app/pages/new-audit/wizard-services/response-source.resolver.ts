import type { BriefResponseSource } from '../../../data/auditTypes';

export function resolveResponseSource(params: {
  isClientSelfServe: boolean;
  interviewMode: boolean;
}): BriefResponseSource {
  if (params.isClientSelfServe) return 'client';
  return params.interviewMode ? 'consultant' : 'client';
}
