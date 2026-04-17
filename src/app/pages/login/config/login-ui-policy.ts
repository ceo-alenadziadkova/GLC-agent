import { UI_POLICY } from '../../../config/ui-policy';
import type { AuthMode } from '../types';

export const LOGIN_UI_POLICY = {
  minPasswordLength: UI_POLICY.login.minPasswordLength,
  desktopTwoColumnMinWidthPx: UI_POLICY.login.desktopTwoColumnMinWidthPx,
  emailValidationPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  authTabOrder: ['signin', 'signup'] as const satisfies readonly AuthMode[],
  authTabIds: {
    signIn: 'auth-tab-signin',
    signUp: 'auth-tab-signup',
    panel: 'auth-panel-signin-signup',
  },
  errorIds: {
    email: 'login-email-error',
    password: 'login-password-error',
    recoveryPassword: 'login-recovery-password-error',
    recoveryConfirm: 'login-recovery-confirm-error',
  },
  motion: {
    layoutEnter: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const },
    formEnter: { duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const },
    asideEnter: { duration: 0.36, delay: 0.12, ease: [0.16, 1, 0.3, 1] as const },
    asideTitleEnter: { duration: 0.34, delay: 0.18, ease: [0.16, 1, 0.3, 1] as const },
    brandEnter: { duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] as const },
    buttonHoverScale: 1.015,
    buttonTapScale: 0.985,
  },
  formClipPath: {
    desktopClosed: 'inset(0 0 100% 0 round 0 var(--radius-2xl) var(--radius-2xl) 0)',
    desktopOpen: 'inset(0 0 0% 0 round 0 var(--radius-2xl) var(--radius-2xl) 0)',
    mobileClosed: 'inset(0 0 100% 0 round var(--radius-2xl))',
    mobileOpen: 'inset(0 0 0% 0 round var(--radius-2xl))',
  },
} as const;

export const LOGIN_FORM_STYLE_PRESETS = {
  inputBase: {
    borderRadius: 'var(--radius-lg)',
    border: 'var(--border-width-default) solid var(--border-default)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
  },
  iconButtonBase: {
    color: 'var(--text-tertiary)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  secondaryLinkButton: {
    color: 'var(--glc-blue)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  submitButtonBase: {
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--text-sm)',
    border: 'none',
  },
  submitButtonReady: {
    background: 'var(--gradient-brand)',
    color: 'var(--primary-foreground)',
    boxShadow: '0 var(--space-2) var(--space-5) color-mix(in oklab, var(--glc-blue) 34%, transparent)',
  },
  submitButtonDisabled: {
    background: 'var(--border-default)',
    color: 'var(--text-tertiary)',
    boxShadow: 'none',
  },
} as const;
