/**
 * Public `/brief` flow toggle — sourced from static app feature flags (not build-time env).
 */
import { APP_FEATURE_FLAGS } from './app-feature-flags';

export const PUBLIC_BRIEF_SESSION_FLOW_ENABLED = APP_FEATURE_FLAGS.publicBriefSessionFlowEnabled;
