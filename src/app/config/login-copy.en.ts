/**
 * Login / auth UI copy (English). Supabase-specific operator hints stay here until a CMS catalog ships.
 */

export const LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN =
  'In Supabase Dashboard: Authentication → enable "Allow manual linking" (Auth general settings). See docs: supabase.com/docs/guides/auth/general-configuration';

export const LOGIN_PAGE_COPY_EN = {
  brandWordmarkPrimary: 'GLC',
  brandWordmarkSecondary: ' Audit Platform',
  tagline: 'Sign in to the audit workspace and client portal',
  authShellAsideTitle: 'Your audit workspace. Every finding in one place.',
  authShellAsideBody:
    'Consultants run audits and pipelines here; clients follow progress, materials, and recommended actions. One account links marketing entry points and the dashboard.',
  authShellTrustSignals: ['GDPR-compliant', 'Encrypted in transit and at rest', 'No public data exposure'],
  authShellQuote:
    '"We stopped guessing what to fix first. The roadmap was clear enough to brief our team in one meeting."',
  authShellQuoteAuthor: 'Operations lead, eCommerce brand',
  ariaHome: 'Go to home page',
  tabSignIn: 'Sign in',
  tabRegister: 'Register',
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
  forgotSending: 'Sending…',
  forgotSendLink: 'Send reset link',
  anonymousHint:
    'You used the quick site scan. Continue with Google to keep the same session and open the full audit. Email sign-in creates a separate account unless you link Google first.',
  continueGoogle: 'Continue with Google',
  dividerOr: 'or',
  placeholderPassword: 'Password',
  forgotPasswordLink: 'Forgot password?',
  signupPasswordHint:
    'At least 6 characters; uppercase, lowercase, digit, and symbol required. If email confirmation is on, check your inbox after registering.',
  signingIn: 'Signing in…',
  creating: 'Creating…',
  submitSignIn: 'Sign in',
  submitCreateAccount: 'Create account',
  footerTerms: 'By continuing you accept the terms of use.',
  footerFaq: 'FAQ',
  errorPasswordMinLength: 'Password must be at least 8 characters.',
  errorPasswordsMismatch: 'Passwords do not match.',
} as const;
