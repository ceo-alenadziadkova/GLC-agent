/**
 * AUTO-GENERATED data lives in wappalyzer-imported-rules.json
 * (ingested from enthec/webappanalyzer by scripts/ingest-webappalyzer.mjs).
 * Do not edit the JSON by hand. Re-run the script to refresh.
 *
 * Patterns are Wappalyzer-style regex sources (case-insensitive); \;tags stripped at ingest.
 */
import rawRules from './wappalyzer-imported-rules.json' with { type: 'json' };

export type WappalyzerImportedRuleRaw = {
  category:
    | 'cms'
    | 'analytics'
    | 'frameworks'
    | 'hosting_cdn'
    | 'chat_support'
    | 'ecommerce'
    | 'email_marketing'
    | 'booking';
  name: string;
  html?: string[];
  scriptSrc?: string[];
  scripts?: string[];
  url?: string[];
  meta?: Array<{ kind: 'name' | 'property'; key: string; pattern: string }>;
};

export const WAPPALYZER_IMPORTED_RULES_RAW: readonly WappalyzerImportedRuleRaw[] =
  rawRules as readonly WappalyzerImportedRuleRaw[];
