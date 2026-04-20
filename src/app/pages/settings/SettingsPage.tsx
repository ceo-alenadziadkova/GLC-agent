import { Link } from 'react-router';
import { TreeStructure } from '@phosphor-icons/react';
import { AppShell } from '../../components/AppShell';
import { QuestionBankStudio } from '../../components/QuestionBankStudio';
import { isQuestionBankStudioEnabled } from '../../lib/question-bank-studio-flags';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import { PAGE_SHELL_CONTRACTS } from '../../../design-system/patterns/Layouts';
import { SETTINGS_PAGE_COPY } from '../../config/settings-page-copy.en';
import { useSettingsPageController } from './hooks/useSettingsPageController';
import { useSettingsTabs } from './hooks/useSettingsTabs';
import { ProfileSection } from './sections/ProfileSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { DesignSystemSection } from './sections/DesignSystemSection';
import { SelfServeSection } from './sections/SelfServeSection';
import { BriefLayoutSection } from './sections/BriefLayoutSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { AccountSecuritySection } from './sections/AccountSecuritySection';
import { TokenUsageSection } from './sections/TokenUsageSection';
import { LegalConsentsSection } from './sections/LegalConsentsSection';

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
      <BriefLayoutSection
        showClient={Boolean(controller.profile && controller.isClient)}
        showConsultant={Boolean(controller.profile && controller.isConsultant)}
        clientBriefDefault={controller.clientBriefDefault}
        consultantBriefDefault={controller.consultantBriefDefault}
        onClientChange={controller.setClientBriefLayoutDefault}
        onConsultantChange={controller.setConsultantBriefLayoutDefault}
      />
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
  const studioTabEnabled = isQuestionBankStudioEnabled() && controller.isConsultant;
  const { settingsTab, onSettingsTabChange } = useSettingsTabs(studioTabEnabled);

  const pageShellClass = cn(
    PAGE_SHELL_CONTRACTS.body,
    studioTabEnabled ? PAGE_SHELL_CONTRACTS.settingsWideContent : PAGE_SHELL_CONTRACTS.narrowContent,
  );

  return (
    <AppShell title={SETTINGS_PAGE_COPY.page.title} subtitle={SETTINGS_PAGE_COPY.page.subtitle}>
      <div className={pageShellClass}>
      {studioTabEnabled ? (
        <Tabs value={settingsTab} onValueChange={onSettingsTabChange} className="w-full">
          <div className="pb-0">
            <TabsList className="!bg-transparent !h-auto !p-0 flex flex-wrap gap-2 justify-start rounded-none ds-settings-tabs-trigger-transparent">
              <TabsTrigger
                value="general"
                className="!shadow-none rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] data-[state=active]:border-[var(--glc-blue)] data-[state=active]:text-[var(--glc-blue)] data-[state=active]:bg-[var(--callout-info-bg)]"
              >
                {SETTINGS_PAGE_COPY.page.generalTab}
              </TabsTrigger>
              <TabsTrigger
                value="bank-studio"
                className="!shadow-none rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] data-[state=active]:border-[var(--glc-blue)] data-[state=active]:text-[var(--glc-blue)] data-[state=active]:bg-[var(--callout-info-bg)] flex items-center gap-1.5"
              >
                <TreeStructure size={16} weight="bold" />
                {SETTINGS_PAGE_COPY.page.questionBankStudioTab}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="general" className="mt-0 pt-2">
            <GeneralSections controller={controller} />
          </TabsContent>
          <TabsContent value="bank-studio" className="mt-0">
            <div className="space-y-3 pt-2">
              <p className="text-xs m-0 mb-3 ds-text-quaternary" >
                {SETTINGS_PAGE_COPY.page.studioFullPageViewPrefix}{' '}
                <Link to="/admin/question-bank-studio" className="underline ds-text-tertiary" >
                  /admin/question-bank-studio
                </Link>{' '}
                {SETTINGS_PAGE_COPY.page.studioFullPageViewSuffix}
              </p>
              <QuestionBankStudio />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <GeneralSections controller={controller} />
      )}
      </div>
    </AppShell>
  );
}
