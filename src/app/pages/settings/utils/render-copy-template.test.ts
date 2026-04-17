import { describe, expect, it } from 'vitest';
import { renderCopyTemplate } from './render-copy-template';

describe('renderCopyTemplate', () => {
  it('replaces placeholders', () => {
    expect(renderCopyTemplate('At least {{min}} chars', { min: 8 })).toBe('At least 8 chars');
  });

  it('leaves unknown keys empty', () => {
    expect(renderCopyTemplate('Hello {{name}}', {})).toBe('Hello ');
  });
});
