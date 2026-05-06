import { describe, expect, it } from 'vitest';

import {
  CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS,
  CANONICAL_NODE_KEY_TITLE_MAX_CHARS,
  canonicalNodeKeyFromManifestAndNode,
  normalizeTitleForCanonicalNodeKey,
} from '../canonical-node-key.js';

describe('canonicalNodeKeyFromManifestAndNode', () => {
  const base = {
    manifest_signature: 'hybrid::rolling_90d::2026-01-01::2026-04-01',
    lane_id: 'tech_delivery',
    title: 'Ship checkout reliability',
  };

  it('is idempotent for identical inputs', () => {
    const a = canonicalNodeKeyFromManifestAndNode(base);
    const b = canonicalNodeKeyFromManifestAndNode(base);
    expect(a).toBe(b);
    expect(a.startsWith('cnk_v1_')).toBe(true);
  });

  it('is stable under cosmetic title edits', () => {
    const a = canonicalNodeKeyFromManifestAndNode(base);
    const b = canonicalNodeKeyFromManifestAndNode({
      ...base,
      title: '  ship checkout reliability!!  ',
    });
    expect(a).toBe(b);
  });

  it('changes when title semantics change materially', () => {
    const a = canonicalNodeKeyFromManifestAndNode(base);
    const b = canonicalNodeKeyFromManifestAndNode({
      ...base,
      title: 'Rebuild payments platform',
    });
    expect(a).not.toBe(b);
  });

  it('changes when lane changes', () => {
    const a = canonicalNodeKeyFromManifestAndNode(base);
    const b = canonicalNodeKeyFromManifestAndNode({ ...base, lane_id: 'marketing_narrative' });
    expect(a).not.toBe(b);
  });

  it('bounds normalized title length', () => {
    const longTitle = `${'x '.repeat(CANONICAL_NODE_KEY_TITLE_MAX_CHARS)}end`;
    const norm = normalizeTitleForCanonicalNodeKey(longTitle);
    expect(norm.length).toBeLessThanOrEqual(CANONICAL_NODE_KEY_TITLE_MAX_CHARS);
  });

  it('is stable across title edits when board_identity_key is set (Epic 1)', () => {
    const a = canonicalNodeKeyFromManifestAndNode({
      ...base,
      title: 'First title',
      board_identity_key: 'initiative-stable-abc',
    });
    const b = canonicalNodeKeyFromManifestAndNode({
      ...base,
      title: 'Totally renamed initiative',
      board_identity_key: 'initiative-stable-abc',
    });
    expect(a).toBe(b);
  });

  it('differs between board_identity_key and title-hash path for same cosmetic title', () => {
    const withId = canonicalNodeKeyFromManifestAndNode({
      ...base,
      title: 'Same title',
      board_identity_key: 'my-stable',
    });
    const titleOnly = canonicalNodeKeyFromManifestAndNode({
      ...base,
      title: 'Same title',
    });
    expect(withId).not.toBe(titleOnly);
  });

  it('bounds board_identity_key normalized length', () => {
    const longId = `${'y'.repeat(CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS + 80)}`;
    const key = canonicalNodeKeyFromManifestAndNode({
      ...base,
      title: 'x',
      board_identity_key: longId,
    });
    expect(key.startsWith('cnk_v1_')).toBe(true);
  });
});
