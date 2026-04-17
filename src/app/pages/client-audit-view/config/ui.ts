export const CLIENT_AUDIT_VIEW_UI = {
  brief: {
    progressBarTransition: 'transform 0.3s',
    formMaxHeight: 'min(55vh,28rem)',
    card: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
    },
    headerBorder: {
      borderBottom: '1px solid var(--border-subtle)',
    },
    linkButton: {
      color: 'var(--glc-blue)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
    },
    progressFill: {
      width: '100%',
      background: 'var(--gradient-brand)',
      transformOrigin: 'left center',
    },
    saveButton: {
      background: 'var(--gradient-brand)',
      color: 'var(--glc-ink)',
      boxShadow: 'var(--glow-blue-sm)',
    },
  },
  snapshot: {
    panelLimited: {
      border: '1px solid rgba(249,115,22,0.28)',
      background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(28,189,255,0.04) 100%)',
    },
    panelNormal: {
      border: '1px solid rgba(28,189,255,0.22)',
      background: 'linear-gradient(135deg, rgba(28,189,255,0.10) 0%, rgba(28,189,255,0.03) 100%)',
    },
    dividerBorderColor: 'rgba(28,189,255,0.15)',
    packageButtonActiveBg: 'rgba(28,189,255,0.14)',
    limitedHint: {
      background: 'rgba(249,115,22,0.08)',
      border: '1px solid rgba(249,115,22,0.2)',
    },
    packageCardActiveBorder: '1px solid rgba(28,189,255,0.35)',
  },
  links: {
    reportCard: {
      background: 'linear-gradient(135deg, rgba(28,189,255,0.15) 0%, rgba(28,189,255,0.06) 100%)',
      border: '1px solid rgba(28,189,255,0.25)',
    },
    pipelineCard: {
      backgroundColor: 'rgba(28,189,255,0.05)',
      border: '1px solid rgba(28,189,255,0.15)',
    },
  },
} as const;
