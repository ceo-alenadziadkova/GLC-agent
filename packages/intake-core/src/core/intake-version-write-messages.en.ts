/**
 * User-visible messages for intake version validation (API contract copy).
 */

export const INTAKE_VERSION_WRITE_MESSAGES = {
  unsupportedTuple: 'intake_versions tuple is not a supported artifact bundle',
  supportedHint: 'Send current engine tuple or omit intake_versions to reuse the stored tuple.',
  versionConflict: 'intake_versions does not match this brief row; refresh the brief or send the stored tuple.',
} as const;
