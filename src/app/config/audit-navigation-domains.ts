export type AuditNavigationIconKey =
  | 'Search'
  | 'Server'
  | 'Shield'
  | 'Globe'
  | 'MousePointer'
  | 'Target'
  | 'Zap'
  | 'Map';

export type AuditNavigationDomain = {
  id: string;
  name: string;
  icon: AuditNavigationIconKey;
  score: number;
};

export const AUDIT_NAVIGATION_DOMAINS: AuditNavigationDomain[] = [
  { id: 'recon', name: 'Recon', icon: 'Search', score: 4 },
  { id: 'tech-infrastructure', name: 'Tech Infrastructure', icon: 'Server', score: 3 },
  { id: 'security', name: 'Security & Compliance', icon: 'Shield', score: 2 },
  { id: 'seo', name: 'SEO & Digital Presence', icon: 'Globe', score: 3 },
  { id: 'ux', name: 'UX & Conversion', icon: 'MousePointer', score: 4 },
  { id: 'marketing', name: 'Marketing & Positioning', icon: 'Target', score: 4 },
  { id: 'automation', name: 'Automation & Processes', icon: 'Zap', score: 3 },
] as const;
