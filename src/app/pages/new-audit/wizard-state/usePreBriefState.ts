import { useState } from 'react';

export function usePreBriefState() {
  const [preBriefOpen, setPreBriefOpen] = useState(false);
  const [preBriefCompany, setPreBriefCompany] = useState('');
  const [preBriefWebsite, setPreBriefWebsite] = useState('');
  const [preBriefIndustryField, setPreBriefIndustryField] = useState('');
  const [preBriefIndustrySpecify, setPreBriefIndustrySpecify] = useState('');
  const [preBriefMessage, setPreBriefMessage] = useState('');
  const [preBriefConsultantName, setPreBriefConsultantName] = useState('');
  const [preBriefExpectedContact, setPreBriefExpectedContact] = useState('');
  const [preBriefContactChannel, setPreBriefContactChannel] = useState('');
  const [preBriefEmail, setPreBriefEmail] = useState('');
  const [preBriefWhatsapp, setPreBriefWhatsapp] = useState('');
  const [preBriefLink, setPreBriefLink] = useState<string | null>(null);
  const [preBriefToken, setPreBriefToken] = useState<string | null>(null);
  const [preBriefLoading, setPreBriefLoading] = useState(false);
  const [preBriefErr, setPreBriefErr] = useState<string | null>(null);

  function closePreBriefModal() {
    setPreBriefOpen(false);
    setPreBriefCompany('');
    setPreBriefWebsite('');
    setPreBriefIndustryField('');
    setPreBriefIndustrySpecify('');
    setPreBriefMessage('');
    setPreBriefConsultantName('');
    setPreBriefExpectedContact('');
    setPreBriefContactChannel('');
    setPreBriefEmail('');
    setPreBriefWhatsapp('');
    setPreBriefLink(null);
    setPreBriefErr(null);
    setPreBriefLoading(false);
  }

  return {
    preBriefOpen,
    setPreBriefOpen,
    preBriefCompany,
    setPreBriefCompany,
    preBriefWebsite,
    setPreBriefWebsite,
    preBriefIndustryField,
    setPreBriefIndustryField,
    preBriefIndustrySpecify,
    setPreBriefIndustrySpecify,
    preBriefMessage,
    setPreBriefMessage,
    preBriefConsultantName,
    setPreBriefConsultantName,
    preBriefExpectedContact,
    setPreBriefExpectedContact,
    preBriefContactChannel,
    setPreBriefContactChannel,
    preBriefEmail,
    setPreBriefEmail,
    preBriefWhatsapp,
    setPreBriefWhatsapp,
    preBriefLink,
    setPreBriefLink,
    preBriefToken,
    setPreBriefToken,
    preBriefLoading,
    setPreBriefLoading,
    preBriefErr,
    setPreBriefErr,
    closePreBriefModal,
  };
}
