import * as React from "react";

import { DictationButton } from "../dictation/dictation-button";
import { mergeAppendedText } from "../dictation/merge-dictation-text";
import { cn } from "./utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  /**
   * When true (default), show dictation when Web Speech is available.
   */
  voiceInput?: boolean;
};

function shouldOfferVoiceTextarea(
  readOnly: boolean | undefined,
  disabled: boolean | undefined,
  className: string | undefined,
  voiceInput: boolean | undefined,
): boolean {
  if (voiceInput === false) {
    return false;
  }
  if (disabled || readOnly) {
    return false;
  }
  if (className?.split(/\s+/).includes("sr-only")) {
    return false;
  }
  return true;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, voiceInput, readOnly, disabled, value, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    const showVoice = shouldOfferVoiceTextarea(readOnly, disabled, className, voiceInput);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      },
      [ref],
    );

    const handleAppend = React.useCallback(
      (chunk: string) => {
        const el = innerRef.current;
        const current =
          value !== undefined
            ? String(value ?? "")
            : (el?.value ?? "");
        const next = mergeAppendedText(current, chunk);
        if (el) {
          const setValue = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value",
          )?.set;
          if (setValue) {
            setValue.call(el, next);
          } else {
            el.value = next;
          }
          onChange?.({ target: el, currentTarget: el } as React.ChangeEvent<HTMLTextAreaElement>);
        } else {
          onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLTextAreaElement>);
        }
      },
      [value, onChange],
    );

    const textClass = cn(
      "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[length:var(--primitive-focus-ring-width)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className,
      showVoice && "pr-10",
    );

    const textEl = (
      <textarea
        ref={setRefs}
        data-slot="textarea"
        className={textClass}
        readOnly={readOnly}
        disabled={disabled}
        value={value}
        onChange={onChange}
        {...props}
      />
    );

    if (!showVoice) {
      return textEl;
    }

    return (
      <div className="relative w-full min-w-0" data-voice-textarea-wrap="true">
        {textEl}
        <div className="absolute right-1.5 top-1.5 z-[1]">
          <DictationButton onAppend={handleAppend} disabled={Boolean(disabled)} />
        </div>
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
