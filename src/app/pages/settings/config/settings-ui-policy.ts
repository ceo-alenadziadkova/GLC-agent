import { SETTINGS_PAGE_DEFAULTS } from '../../../config/settings-page-defaults';

export const SETTINGS_UI_POLICY = {
  tabs: {
    general: 'general',
    bankStudio: 'bank-studio',
  },
  hashes: {
    briefLayoutAnchor: SETTINGS_PAGE_DEFAULTS.scrollAnchorHash,
    bankStudio: SETTINGS_PAGE_DEFAULTS.questionBankStudioHash,
  },
  timingsMs: {
    initialAnchorScroll: 100,
  },
} as const;
