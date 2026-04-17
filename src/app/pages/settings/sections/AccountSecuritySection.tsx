import { SignOut } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
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
      <div className="mb-1 text-xs text-[var(--text-tertiary)]">
        {SETTINGS_PAGE_COPY.account.signedInEmail}
      </div>
      <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-secondary)]">
        {email || SETTINGS_PAGE_COPY.account.unknownEmail}
      </div>
      <div className="mb-2 text-xs text-[var(--text-tertiary)]">
        {SETTINGS_PAGE_COPY.account.changeEmail}
      </div>
      <p className="mb-2 text-xs leading-relaxed text-[var(--text-quaternary)]">
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
        <Button
          type="button"
          variant="default"
          className="whitespace-nowrap"
          disabled={savingEmail || !newEmail.trim()}
          style={{ opacity: savingEmail || !newEmail.trim() ? 0.55 : 1 }}
          onClick={onChangeEmail}
        >
          {savingEmail ? SETTINGS_PAGE_COPY.account.sendingEmailChange : SETTINGS_PAGE_COPY.account.requestEmailChange}
        </Button>
      </div>

      <div className="mb-2 text-xs text-[var(--text-tertiary)]">
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
        <Button type="submit" variant="default" className="mb-3" disabled={savingPassword} style={{ opacity: savingPassword ? 0.6 : 1 }}>
          {savingPassword ? SETTINGS_PAGE_COPY.account.updatingPassword : SETTINGS_PAGE_COPY.account.updatePassword}
        </Button>
      </form>
      <div className="h-3" />
      <Button type="button" variant="ghost" onClick={onSignOut}>
        <SignOut className="w-4 h-4" />
        {SETTINGS_PAGE_COPY.account.signOut}
      </Button>
    </SettingsCard>
  );
}
