/**
 * English glue phrases for Discovery findings templates (`discovery-glue-copy.v1.json`).
 * Same pattern as `discovery-findings-copy` — swap JSON for localization later.
 */
import raw from './discovery-glue-copy.v1.json' with { type: 'json' };

export type DiscoveryGlueCopyV1 = {
  version: string;
  industryDefault: string;
  team: {
    soloOrUnknown: string;
    small: string;
    other: string;
  };
  channels: {
    empty: string;
    listSeparator: string;
    twoJoiner: string;
    manyLastPrefix: string;
  };
  stage: {
    launching: string;
    growing: string;
    missing: string;
    other: string;
  };
};

export const DISCOVERY_GLUE_COPY: DiscoveryGlueCopyV1 = raw as DiscoveryGlueCopyV1;
