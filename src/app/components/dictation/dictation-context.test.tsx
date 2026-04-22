import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { DictationProvider } from './dictation-context';
import { DictationButton } from './dictation-button';
import { VOICE_INPUT_COPY } from '../../config/voice-input.copy.en';

class MockSpeechRecognition {
  onresult: unknown = null;
  onend: unknown = null;
  onerror: unknown = null;
  lang = '';
  continuous = false;
  interimResults = false;
  start = vi.fn();
  stop = vi.fn();
}

describe('DictationProvider', () => {
  const saved = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;

  afterEach(() => {
    if (saved) {
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = saved;
    } else {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    }
  });

  it('exposes dictation start control when Web Speech is available', () => {
    (window as unknown as { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition = MockSpeechRecognition;
    render(
      <DictationProvider>
        <DictationButton onAppend={() => {}} />
      </DictationProvider>,
    );
    expect(screen.getByRole('button', { name: VOICE_INPUT_COPY.startDictation })).toBeInTheDocument();
  });
});
