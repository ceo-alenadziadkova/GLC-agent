import { describe, expect, it } from 'vitest';
import { SOCIAL_LINK_PATTERNS } from '../config/social-link-patterns.js';

describe('SOCIAL_LINK_PATTERNS.twitter', () => {
  const re = SOCIAL_LINK_PATTERNS.twitter;

  it('does not capture intent/share/i app routes', () => {
    expect('href="https://twitter.com/intent/tweet?url='.match(re)?.[1]).toBeUndefined();
    expect('https://x.com/intent/post?text=hi'.match(re)?.[1]).toBeUndefined();
    expect('https://twitter.com/share?url='.match(re)?.[1]).toBeUndefined();
    expect('https://x.com/i/flow/login'.match(re)?.[1]).toBeUndefined();
  });

  it('captures real profile slug', () => {
    expect('https://twitter.com/glcteches'.match(re)?.[1]).toBe('glcteches');
    expect('https://x.com/my_brand_12'.match(re)?.[1]).toBe('my_brand_12');
    expect('follow us twitter.com/ValidUser/status/1'.match(re)?.[1]).toBe('ValidUser');
  });
});
