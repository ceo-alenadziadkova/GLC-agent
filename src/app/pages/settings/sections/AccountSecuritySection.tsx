import { useState } from 'react';
import { DiceSix, Eye, EyeSlash, SignOut } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../../design-system/ui';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { SETTINGS_PAGE_DEFAULTS } from '../../../config/settings-page-defaults';
import { generateSettingsFormPassword } from '../../../lib/settings-password-generator';
import { SettingsCard } from '../components/SettingsCard';
import { renderCopyTemplate } from '../utils/render-copy-template';

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
  const [showPassword, setShowPassword] = useState(false);
  const passwordMinCopy = renderCopyTemplate(SETTINGS_PAGE_COPY.account.asideBulletPasswordMin, {
    min: SETTINGS_PAGE_DEFAULTS.minPasswordChars,
  });
  const toggleShowPassword = () => {
    setShowPassword(v => !v);
  };

  return (
    <SettingsCard>
      <div className="ds-settings-account-layout">
        <div className="ds-settings-account-stack">
          <section className="ds-settings-account-panel" aria-label={SETTINGS_PAGE_COPY.account.credentialsPanelAriaLabel}>
            <div>
              <p className="ds-settings-account-field-label">{SETTINGS_PAGE_COPY.account.signedInEmail}</p>
              <div className="ds-settings-account-signed-email">
                {email || SETTINGS_PAGE_COPY.account.unknownEmail}
              </div>
            </div>
            <div>
              <p className="ds-settings-account-field-label">{SETTINGS_PAGE_COPY.account.changeEmail}</p>
              <p className="ds-settings-account-hint mb-2 text-xs leading-relaxed text-[var(--text-quaternary)]">
                {SETTINGS_PAGE_COPY.account.changeEmailDescription}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder={SETTINGS_PAGE_COPY.account.newEmailPlaceholder}
                  autoComplete="email"
                  className="ds-settings-field-input min-w-0 flex-1 px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="default"
                  className="w-full shrink-0 whitespace-nowrap disabled:opacity-[0.55] sm:w-auto"
                  disabled={savingEmail || !newEmail.trim()}
                  onClick={onChangeEmail}
                >
                  {savingEmail ? SETTINGS_PAGE_COPY.account.sendingEmailChange : SETTINGS_PAGE_COPY.account.requestEmailChange}
                </Button>
              </div>
            </div>

            <div>
              <p className="ds-settings-account-field-label">{SETTINGS_PAGE_COPY.account.changePassword}</p>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  onChangePassword();
                }}
              >
                <input type="text" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                <div className="mb-4 space-y-2">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="new-password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder={SETTINGS_PAGE_COPY.account.newPasswordPlaceholder}
                      voiceInput={false}
                      className="ds-settings-field-input h-auto w-full min-h-8 py-2 pl-3 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? SETTINGS_PAGE_COPY.account.ariaHidePassword : SETTINGS_PAGE_COPY.account.ariaShowPassword}
                      className="glc-touch-target absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center border-none bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      {showPassword ? <EyeSlash className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                    </button>
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm-new-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder={SETTINGS_PAGE_COPY.account.confirmNewPasswordPlaceholder}
                    voiceInput={false}
                    className="ds-settings-field-input h-auto w-full min-h-8 px-3 py-2 text-sm"
                  />
                </div>
                <div className="ds-settings-account-panel-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-w-0 justify-center gap-2"
                    disabled={savingPassword}
                    aria-label={SETTINGS_PAGE_COPY.account.generateStrongPasswordAriaLabel}
                    onClick={() => {
                      const next = generateSettingsFormPassword();
                      setNewPassword(next);
                      setConfirmPassword(next);
                    }}
                  >
                    <DiceSix className="h-4 w-4 shrink-0" aria-hidden />
                    {SETTINGS_PAGE_COPY.account.generateStrongPassword}
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full min-w-0 disabled:opacity-60"
                    disabled={savingPassword}
                  >
                    {savingPassword ? SETTINGS_PAGE_COPY.account.updatingPassword : SETTINGS_PAGE_COPY.account.updatePassword}
                  </Button>
                </div>
              </form>
            </div>
          </section>
          <Button type="button" variant="ghost" className="w-fit justify-start px-0" onClick={onSignOut}>
            <SignOut className="w-4 h-4" />
            {SETTINGS_PAGE_COPY.account.signOut}
          </Button>
        </div>

        <aside className="ds-settings-account-aside" aria-labelledby="settings-account-aside-title">
          <p id="settings-account-aside-title" className="ds-settings-account-aside-title">
            {SETTINGS_PAGE_COPY.account.asideTitle}
          </p>
          <p className="ds-settings-account-aside-intro">{SETTINGS_PAGE_COPY.account.asideIntro}</p>
          <ul className="ds-settings-account-aside-list">
            <li>{SETTINGS_PAGE_COPY.account.asideBulletEmail}</li>
            <li>{passwordMinCopy}</li>
            <li>{SETTINGS_PAGE_COPY.account.asideBulletPasswordUnique}</li>
            <li>{SETTINGS_PAGE_COPY.account.asideBulletPasswordGenerator}</li>
          </ul>
        </aside>
      </div>
    </SettingsCard>
  );
}
