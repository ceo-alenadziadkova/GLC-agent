export const SETTINGS_PAGE_COPY = {
  profile: {
    title: 'Profile',
    displayName: 'Display name',
    yourNamePlaceholder: 'Your name',
    save: 'Save',
    saving: 'Saving...',
  },
  appearance: {
    title: 'Appearance',
  },
  selfServe: {
    title: 'Client portal — audit owner',
    description:
      'When clients start an audit from the portal, the selected consultant becomes the audit owner (access and billing). With several consultants, the lead administrator picks who receives these audits.',
    loading: 'Loading…',
    loadFailed: 'Assignment settings could not be loaded.',
    notReady:
      'Client self-serve is not ready yet: choose a consultant below (or ask your team to finish setup).',
    adminOnly:
      'Only designated platform administrators can change this. Ask your lead administrator if you need a different assignment.',
    defaultConsultantLabel: 'Default consultant for client-started audits',
    notSetFallback: 'Not set — use backup default only',
    saveAssignment: 'Save assignment',
    savingAssignment: 'Saving…',
    fallbackUserIdLabelPrefix: 'User',
  },
  briefLayout: {
    title: 'Intake brief layout',
    description:
      'Choose how long questionnaires open by default (all sections on one page vs one step at a time). You can still switch layout on the brief screen for a specific audit. Clients and internal users each have their own saved default on this device.',
    clientTitle: 'Client portal (pre-audit brief)',
    clientDescription: 'Used when you fill the brief after your audit request is approved.',
    consultantTitle: 'Consultant / admin (new audit & workspace)',
    consultantDescription:
      'Used for the Brief step when creating an audit and for "Edit intake brief" in the audit workspace unless you pick a different layout there.',
    classic: 'All sections',
    wizard: 'Step by step',
    askEachTime: 'Ask each time',
  },
  notifications: {
    title: 'Notifications',
    auditStatusReminders: 'Audit status reminders',
    productUpdates: 'Product updates',
  },
  account: {
    signedInEmail: 'Signed in email',
    unknownEmail: 'unknown',
    changeEmail: 'Change email',
    changeEmailDescription:
      'We will send confirmation links. If your project uses secure email change, you must confirm from both the old and new addresses.',
    newEmailPlaceholder: 'new@company.com',
    requestEmailChange: 'Request email change',
    sendingEmailChange: 'Sending…',
    changePassword: 'Change password',
    newPasswordPlaceholder: 'New password',
    confirmNewPasswordPlaceholder: 'Confirm new password',
    updatePassword: 'Update password',
    updatingPassword: 'Updating...',
    signOut: 'Sign out',
  },
  page: {
    title: 'Settings',
    subtitle: 'Manage profile, appearance, intake brief layout, and notifications',
    generalTab: 'General',
    questionBankStudioTab: 'Question Bank Studio',
    studioFullPageViewPrefix: 'Full-page view:',
    studioFullPageViewSuffix: '(same flag and consultant gate).',
  },
} as const;
