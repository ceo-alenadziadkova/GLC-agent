import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { LEGAL_DOCUMENT_VERSIONS } from '@glc/api-paths';
import { toast } from 'sonner';
import { COOKIE_CONSENT_BANNER_EN } from '../../config/cookie-consent-banner.en';
import {
  COOKIE_CONSENT_PAYLOAD_SCHEMA_VERSION,
} from '../../config/cookie-consent-storage-policy';
import {
  GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT,
  LEGAL_CONSENT_KEYS,
} from '../../config/legal-consent-client-policy';
import { api } from '../../data/apiService';
import type { LegalConsentKey } from '../../data/api/brief-profile-platform';
import { useAuth } from '../../hooks/useAuth';
import {
  readCookieConsentFromStorage,
  writeCookieConsentToStorage,
} from '../../lib/cookie-consent-storage';
import { isAnonymousUser } from '../../lib/snapshot-auth';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Switch } from '../ui/switch';

type CookieConsentContextValue = {
  allowProductAnalytics: boolean;
  allowMarketing: boolean;
  openCookieSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (ctx == null) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return ctx;
}

function effectiveAccepted(
  effective: Array<{ consent_key: string; accepted: boolean }>,
  key: LegalConsentKey,
): boolean {
  const row = effective.find(e => e.consent_key === key);
  return row?.accepted === true;
}

