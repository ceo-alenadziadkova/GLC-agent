import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import type { IntakeSurface } from '../../../server/src/intake/core/types';
import type { StudioPolicyMode } from './question-bank-studio-policy';

export type IntakeTraceScenarioPreset = {
  id: string;
  label: string;
  hint: string;
  productMode: ProductMode;
  collectionMode: IntakeBriefCollectionMode | '';
  surface: IntakeSurface | '';
  responsesText: string;
  /** When set, selecting this preset can sync Policy mode in Studio for a clearer map overlay. */
  studioPolicyMode?: StudioPolicyMode;
  /** Studio: turn on plan footprint after applying this preset. */
  autoEnableFootprint?: boolean;
};

export const INTAKE_TRACE_SCENARIO_PRESETS: IntakeTraceScenarioPreset[] = [
  {
    id: 'full-hospitality-no-site',
    label: 'Full: hospitality without website',
    hint: 'Branching without site — compare visible vs hidden in trace.',
    productMode: 'full',
    collectionMode: '',
    surface: '',
    studioPolicyMode: 'full',
    responsesText: '{\n  "a2": "hospitality",\n  "a5": "no_website"\n}\n',
  },
  {
    id: 'full-saas-has-site',
    label: 'Full: SaaS with website',
    hint: 'Typical full path with site present.',
    productMode: 'full',
    collectionMode: '',
    surface: '',
    studioPolicyMode: 'full',
    responsesText: '{\n  "a2": "saas",\n  "a5": "has_website",\n  "a6": "improve_conversion"\n}\n',
  },
  {
    id: 'express-no-site',
    label: 'Express: no website',
    hint: 'Express SLA + no-site branch.',
    productMode: 'express',
    collectionMode: '',
    surface: '',
    studioPolicyMode: 'express',
    responsesText: '{\n  "a2": "professional_services",\n  "a5": "no_website"\n}\n',
  },
  {
    id: 'free-snapshot-url-only',
    label: 'free_snapshot: URL-first',
    hint: 'Policy requiredness none; footprint shows resolver scope.',
    productMode: 'free_snapshot',
    collectionMode: '',
    surface: '',
    studioPolicyMode: 'free_snapshot',
    responsesText: '{\n  "a5": "has_website"\n}\n',
  },
  {
    id: 'discovery-public',
    label: 'Discovery: public discovery surface',
    hint: 'Subset policy + layout surface.',
    productMode: 'full',
    collectionMode: 'discovery',
    surface: 'public_discovery',
    studioPolicyMode: 'discovery',
    responsesText: '{\n  "a2": "professional_services",\n  "a5": "has_website",\n  "a6": "needs_leads"\n}\n',
  },
  {
    id: 'express-prebrief',
    label: 'Express: pre-brief flow',
    hint: 'Minimal bank bundle + identity nodes on the map.',
    productMode: 'express',
    collectionMode: 'pre_brief',
    surface: 'client_form',
    studioPolicyMode: 'pre_brief',
    responsesText: '{\n  "a2": "saas",\n  "a5": "has_website",\n  "a6": "improve_conversion"\n}\n',
  },
];
