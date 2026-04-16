import { APP_RELEASE_META_DEFAULTS } from './app-release-meta-defaults';

export const APP_RELEASE_META = {
  generatedLabel:
    import.meta.env.VITE_AUDIT_NAV_GENERATED_LABEL?.trim() || APP_RELEASE_META_DEFAULTS.generatedLabel,
  version: import.meta.env.VITE_APP_VERSION?.trim() || APP_RELEASE_META_DEFAULTS.version,
  edition: import.meta.env.VITE_APP_EDITION?.trim() || APP_RELEASE_META_DEFAULTS.edition,
} as const;

export function getAppReleaseMetaLine(): string {
  return `${APP_RELEASE_META.version} • ${APP_RELEASE_META.edition}`;
}
