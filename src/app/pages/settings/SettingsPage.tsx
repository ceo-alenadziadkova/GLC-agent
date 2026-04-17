import { Link } from 'react-router';
import { TreeStructure } from '@phosphor-icons/react';
import { AppShell } from '../../components/AppShell';
import { QuestionBankStudio } from '../../components/QuestionBankStudio';
import { isQuestionBankStudioEnabled } from '../../lib/question-bank-studio-flags';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { SETTINGS_PAGE_COPY } from '../../config/settings-page-copy.en';
import { useSettingsPageController } from './hooks/useSettingsPageController';
import { useSettingsTabs } from './hooks/useSettingsTabs';
import { ProfileSection } from './sections/ProfileSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { SelfServeSection } from './sections/SelfServeSection';
import { BriefLayoutSection } from './sections/BriefLayoutSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { AccountSecuritySection } from './sections/AccountSecuritySection';

type GeneralSectionsProps = {
  controller: ReturnType<typeof useSettingsPageController>;
};

function GeneralSections({ controller }: GeneralSectionsProps) {
  return (
    <div className="px-7 py-6 space-y-5">
      <ProfileSection
        fullName={controller.fullName}
        onFullNameChange={controller.setFullName}
        onSave={() => void controller.onSaveName()}
        saving={controller.savingName}
        disabled={!controller.nameChanged}
      />
      <AppearanceSection mode={controller.mode} onModeChange={controller.setMode} />
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
      <NotificationsSection notifyPrefs={controller.notifyPrefs} setNotifyPrefs={controller.setNotifyPrefs} />
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

  return (
    <AppShell title={SETTINGS_PAGE_COPY.page.title} subtitle={SETTINGS_PAGE_COPY.page.subtitle}>
      {studioTabEnabled ? (
        <Tabs value={settingsTab} onValueChange={onSettingsTabChange} className="w-full">
          <div className="px-7 pt-6 pb-0">
            <TabsList
              className="!bg-transparent !h-auto !p-0 flex flex-wrap gap-2 justify-start rounded-none"
              style={{ background: 'transparent' }}
            >
              <TabsTrigger
                value="general"
                className="!shadow-none rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] data-[state=active]:border-[var(--glc-blue)] data-[state=active]:text-[var(--glc-blue)] data-[state=active]:bg-[rgba(28,189,255,0.08)]"
              >
                {SETTINGS_PAGE_COPY.page.generalTab}
              </TabsTrigger>
              <TabsTrigger
                value="bank-studio"
                className="!shadow-none rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] data-[state=active]:border-[var(--glc-blue)] data-[state=active]:text-[var(--glc-blue)] data-[state=active]:bg-[rgba(28,189,255,0.08)] flex items-center gap-1.5"
              >
                <TreeStructure size={16} weight="bold" />
                {SETTINGS_PAGE_COPY.page.questionBankStudioTab}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="general" className="mt-0">
            <GeneralSections controller={controller} />
          </TabsContent>
          <TabsContent value="bank-studio" className="mt-0">
            <div className="px-7 py-6">
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
    </AppShell>
  );
}
