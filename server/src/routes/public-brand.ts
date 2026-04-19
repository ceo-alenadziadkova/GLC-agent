import { LEGAL_DOCUMENT_SPA_ROUTES, LEGAL_DOCUMENT_VERSIONS } from '@glc/api-paths';
import { Router } from 'express';
import { getPublicBrandConfig } from '../config/public-brand-config.js';

/**
 * Unauthenticated public config for marketing shell and white-label installs.
 */
export const publicBrandRouter = Router();

publicBrandRouter.get('/brand', (_req, res) => {
  res.json(getPublicBrandConfig());
});

/** Published legal document version identifiers for signup links and CMP wiring. */
publicBrandRouter.get('/legal-documents', (_req, res) => {
  res.json({
    bundle: LEGAL_DOCUMENT_VERSIONS.bundle,
    terms_of_service: {
      version: LEGAL_DOCUMENT_VERSIONS.termsOfService,
      path: LEGAL_DOCUMENT_SPA_ROUTES.termsOfService,
    },
    privacy_policy: {
      version: LEGAL_DOCUMENT_VERSIONS.privacyPolicy,
      path: LEGAL_DOCUMENT_SPA_ROUTES.privacyPolicy,
    },
    data_processing_agreement: {
      version: LEGAL_DOCUMENT_VERSIONS.dataProcessingAgreement,
      path: LEGAL_DOCUMENT_SPA_ROUTES.dataProcessingAgreement,
    },
    legal_notice: {
      version: LEGAL_DOCUMENT_VERSIONS.legalNotice,
      path: LEGAL_DOCUMENT_SPA_ROUTES.legalNotice,
    },
    cookies_policy: {
      version: LEGAL_DOCUMENT_VERSIONS.cookiesPolicy,
      path: LEGAL_DOCUMENT_SPA_ROUTES.cookiePolicy,
    },
  });
});