function buildPersistPayload(productAnalytics: boolean, marketing: boolean) {
  return {
    schema: COOKIE_CONSENT_PAYLOAD_SCHEMA_VERSION,
    cookiesPolicyVersion: LEGAL_DOCUMENT_VERSIONS.cookiesPolicy,
    productAnalytics,
    marketing,
  } as const;
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const consentRef = useRef({ allowProductAnalytics: false });

  const diskInitial = useMemo(() => readCookieConsentFromStorage(), []);

  const [productAnalytics, setProductAnalytics] = useState(() => diskInitial?.productAnalytics ?? false);
  const [marketing, setMarketing] = useState(() => diskInitial?.marketing ?? false);
  const [bannerVisible, setBannerVisible] = useState(() => diskInitial == null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [draftMarketing, setDraftMarketing] = useState(false);

  useEffect(() => {
    consentRef.current.allowProductAnalytics = productAnalytics;
  }, [productAnalytics]);

  useEffect(() => {
    if (authLoading) {
      if (diskInitial == null) {
        setBannerVisible(false);
      }
      return;
    }

    const eligible = user != null && !isAnonymousUser(user);
    if (!eligible) {
      if (readCookieConsentFromStorage() == null) {
        setBannerVisible(true);
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const body = await api.getLegalConsents();
        if (cancelled) return;
        const pa = effectiveAccepted(body.effective, LEGAL_CONSENT_KEYS.productAnalytics);
        const mk = effectiveAccepted(body.effective, LEGAL_CONSENT_KEYS.marketing);
        setProductAnalytics(pa);
        setMarketing(mk);
        setBannerVisible(false);
        writeCookieConsentToStorage(buildPersistPayload(pa, mk));
      } catch {
        if (cancelled) return;
        const local = readCookieConsentFromStorage();
        if (local == null) {
          setBannerVisible(true);
        } else {
          setProductAnalytics(local.productAnalytics);
          setMarketing(local.marketing);
          setBannerVisible(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, diskInitial]);

  useEffect(() => {
    const refreshFromServer = () => {
      if (user == null || isAnonymousUser(user)) return;
      void (async () => {
        try {
          const body = await api.getLegalConsents();
          const pa = effectiveAccepted(body.effective, LEGAL_CONSENT_KEYS.productAnalytics);
          const mk = effectiveAccepted(body.effective, LEGAL_CONSENT_KEYS.marketing);
          setProductAnalytics(pa);
          setMarketing(mk);
          writeCookieConsentToStorage(buildPersistPayload(pa, mk));
        } catch {
          /* ignore */
        }
      })();
    };

    window.addEventListener(GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT, refreshFromServer);
    return () => {
      window.removeEventListener(GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT, refreshFromServer);
    };
  }, [user]);

  const pushToServer = useCallback(
    async (pa: boolean, mk: boolean) => {
      if (user == null || isAnonymousUser(user)) return;
      try {
        await api.postLegalConsents({
          source: 'api',
          events: [
            { consent_key: LEGAL_CONSENT_KEYS.productAnalytics, accepted: pa },
            { consent_key: LEGAL_CONSENT_KEYS.marketing, accepted: mk },
          ],
        });
      } catch {
        toast.error(COOKIE_CONSENT_BANNER_EN.syncFailed);
      }
    },
    [user],
  );

  const applyChoice = useCallback(
    async (pa: boolean, mk: boolean) => {
      setProductAnalytics(pa);
      setMarketing(mk);
      setBannerVisible(false);
      setSettingsOpen(false);
      writeCookieConsentToStorage(buildPersistPayload(pa, mk));
      await pushToServer(pa, mk);
    },
    [pushToServer],
  );

  const openCookieSettings = useCallback(() => {
    setDraftAnalytics(productAnalytics);
    setDraftMarketing(marketing);
    setSettingsOpen(true);
  }, [marketing, productAnalytics]);

  const ctx = useMemo(
    () => ({
      allowProductAnalytics: productAnalytics,
      allowMarketing: marketing,
      openCookieSettings,
    }),
    [marketing, openCookieSettings, productAnalytics],
  );

  const copy = COOKIE_CONSENT_BANNER_EN;

  return (
    <CookieConsentContext.Provider value={ctx}>
      {children}
      {bannerVisible ? (
        <aside
          className="ds-pattern-cookie-consent-bar"
          role="region"
          aria-label={copy.bannerLandmarkLabel}
        >
          <div className="ds-pattern-cookie-consent-bar-inner">
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-sm font-semibold ds-text-primary">{copy.title}</h2>
              <p className="mb-0 mt-2 text-sm leading-relaxed ds-text-secondary">{copy.description}</p>
              <p className="mb-0 mt-2 text-xs leading-relaxed ds-text-tertiary">
                <Link to={copy.routes.cookiesPolicy} className="underline-offset-2 hover:underline">
                  {copy.policyLinkLabel}
                </Link>
                {copy.linkSeparator}
                <Link to={copy.routes.privacyPolicy} className="underline-offset-2 hover:underline">
                  {copy.privacyLinkLabel}
                </Link>
              </p>
            </div>
            <div className="ds-pattern-cookie-consent-actions">
              <Button type="button" variant="outline" size="sm" onClick={() => void applyChoice(true, true)}>
                {copy.acceptAll}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void applyChoice(false, false)}>
                {copy.rejectAll}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={openCookieSettings}>
                {copy.openSettings}
              </Button>
            </div>
          </div>
        </aside>
      ) : null}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="ds-text-primary">{copy.dialog.title}</DialogTitle>
            <DialogDescription>{copy.dialog.description}</DialogDescription>
          </DialogHeader>
          <div className="ds-pattern-cookie-consent-dialog-categories">
            <div className="ds-pattern-cookie-consent-category-row">
              <div className="min-w-0">
                <p className="m-0 text-sm font-medium ds-text-primary">{copy.dialog.necessaryTitle}</p>
                <p className="mb-0 mt-1 text-xs leading-relaxed ds-text-secondary">
                  {copy.dialog.necessaryDescription}
                </p>
              </div>
              <Switch checked disabled aria-label={copy.dialog.necessaryAlwaysOn} />
            </div>
            <div className="ds-pattern-cookie-consent-category-row">
              <div className="min-w-0">
                <p className="m-0 text-sm font-medium ds-text-primary">{copy.dialog.analyticsTitle}</p>
                <p className="mb-0 mt-1 text-xs leading-relaxed ds-text-secondary">
                  {copy.dialog.analyticsDescription}
                </p>
              </div>
              <Switch
                checked={draftAnalytics}
                onCheckedChange={setDraftAnalytics}
                aria-label={copy.dialog.analyticsTitle}
              />
            </div>
            <div className="ds-pattern-cookie-consent-category-row">
              <div className="min-w-0">
                <p className="m-0 text-sm font-medium ds-text-primary">{copy.dialog.marketingTitle}</p>
                <p className="mb-0 mt-1 text-xs leading-relaxed ds-text-secondary">
                  {copy.dialog.marketingDescription}
                </p>
              </div>
              <Switch
                checked={draftMarketing}
                onCheckedChange={setDraftMarketing}
                aria-label={copy.dialog.marketingTitle}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
              {copy.dialog.cancel}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => void applyChoice(draftAnalytics, draftMarketing)}
            >
              {copy.dialog.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Analytics
        beforeSend={event => (consentRef.current.allowProductAnalytics ? event : null)}
      />
    </CookieConsentContext.Provider>
  );
}
