import { AppShell } from '../../components/AppShell';
import { PAGE_SHELL_CONTRACTS } from '../../../design-system/patterns/Layouts';
import { SETTINGS_PAGE_COPY } from '../../config/settings-page-copy.en';
import { useSettingsPageController } from './hooks/useSettingsPageController';
import { ProfileSection } from './sections/ProfileSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { DesignSystemSection } from './sections/DesignSystemSection';
import { SelfServeSection } from './sections/SelfServeSection';
import { BriefLayoutSection } from './sections/BriefLayoutSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { AccountSecuritySection } from './sections/AccountSecuritySection';
import { TokenUsageSection } from './sections/TokenUsageSection';
import { LegalConsentsSection } from './sections/LegalConsentsSection';

// LEGACY (TD-034 in docs/TECH_DEBT.md): Question Bank Studio Settings tab removed.
// The `bank-studio` tab + tab-bar shell, `useSettingsTabs` hook, and `QuestionBankStudio`
// composite are no longer wired here; underlying modules are scheduled for full deletion.

type GeneralSectionsProps = {
  controller: ReturnType<typeof useSettingsPageController>;
};

function GeneralSections({ controller }: GeneralSectionsProps) {
  return (
    <div className="space-y-5">
      <ProfileSection
        fullName={controller.fullName}
        onFullNameChange={controller.setFullName}
        onSave={() => void controller.onSaveName()}
        saving={controller.savingName}
        disabled={!controller.nameChanged}
      />
      <AppearanceSection mode={controller.mode} onModeChange={controller.setMode} />
      {controller.isConsultant ? <DesignSystemSection /> : null}
      {controller.isConsultant ? <TokenUsageSection enabled /> : null}
      {controller.profile && controller.isConsultant && (
        <SelfServeSection
          selfServeLoading={controller.selfServeLoading}
          selfServe={controller.selfServe}
          selfServeSelect={controller.selfServeSelect}
          selfServeSaving={controller.selfServeSaving}
          onSelfServeSelectChange={controller.setSelfServeSelect}
          onSave={() => void controller.onSaveSelfServe()}
        />
      )}
      {controller.isConsultant ? (
        <BriefLayoutSection
          showClient={false}
          showConsultant={Boolean(controller.profile && controller.isConsultant)}
          clientBriefDefault={controller.clientBriefDefault}
          consultantBriefDefault={controller.consultantBriefDefault}
          onClientChange={controller.setClientBriefLayoutDefault}
          onConsultantChange={controller.setConsultantBriefLayoutDefault}
        />
      ) : null}
      <NotificationsSection
        notifyPrefs={controller.notifyPrefs}
        setNotifyPrefs={controller.setNotifyPrefs}
        showExecutionTraceToggle={controller.isAdmin}
      />
      <LegalConsentsSection enabled={Boolean(controller.profile && !controller.isGuest)} />
      <AccountSecuritySection
        email={controller.user?.email ?? ''}
        newEmail={controller.newEmail}
        setNewEmail={controller.setNewEmail}
        savingEmail={controller.savingEmail}
        onChangeEmail={() => void controller.onChangeEmail()}
        newPassword={controller.newPassword}
        setNewPassword={controller.setNewPassword}
        confirmPassword={controller.confirmPassword}
        setConfirmPassword={controller.setConfirmPassword}
        savingPassword={controller.savingPassword}
        onChangePassword={() => void controller.onChangePassword()}
        onSignOut={controller.signOut}
      />
    </div>
  );
}

export function SettingsPage() {
  const controller = useSettingsPageController();
  const pageShellClass = `${PAGE_SHELL_CONTRACTS.body} ${PAGE_SHELL_CONTRACTS.narrowContent}`;

  return (
    <AppShell title={SETTINGS_PAGE_COPY.page.title} subtitle={SETTINGS_PAGE_COPY.page.subtitle}>
      <div className={pageShellClass}>
        <GeneralSections controller={controller} />
      </div>
    </AppShell>
  );
}
