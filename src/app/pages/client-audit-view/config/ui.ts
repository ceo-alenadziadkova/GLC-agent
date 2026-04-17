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
      border: '1px solid var(--callout-warning-border)',
      background:
        'linear-gradient(135deg, var(--callout-warning-bg) 0%, var(--glc-blue-muted-faint) 100%)',
    },
    panelNormal: {
      border: '1px solid var(--callout-info-border)',
      background:
        'linear-gradient(135deg, var(--glc-blue-muted) 0%, var(--glc-blue-muted-faint) 100%)',
    },
    dividerBorderColor: 'var(--glc-blue-muted-strong)',
    packageButtonActiveBg: 'var(--glc-blue-muted-strong)',
    limitedHint: {
      background: 'var(--callout-warning-bg)',
      border: '1px solid var(--score-2-border)',
    },
    packageCardActiveBorder: '1px solid var(--callout-info-border-strong)',
  },
  links: {
    reportCard: {
      background:
        'linear-gradient(135deg, var(--glc-blue-muted-strong) 0%, var(--glc-blue-muted-soft) 100%)',
      border: '1px solid var(--callout-info-border)',
    },
    pipelineCard: {
      backgroundColor: 'var(--glc-blue-muted-soft)',
      border: '1px solid var(--glc-blue-muted-strong)',
    },
  },
} as const;
