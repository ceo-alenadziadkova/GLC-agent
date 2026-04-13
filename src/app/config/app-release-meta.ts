export const APP_RELEASE_META = {
  generatedLabel: import.meta.env.VITE_AUDIT_NAV_GENERATED_LABEL?.trim() || 'Generated metadata unavailable',
  version: import.meta.env.VITE_APP_VERSION?.trim() || 'dev',
  edition: import.meta.env.VITE_APP_EDITION?.trim() || 'Community',
} as const;

export function getAppReleaseMetaLine(): string {
  return `${APP_RELEASE_META.version} • ${APP_RELEASE_META.edition}`;
}
