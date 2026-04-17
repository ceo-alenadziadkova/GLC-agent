import { useEffect } from 'react';
import { toast } from 'sonner';
import { BROWSER_TRANSLATE_COPY_EN } from '../config/translation-safety-copy.en';

const TOAST_ID = 'glc-browser-translate-warning';

/** Chrome and some engines tag `<html>` when the built-in page translator runs (mutates DOM; breaks React reconciliation). */
function isDocumentElementTranslated(): boolean {
  const el = document.documentElement;
  return el.classList.contains('translated-ltr') || el.classList.contains('translated-rtl');
}

/**
 * Warns when live translation is active. Translation stays allowed, but users get
 * guidance because browser/extensions can rewrite DOM and break React updates.
 */
export function BrowserTranslateGuard() {
  useEffect(() => {
    const message = BROWSER_TRANSLATE_COPY_EN.translationDetectedWarning;

    const fire = () => {
      toast.warning(message, { duration: 14_000, id: TOAST_ID });
    };

    if (isDocumentElementTranslated()) {
      fire();
    }

    const obs = new MutationObserver(() => {
      if (isDocumentElementTranslated()) {
        fire();
        obs.disconnect();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return null;
}
