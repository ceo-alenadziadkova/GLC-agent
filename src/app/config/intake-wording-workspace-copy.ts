/**
 * English UI copy for the intake wording admin workspace (JSON CMS-style layer).
 */

import copy from '../locales/en/intake-wording-workspace-copy.en.json';

export const INTAKE_WORDING_WORKSPACE_COPY = copy;

export type IntakeWordingWorkspaceCopy = typeof copy;

/** Replace `{{published}}` and `{{total}}` in `info.publishPartial`. */
export function formatIntakeWordingPublishPartialMessage(
  template: string,
  published: number,
  total: number,
): string {
  return template.replace(/\{\{published\}\}/g, String(published)).replace(/\{\{total\}\}/g, String(total));
}
