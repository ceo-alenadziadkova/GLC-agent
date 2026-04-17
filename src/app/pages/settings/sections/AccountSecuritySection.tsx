import { SignOut } from '@phosphor-icons/react';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { SETTINGS_UI_STYLES } from '../config/settings-ui-policy';
import { SettingsCard } from '../components/SettingsCard';

type AccountSecuritySectionProps = {
  email: string;
  newEmail: string;
  setNewEmail: (value: string) => void;
  savingEmail: boolean;
  onChangeEmail: () => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  savingPassword: boolean;
  onChangePassword: () => void;
  onSignOut: () => void;
};

export function AccountSecuritySection({
  email,
  newEmail,
  setNewEmail,
  savingEmail,
  onChangeEmail,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  savingPassword,
  onChangePassword,
  onSignOut,
}: AccountSecuritySectionProps) {
  return (
    <SettingsCard>
      <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
        {SETTINGS_PAGE_COPY.account.signedInEmail}
      </div>
      <div
        className="text-sm mb-4 px-3 py-2"
        style={{
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {email || SETTINGS_PAGE_COPY.account.unknownEmail}
      </div>
      <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
        {SETTINGS_PAGE_COPY.account.changeEmail}
      </div>
      <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-quaternary)' }}>
        {SETTINGS_PAGE_COPY.account.changeEmailDescription}
      </p>
      <div className="flex flex-col gap-2 mb-5 mobile:flex-row mobile:items-center">
        <input
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder={SETTINGS_PAGE_COPY.account.newEmailPlaceholder}
          autoComplete="email"
          className="w-full mobile:flex-1 px-3 py-2 text-sm"
          style={SETTINGS_UI_STYLES.fieldInput}
        />
        <button
          type="button"
          className="glc-btn-primary whitespace-nowrap"
          disabled={savingEmail || !newEmail.trim()}
          style={{ opacity: savingEmail || !newEmail.trim() ? 0.55 : 1 }}
          onClick={onChangeEmail}
        >
          {savingEmail ? SETTINGS_PAGE_COPY.account.sendingEmailChange : SETTINGS_PAGE_COPY.account.requestEmailChange}
        </button>
      </div>

      <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
        {SETTINGS_PAGE_COPY.account.changePassword}
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          onChangePassword();
        }}
      >
        <input type="text" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
        <div className="space-y-2 mb-4">
          <input
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder={SETTINGS_PAGE_COPY.account.newPasswordPlaceholder}
            className="w-full px-3 py-2 text-sm"
            style={SETTINGS_UI_STYLES.fieldInput}
          />
          <input
            type="password"
            name="confirm-new-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={SETTINGS_PAGE_COPY.account.confirmNewPasswordPlaceholder}
            className="w-full px-3 py-2 text-sm"
            style={SETTINGS_UI_STYLES.fieldInput}
          />
        </div>
        <button type="submit" className="glc-btn-primary mb-3" disabled={savingPassword} style={{ opacity: savingPassword ? 0.6 : 1 }}>
          {savingPassword ? SETTINGS_PAGE_COPY.account.updatingPassword : SETTINGS_PAGE_COPY.account.updatePassword}
        </button>
      </form>
      <div className="h-3" />
      <button className="glc-btn-ghost" onClick={onSignOut}>
        <SignOut className="w-4 h-4" />
        {SETTINGS_PAGE_COPY.account.signOut}
      </button>
    </SettingsCard>
  );
}
