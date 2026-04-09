import { useEffect } from 'react';
import { toast } from 'sonner';

const TOAST_ID = 'glc-browser-translate-warning';

/** Chrome and some engines tag `<html>` when the built-in page translator runs (mutates DOM; breaks React reconciliation). */
function isDocumentElementTranslated(): boolean {
  const el = document.documentElement;
  return el.classList.contains('translated-ltr') || el.classList.contains('translated-rtl');
}

/**
 * Warns if live translation is active so users can turn it off before the SPA hits NotFoundError / insertBefore crashes.
 * Does not block translation — only surfaces recovery guidance.
 */
export function BrowserTranslateGuard() {
  useEffect(() => {
    const message =
      'Automatic page translation can interfere with this app. Turn off translation for this site in your browser, then refresh if anything looks wrong.';

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
