import * as React from "react";
import { useCallback, useContext, useId, useMemo, useRef, useState } from "react";

type AppendHandler = (finalChunk: string) => void;

type Session = {
  fieldId: string;
  onAppend: AppendHandler;
};

type DictationContextValue = {
  isSupported: boolean;
  isListening: boolean;
  activeFieldId: string | null;
  start: (fieldId: string, onAppend: AppendHandler, lang?: string) => void;
  stop: () => void;
  isFieldActive: (fieldId: string) => boolean;
};

const DictationContext = React.createContext<DictationContextValue | null>(null);

function getBrowserSpeechRecognition():
  | (new () => SpeechRecognition)
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition })
      .webkitSpeechRecognition
  );
}

export function isSpeechDictationSupported(): boolean {
  return Boolean(getBrowserSpeechRecognition());
}

function defaultDictationLang(): string {
  if (typeof document === "undefined") {
    return "en-US";
  }
  const fromHtml = document.documentElement.getAttribute("lang");
  if (fromHtml && fromHtml.trim().length > 0) {
    return fromHtml;
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en-US";
}

export function DictationProvider({ children }: { children: React.ReactNode }) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const isSupported = useMemo(() => isSpeechDictationSupported(), []);

  const isListening = activeFieldId !== null;

  const stopInternal = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore: may already be stopped
      }
    }
    sessionRef.current = null;
    recognitionRef.current = null;
    setActiveFieldId(null);
  }, []);

  const stop = useCallback(() => {
    stopInternal();
  }, [stopInternal]);

  const start = useCallback(
    (fieldId: string, onAppend: AppendHandler, lang?: string) => {
      const Ctor = getBrowserSpeechRecognition();
      if (!Ctor) {
        return;
      }
      stopInternal();

      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      const resolvedLang = lang && lang.trim() ? lang : defaultDictationLang();
      rec.lang = resolvedLang;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        const active = sessionRef.current;
        if (!active || active.fieldId !== fieldId) {
          return;
        }
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            const text = res[0]?.transcript?.trim() ?? "";
            if (text) {
              active.onAppend(text);
            }
          }
        }
      };

      rec.onerror = () => {
        stopInternal();
      };

      rec.onend = () => {
        if (sessionRef.current?.fieldId === fieldId) {
          sessionRef.current = null;
        }
        recognitionRef.current = null;
        setActiveFieldId((prev) => (prev === fieldId ? null : prev));
      };

      sessionRef.current = { fieldId, onAppend };
      recognitionRef.current = rec;
      setActiveFieldId(fieldId);
      try {
        rec.start();
      } catch {
        sessionRef.current = null;
        recognitionRef.current = null;
        setActiveFieldId(null);
      }
    },
    [stopInternal],
  );

  const isFieldActive = useCallback(
    (fieldId: string) => activeFieldId === fieldId,
    [activeFieldId],
  );

  const value = useMemo<DictationContextValue>(
    () => ({
      isSupported,
      isListening,
      activeFieldId,
      start,
      stop: stopInternal,
      isFieldActive,
    }),
    [isSupported, isListening, activeFieldId, start, stopInternal, isFieldActive],
  );

  return <DictationContext.Provider value={value}>{children}</DictationContext.Provider>;
}

function useDictationContext(): DictationContextValue {
  const ctx = useContext(DictationContext);
  if (!ctx) {
    throw new Error("useDictationContext must be used within DictationProvider");
  }
  return ctx;
}

/**
 * Public hook for the dictation system (e.g. command palette) when not using useDictationField.
 */
export function useDictation(): DictationContextValue {
  return useDictationContext();
}

export function useDictationField(options: { onAppend: AppendHandler; lang?: string }): {
  fieldId: string;
  isSupported: boolean;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
} {
  const id = useId();
  const { isSupported, start, stop, isFieldActive } = useDictationContext();
  const { onAppend, lang } = options;
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  const isListening = isFieldActive(id);

  const startField = useCallback(() => {
    start(id, (chunk) => onAppendRef.current(chunk), lang);
  }, [id, start, lang]);

  const stopField = useCallback(() => {
    if (isFieldActive(id)) {
      stop();
    }
  }, [id, stop, isFieldActive]);

  const toggle = useCallback(() => {
    if (isFieldActive(id)) {
      stop();
    } else {
      startField();
    }
  }, [id, isFieldActive, startField, stop]);

  return {
    fieldId: id,
    isSupported,
    isListening,
    start: startField,
    stop: stopField,
    toggle,
  };
}
