/**
 * Login / auth UI copy (English). Supabase-specific operator hints stay here until a CMS catalog ships.
 */

export const LOGIN_SUPABASE_DOCS_URL =
  'https://supabase.com/docs/guides/auth/general-configuration';

export const LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN =
  `In Supabase Dashboard: Authentication → enable "Allow manual linking" (Auth general settings). See docs: ${LOGIN_SUPABASE_DOCS_URL}`;

export const LOGIN_PAGE_COPY_EN = {
  brandWordmarkPrimary: 'GLC',
  brandWordmarkSecondary: ' Audit Platform',
  tagline: 'Sign in to the audit workspace and client portal',
  taglineSignIn: 'Sign in to the audit workspace and client portal',
  taglineSignUp: 'Create your account to start audits and manage client access',
  taglineForgot: 'Reset your password to restore access to your workspace',
  taglineRecovery: 'Set a new password and continue securely',
  authShellAsideTitle: 'Your audit workspace. Every finding in one place.',
  authShellTrustSignals: ['GDPR-compliant', 'Encrypted in transit and at rest', 'No public data exposure'],

  ariaHome: 'Go to home page',
  tabSignIn: 'Sign in',
  tabRegister: 'Create account',
  recoveryHeading: 'Set a new password',
  recoveryIntroBeforeEmail: 'Your account: ',
  recoveryIntroAfterEmail: '. Choose a strong password (project rules apply).',
  placeholderNewPassword: 'New password',
  placeholderConfirmNewPassword: 'Confirm new password',
  recoverySubmitSaving: 'Saving…',
  recoverySubmit: 'Update password',
  ariaHidePassword: 'Hide password',
  ariaShowPassword: 'Show password',
  forgotBack: 'Back to sign in',
  forgotHeading: 'Reset password',
  forgotBlurb:
    'We will email you a link to choose a new password. The link expires per your project settings (typically one hour).',
  forgotSentPrefix: 'If an account exists for ',
  forgotSentSuffix: ', check your inbox for the reset link.',
  placeholderEmail: 'your@email.com',
  labelEmail: 'Email',
  forgotSending: 'Sending…',
  forgotSendLink: 'Send reset link',
  anonymousHint:
    'You used the quick site scan. Continue with Google to keep the same session and open the full audit. Email sign-in creates a separate account unless you link Google first.',
  continueGoogle: 'Continue with Google',
  dividerOr: 'or',
  placeholderPassword: 'Password',
  labelPassword: 'Password',
  labelNewPassword: 'New password',
  labelConfirmNewPassword: 'Confirm new password',
  forgotPasswordLink: 'Forgot password?',
  signupPasswordHint:
    'At least 8 characters; uppercase, lowercase, digit, and symbol required. If email confirmation is on, check your inbox after registering.',
  signingIn: 'Signing in…',
  creating: 'Creating…',
  submitSignIn: 'Sign in',
  submitCreateAccount: 'Create account',
  asideIntroPrefix: 'New to GLC? Start with ',
  asideSnapshotLinkLabel: 'Snapshot',
  asideIntroMiddle: ' or ',
  asideBriefLinkLabel: 'Brief',
  asideIntroSuffix: '.',
  errorPasswordMinLength: 'Password must be at least 8 characters.',
  errorPasswordsMismatch: 'Passwords do not match.',
  errorInvalidEmail: 'Enter a valid email address.',
  legalConsentsUpdateRequired:
    'Our legal policies were updated. Please review and accept them in Settings to continue.',
} as const;
