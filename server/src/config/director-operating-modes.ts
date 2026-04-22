export const DIRECTOR_OPERATING_MODES = [
  'discovery',
  'launch',
  'growth',
  'authority',
  'defense',
] as const;

export type DirectorOperatingMode = (typeof DIRECTOR_OPERATING_MODES)[number];

export const DIRECTOR_MODE_AGENT_DEPTHS: Record<
  DirectorOperatingMode,
  Record<'cmo.agent_3_positioning' | 'cmo.agent_5_content_strategy' | 'cmo.agent_9_traffic', 'min' | 'standard' | 'max' | 'deferred'>
> = {
  discovery: {
    'cmo.agent_3_positioning': 'max',
    'cmo.agent_5_content_strategy': 'standard',
    'cmo.agent_9_traffic': 'min',
  },
  launch: {
    'cmo.agent_3_positioning': 'standard',
    'cmo.agent_5_content_strategy': 'max',
    'cmo.agent_9_traffic': 'standard',
  },
  growth: {
    'cmo.agent_3_positioning': 'standard',
    'cmo.agent_5_content_strategy': 'standard',
    'cmo.agent_9_traffic': 'max',
  },
  authority: {
    'cmo.agent_3_positioning': 'max',
    'cmo.agent_5_content_strategy': 'max',
    'cmo.agent_9_traffic': 'standard',
  },
  defense: {
    'cmo.agent_3_positioning': 'standard',
    'cmo.agent_5_content_strategy': 'min',
    'cmo.agent_9_traffic': 'standard',
  },
};
