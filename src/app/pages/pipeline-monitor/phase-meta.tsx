import {
  MagnifyingGlass,
  HardDrives,
  Shield,
  Globe,
  Cursor,
  Target,
  Lightning,
  MapTrifold,
} from '@phosphor-icons/react';
import { PIPELINE_STRATEGY_PHASE_INDEX } from '../../config/pipeline-phase-policy';

export const PHASE_META = [
  { id: 0, name: 'Recon', icon: MagnifyingGlass, wing: 'recon' as const, domainKey: null as null | string },
  { id: 1, name: 'Tech Infrastructure', icon: HardDrives, wing: 'auto' as const, domainKey: 'tech_infrastructure' as null | string },
  { id: 2, name: 'Security', icon: Shield, wing: 'auto' as const, domainKey: 'security_compliance' as null | string },
  { id: 3, name: 'SEO & Digital', icon: Globe, wing: 'auto' as const, domainKey: 'seo_digital' as null | string },
  { id: 4, name: 'UX & Conversion', icon: Cursor, wing: 'auto' as const, domainKey: 'ux_conversion' as null | string },
  { id: 5, name: 'Marketing & UTP', icon: Target, wing: 'analytic' as const, domainKey: 'marketing_utp' as null | string },
  { id: 6, name: 'Automation', icon: Lightning, wing: 'analytic' as const, domainKey: 'automation_processes' as null | string },
  { id: 7, name: 'Strategy & Roadmap', icon: MapTrifold, wing: 'strategy' as const, domainKey: null as null | string },
] as const;

/** Pipeline phase whose output is `audit.strategy` (Strategy Lab), not a row in `audit.domains`. */
export const STRATEGY_PHASE_ID = PHASE_META[PIPELINE_STRATEGY_PHASE_INDEX].id;
