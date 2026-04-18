export const PORTAL_SNAPSHOT_MIRROR_COPY = {
  accountNotice: {
    eyebrow: 'Saved in your account',
    bodyPrefix:
      'This is the same quick rule-based scan you saw before sign-up. Creating an account keeps it here so you do not lose results.',
    bodyStrong: 'It is not a full GLC audit',
    bodySuffix:
      'a full run uses your intake brief, deeper phases, and review gates. When you continue below with Starter, Pro, or Complete, you start that separate programme.',
  },
  status: {
    ready: 'Your check is ready',
    robotsLimited: 'Preview limited — robots.txt policy',
    sampledLimited: 'Preview limited — inner pages sampled',
    incomplete: 'Preview incomplete — pages not loaded',
  },
  homepageSnippet: {
    title: 'From your homepage',
    footer:
      'Taken from the HTML we fetched: page title, meta description, Open Graph text, or the first substantive paragraph when those are missing.',
  },
  siteRead: {
    title: 'Site read (advisory)',
    confidencePrefix: 'Classification confidence:',
  },
  score: {
    title: 'Snapshot score',
    summary: 'Summary',
    confidencePrefix: 'Scan confidence:',
  },
  limitations: {
    heading: 'Detected on your pages (this scan)',
  },
  recommendations: {
    title: 'Suggested next steps',
    priorityPrefix: 'Priority:',
  },
  issues: {
    title: 'Top issues',
  },
  quickWins: {
    title: 'Quick wins',
  },
  techStack: {
    title: 'Tech stack detected',
  },
} as const;
