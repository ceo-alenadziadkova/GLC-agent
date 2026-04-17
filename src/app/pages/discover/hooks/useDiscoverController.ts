import { useEffect, useMemo, useRef, useState } from 'react';
import { choiceValueNeedsSpecify } from '@glc/intake-core';
import type { IntakeVersionTuple } from '../../../data/auditTypes';
import {
  buildQuestionSequence,
  DISCOVERY_WIZARD_BANK_IDS,
  computeFindings,
  computeScore,
  getQuestion,
  type DiscoveryAnswers,
} from '../../../lib/discovery-flow';
import {
  discoveryTrackQuestionAnswered,
  discoveryTrackQuestionSkipped,
  discoveryTrackWizardCompleted,
} from '../../../lib/discovery-analytics';
import { useDiscoveryUiFragment } from './useDiscoveryUiFragment';
import { useDiscoverySessionPersistence } from './useDiscoverySessionPersistence';
import { useDiscoveryAnalytics } from './useDiscoveryAnalytics';
import {
  canAdvanceDiscoveryQuestion,
  isAnswered,
  type DiscoverContactFields,
} from '../services';

export function useDiscoverController(params: {
  isSplit: boolean;
  onEmbedExpandRequest?: (expanded: boolean) => void;
}) {
  const { isSplit, onEmbedExpandRequest } = params;
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [draft, setDraft] = useState<DiscoveryAnswers[string]>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [intakeVersions, setIntakeVersions] = useState<IntakeVersionTuple | null>(null);

  useDiscoveryUiFragment({
    onIntakeVersionsResolved: versions => setIntakeVersions(versions),
  });

  const {
    sessionToken,
    contactSaving,
    contactSaved,
    contactError,
    saveDiscoverySession,
    saveContact,
  } = useDiscoverySessionPersistence();

  const sequence = useMemo(() => {
    const planned = buildQuestionSequence(answers);
    if (planned.length > 0) return planned;
    // Defensive fallback: keep questionnaire operable if remote fragment/policy sync degrades.
    return DISCOVERY_WIZARD_BANK_IDS.filter(id => getQuestion(id) != null);
  }, [answers]);
  const currentId = sequence[currentIdx] ?? null;
  const currentQuestion = currentId ? getQuestion(currentId) ?? null : null;
  const currentCommittedAnswer = currentId ? (answers[currentId] ?? null) : null;
  const answeredIds = useMemo(() => sequence.slice(0, currentIdx), [currentIdx, sequence]);

  useEffect(() => {
    if (sequence.length === 0) return;
    if (currentIdx < sequence.length) return;
    setCurrentIdx(sequence.length - 1);
  }, [currentIdx, sequence]);

  useEffect(() => {
    setDraft(currentCommittedAnswer);
  }, [currentId, currentCommittedAnswer]);

  const sinkRef = useDiscoveryAnalytics({
    intakeVersions,
    sessionToken,
    currentId,
    currentIdx,
    showResults,
  });

  useEffect(() => {
    if (!showResults || !isSplit) return;
    onEmbedExpandRequest?.(true);
  }, [showResults, isSplit, onEmbedExpandRequest]);

  const specifyKey = currentId ? `${currentId}__other` : '';
  const canAdvance = canAdvanceDiscoveryQuestion({
    currentQuestion,
    draft,
    specifyValue: answers[specifyKey] ?? null,
  });
  const allDone = currentIdx >= sequence.length;
  const findings = useMemo(() => computeFindings(answers), [answers]);
  const industry = (answers.a2 as string | null) ?? null;
  const teamSize = (answers.a4 as string | null) ?? null;
  const signalCount = sequence.length;

  const contactFields: DiscoverContactFields = {
    contactName,
    contactEmail,
    contactPhone,
    contactCompany,
  };

  function handleSpecifyChange(questionId: string, value: string): void {
    setAnswers(prev => {
      const key = `${questionId}__other`;
      const nextValue = value.trim() || null;
      const prevValue = (prev[key] as string | null | undefined) ?? null;
      if (prevValue === nextValue) return prev;
      if (nextValue == null && !(key in prev)) return prev;
      return {
        ...prev,
        [key]: nextValue,
      };
    });
  }

  function handleDraftChange(value: DiscoveryAnswers[string]): void {
    setDraft(value);
    if (currentId && !choiceValueNeedsSpecify(value)) {
      setAnswers(prev => {
        const key = `${currentId}__other`;
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleNext(): Promise<void> {
    if (!currentId) return;
    const sink = sinkRef.current;
    if (sink) {
      if (currentQuestion?.optional && !isAnswered(draft)) {
        discoveryTrackQuestionSkipped(sink, { questionId: currentId, stepIndex: currentIdx });
      } else {
        discoveryTrackQuestionAnswered(sink, { questionId: currentId, stepIndex: currentIdx });
      }
    }
    let valueToSave: DiscoveryAnswers[string] = draft;
    if (currentQuestion?.optional && typeof draft === 'string' && !draft.trim()) {
      valueToSave = null;
    }
    const committed: DiscoveryAnswers = { ...answers, [currentId]: valueToSave };
    setAnswers(committed);
    const nextSequence = buildQuestionSequence(committed);
    const nextIdx = currentIdx + 1;

    if (nextIdx >= nextSequence.length) {
      if (isSplit) onEmbedExpandRequest?.(true);
      if (sink) discoveryTrackWizardCompleted(sink);
      void saveDiscoverySession({
        answers: committed,
        maturityLevel: computeScore(committed),
        findings: computeFindings(committed),
      });
      setShowResults(true);
    } else {
      setCurrentIdx(nextIdx);
    }
  }

  function handleBack(): void {
    if (showResults) {
      if (isSplit) onEmbedExpandRequest?.(false);
      setShowResults(false);
      setCurrentIdx(sequence.length - 1);
      setDraft(answers[sequence[sequence.length - 1]] ?? null);
      return;
    }
    if (currentIdx === 0) return;
    const prevIdx = currentIdx - 1;
    const prevId = sequence[prevIdx];
    setCurrentIdx(prevIdx);
    setDraft(answers[prevId] ?? null);
  }

  function handleShowResults(): void {
    if (isSplit) onEmbedExpandRequest?.(true);
    setShowResults(true);
  }

  async function handleContactSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    await saveContact(contactFields);
  }

  return {
    answers,
    currentIdx,
    currentId,
    currentQuestion,
    sequence,
    answeredIds,
    draft,
    showResults,
    canAdvance,
    allDone,
    findings,
    industry,
    teamSize,
    signalCount,
    bottomRef,
    sessionToken,
    contactName,
    contactEmail,
    contactPhone,
    contactCompany,
    contactSaving,
    contactSaved,
    contactError,
    setContactName,
    setContactEmail,
    setContactPhone,
    setContactCompany,
    handleDraftChange,
    handleSpecifyChange,
    handleNext,
    handleBack,
    handleShowResults,
    handleContactSubmit,
    getQuestionById: getQuestion,
  };
}
