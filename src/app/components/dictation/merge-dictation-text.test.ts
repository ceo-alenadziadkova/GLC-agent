import { describe, expect, it } from 'vitest';
import { mergeAppendedText } from './merge-dictation-text';

describe('mergeAppendedText', () => {
  it('appends a chunk with a space', () => {
    expect(mergeAppendedText('Hello', 'world')).toBe('Hello world');
  });

  it('trims and skips empty chunk', () => {
    expect(mergeAppendedText('Hello', '   ')).toBe('Hello');
  });
});
