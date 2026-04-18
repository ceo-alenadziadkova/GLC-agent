import { COLOR_TOKENS } from '../../design-system/tokens/colors';
import { RADIUS_TOKENS } from '../../design-system/tokens/radius';
import { SHADOW_TOKENS } from '../../design-system/tokens/shadows';
import { SPACING_TOKENS } from '../../design-system/tokens/spacing';
import { TYPOGRAPHY_TOKENS } from '../../design-system/tokens/typography';

export type DesignSystemSwatchItem = {
  id: string;
  label: string;
  /** Always a CSS `var(--*)` reference from token maps. */
  cssVar: string;
};

function itemsFromRecord(record: Record<string, string>, idPrefix: string): DesignSystemSwatchItem[] {
  return Object.entries(record).map(([k, v]) => ({
    id: `${idPrefix}-${k}`,
    label: k,
    cssVar: v,
  }));
}

/** Curated color boards for the internal DS gallery (derived from COLOR_TOKENS). */
export const DS_INTERNAL_COLOR_GROUPS = [
  { id: 'brand', title: 'Brand', items: itemsFromRecord(COLOR_TOKENS.cssVars.brand, 'brand') },
  { id: 'surface', title: 'Background', items: itemsFromRecord(COLOR_TOKENS.cssVars.bg, 'bg') },
  { id: 'text', title: 'Text', items: itemsFromRecord(COLOR_TOKENS.cssVars.text, 'text') },
  { id: 'border', title: 'Border', items: itemsFromRecord(COLOR_TOKENS.cssVars.border, 'border') },
  { id: 'overlay', title: 'Overlay', items: itemsFromRecord(COLOR_TOKENS.cssVars.overlay, 'overlay') },
  { id: 'score', title: 'Score scale', items: itemsFromRecord(COLOR_TOKENS.semantic.status, 'score') },
  { id: 'callout', title: 'Callout', items: itemsFromRecord(COLOR_TOKENS.semantic.callout, 'callout') },
  { id: 'uiSemantic', title: 'UI semantic', items: itemsFromRecord(COLOR_TOKENS.semantic.uiSemantic, 'ui') },
] as const;

export const DS_INTERNAL_TYPOGRAPHY_SCALE = Object.entries(TYPOGRAPHY_TOKENS.fontSize).map(([key, cssVar]) => ({
  id: `fs-${key}`,
  key,
  cssVar,
}));

export const DS_INTERNAL_SPACING_SCALE = Object.entries(SPACING_TOKENS).map(([key, cssVar]) => ({
  id: `sp-${key}`,
  key,
  cssVar,
}));

export const DS_INTERNAL_RADIUS_SCALE = Object.entries(RADIUS_TOKENS).map(([key, cssVar]) => ({
  id: `rad-${key}`,
  key,
  cssVar,
}));

export const DS_INTERNAL_SHADOW_SCALE = Object.entries(SHADOW_TOKENS).map(([key, cssVar]) => ({
  id: `sh-${key}`,
  key,
  cssVar,
}));

export const DS_INTERNAL_TYPOGRAPHY_BODY = {
  fontFamily: TYPOGRAPHY_TOKENS.fontFamily.sans,
  lineHeight: TYPOGRAPHY_TOKENS.lineHeight.normal,
} as const;
