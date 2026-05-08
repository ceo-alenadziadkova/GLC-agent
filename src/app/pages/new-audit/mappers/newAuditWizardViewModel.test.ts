import { describe, expect, it, vi } from 'vitest';
import { buildPreBriefViewModel } from './newAuditWizardViewModel';

describe('newAuditWizardViewModel', () => {
  it('maps pre-brief state to flat return model', () => {
    const vm = buildPreBriefViewModel({
      preBriefOpen: true,
      setPreBriefOpen: vi.fn(),
      preBriefCompany: 'ACME',
      setPreBriefCompany: vi.fn(),
      preBriefWebsite: 'acme.com',
      setPreBriefWebsite: vi.fn(),
      preBriefIndustryField: 'it',
      setPreBriefIndustryField: vi.fn(),
      preBriefIndustrySpecify: '',
      setPreBriefIndustrySpecify: vi.fn(),
      preBriefMessage: '',
      setPreBriefMessage: vi.fn(),
      preBriefConsultantName: 'Alex',
      setPreBriefConsultantName: vi.fn(),
      preBriefExpectedContact: '',
      setPreBriefExpectedContact: vi.fn(),
      preBriefContactChannel: 'email',
      setPreBriefContactChannel: vi.fn(),
      preBriefEmail: '',
      setPreBriefEmail: vi.fn(),
      preBriefWhatsapp: '',
      setPreBriefWhatsapp: vi.fn(),
      preBriefLink: null,
      setPreBriefLink: vi.fn(),
      preBriefToken: null,
      setPreBriefToken: vi.fn(),
      preBriefLoading: false,
      setPreBriefLoading: vi.fn(),
      preBriefErr: null,
      setPreBriefErr: vi.fn(),
      closePreBriefModal: vi.fn(),
    });
    expect(vm.preBriefCompany).toBe('ACME');
    expect(vm.preBriefOpen).toBe(true);
  });
});
