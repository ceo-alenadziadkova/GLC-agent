import { Microphone, Stop } from '@phosphor-icons/react';
import { cn } from '../ui/utils';
import { VOICE_INPUT_COPY } from '../../config/voice-input.copy.en';
import { useDictationField } from './dictation-context';

type DictationButtonProps = {
  onAppend: (chunk: string) => void;
  lang?: string;
  className?: string;
  /** Visually place on the end edge of a field (absolute positioning handled by parent). */
  'aria-label'?: string;
  disabled?: boolean;
};

/**
 * Start/stop dictation for a single text target. Renders nothing when unsupported.
 */
export function DictationButton({
  onAppend,
  lang,
  className,
  'aria-label': ariaLabel,
  disabled,
}: DictationButtonProps) {
  const { isSupported, isListening, toggle } = useDictationField({ onAppend, lang });

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      aria-pressed={isListening}
      aria-label={
        isListening
          ? VOICE_INPUT_COPY.stopDictation
          : (ariaLabel ?? VOICE_INPUT_COPY.startDictation)
      }
      title={
        isListening
          ? VOICE_INPUT_COPY.stopDictation
          : VOICE_INPUT_COPY.startDictation
      }
      onMouseDown={e => {
        // Avoid blurring the input when toggling.
        e.preventDefault();
      }}
      onClick={() => {
        if (!disabled) {
          toggle();
        }
      }}
      className={cn(
        'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex h-7 w-7 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2',
        isListening && 'text-destructive',
        className,
      )}
    >
      {isListening ? <Stop className="size-4" weight="fill" aria-hidden /> : <Microphone className="size-4" aria-hidden />}
    </button>
  );
}
