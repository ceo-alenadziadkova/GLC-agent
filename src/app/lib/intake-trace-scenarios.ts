import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import type { IntakeSurface } from '../../../server/src/intake/core/types';

export type IntakeTraceScenarioPreset = {
  id: string;
  label: string;
  hint: string;
  productMode: ProductMode;
  collectionMode: IntakeBriefCollectionMode | '';
  surface: IntakeSurface | '';
  responsesText: string;
};

export const INTAKE_TRACE_SCENARIO_PRESETS: IntakeTraceScenarioPreset[] = [
  {
    id: 'full-hospitality-no-site',
    label: 'Full: hospitality without website',
    hint: 'Good baseline to inspect required/visible split.',
    productMode: 'full',
    collectionMode: '',
    surface: '',
    responsesText: '{\n  "a2": "hospitality",\n  "a5": "no_website"\n}\n',
  },
  {
    id: 'discovery-public',
    label: 'Discovery: public discovery surface',
    hint: 'Use this to inspect layout-driven visibility.',
    productMode: 'full',
    collectionMode: 'discovery',
    surface: 'public_discovery',
    responsesText: '{\n  "a2": "professional_services",\n  "a5": "has_website",\n  "a6": "needs_leads"\n}\n',
  },
  {
    id: 'express-prebrief',
    label: 'Express: pre-brief flow',
    hint: 'Useful for quick checks of minimal intake paths.',
    productMode: 'express',
    collectionMode: 'pre_brief',
    surface: 'client_form',
    responsesText: '{\n  "a2": "saas",\n  "a5": "has_website",\n  "a6": "improve_conversion"\n}\n',
  },
];
