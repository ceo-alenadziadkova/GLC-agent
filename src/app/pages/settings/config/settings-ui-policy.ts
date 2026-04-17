import type { CSSProperties } from 'react';
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

export const SETTINGS_UI_STYLES = {
  sectionCard: {
    backgroundColor: 'var(--bg-surface)',
    border: 'var(--border-width-default) solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
  } satisfies CSSProperties,
  fieldInput: {
    backgroundColor: 'var(--bg-canvas)',
    border: 'var(--border-width-default) solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
  } satisfies CSSProperties,
  selectedOption: {
    border: 'var(--border-width-default) solid var(--glc-blue)',
    color: 'var(--glc-blue)',
    backgroundColor: 'var(--callout-info-bg)',
  } satisfies CSSProperties,
  unselectedOption: {
    border: 'var(--border-width-default) solid var(--border-default)',
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
  } satisfies CSSProperties,
} as const;
