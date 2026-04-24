import * as React from "react";

import { DictationButton } from "../dictation/dictation-button";
import { mergeAppendedText } from "../dictation/merge-dictation-text";
import { cn } from "./utils";

const VOICE_EXCLUDED_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "file",
  "hidden",
  "image",
  "month",
  "number",
  "password",
  "radio",
  "range",
  "reset",
  "submit",
  "time",
  "week",
]);

type InputProps = React.ComponentProps<"input"> & {
  /**
   * When true (default for supported text-like types), show dictation control when the browser supports Web Speech.
   * Set false for fields where speech is confusing (e.g. tightly controlled UIs).
   */
  voiceInput?: boolean;
};

function shouldOfferVoice(
  type: string,
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
  if (VOICE_EXCLUDED_INPUT_TYPES.has(type)) {
    return false;
  }
  return true;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, voiceInput, readOnly, disabled, value, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const resolvedType = type ?? "text";
    const showVoice = shouldOfferVoice(resolvedType, readOnly, disabled, className, voiceInput);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
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
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          if (setValue) {
            setValue.call(el, next);
          } else {
            el.value = next;
          }
          onChange?.({ target: el, currentTarget: el } as React.ChangeEvent<HTMLInputElement>);
        } else {
          onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLInputElement>);
        }
      },
      [value, onChange],
    );

    const inputClass = cn(
      "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[length:var(--primitive-focus-ring-width)]",
      "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
      className,
      showVoice && "pr-9",
    );

    const inputEl = (
      <input
        ref={setRefs}
        type={type}
        data-slot="input"
        className={inputClass}
        readOnly={readOnly}
        disabled={disabled}
        value={value}
        onChange={onChange}
        {...props}
      />
    );

    if (!showVoice) {
      return inputEl;
    }

    return (
      <div className="relative w-full min-w-0" data-voice-input-wrap="true">
        {inputEl}
        <div className="absolute right-1 top-1/2 z-[1] -translate-y-1/2">
          <DictationButton onAppend={handleAppend} disabled={Boolean(disabled)} />
        </div>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
