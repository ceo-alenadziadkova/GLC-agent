import { CaretRight } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import {
  choiceSpecifyResponseKey,
  choiceValueNeedsSpecify,
} from '@glc/intake-core';
import { BriefField } from '../../../components/BriefField';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import {
  unwrapResponse,
  type BriefQuestion,
  type BriefResponses,
} from '../../../data/briefQuestions';
import { DOMAIN_LABELS, type DomainData, type DomainKey } from '../../../data/auditTypes';

type Props = {
  id?: string;
  domainData: DomainData | null;
  activeDomain: DomainKey;
  followupQuestions: BriefQuestion[];
  enrichOpen: boolean;
  setEnrichOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  enrichSaved: boolean;
  briefResponses: BriefResponses;
  queueFollowupSave: (
    qid: string,
    value: string | string[] | number | null,
    source: 'consultant' | 'unknown' | undefined,
    base: BriefResponses,
  ) => void;
};

export function EnrichmentSection({
  id,
  domainData,
  activeDomain,
  followupQuestions,
  enrichOpen,
  setEnrichOpen,
  enrichSaved,
  briefResponses,
  queueFollowupSave,
}: Props) {
  const showEnrichmentBanner = Boolean(
    domainData?.status === 'completed' && followupQuestions.length > 0 && id,
  );
  if (!showEnrichmentBanner) return null;

  return (
    <div
      className="glc-card overflow-hidden"
      style={{ borderRadius: 'var(--radius-xl)', border: '1px solid rgba(28,189,255,0.2)' }}
    >
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: 'rgba(28,189,255,0.06)' }}
        onClick={() => setEnrichOpen(prev => !prev)}
      >
        <CaretRight
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ transform: enrichOpen ? 'rotate(90deg)' : 'none', color: 'var(--glc-blue)' }}
        />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {AUDIT_WORKSPACE_COPY.enrichment.refinePrefix} {DOMAIN_LABELS[activeDomain]}{' '}
          {AUDIT_WORKSPACE_COPY.enrichment.refineMiddle} {followupQuestions.length}{' '}
          {followupQuestions.length === 1
            ? AUDIT_WORKSPACE_COPY.enrichment.refineQuestionSingular
            : AUDIT_WORKSPACE_COPY.enrichment.refineQuestionPlural}
        </span>
      </button>
      <AnimatePresence>
        {enrichOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            {enrichSaved && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium"
                style={{ color: 'var(--glc-green)' }}
              >
                {AUDIT_WORKSPACE_COPY.enrichment.saved}
              </motion.p>
            )}
            {followupQuestions.map(question => {
              const otherKey = choiceSpecifyResponseKey(question.id);
              const specRaw = unwrapResponse(briefResponses[otherKey]);
              const otherSpecify = typeof specRaw === 'string' ? specRaw : '';
              return (
                <BriefField
                  key={question.id}
                  q={question}
                  value={briefResponses[question.id]}
                  onChange={value => {
                    queueFollowupSave(question.id, value, 'consultant', briefResponses);
                    if (!choiceValueNeedsSpecify(value)) {
                      queueFollowupSave(otherKey, null, 'consultant', briefResponses);
                    }
                  }}
                  onSetUnknown={() => {
                    queueFollowupSave(question.id, null, 'unknown', briefResponses);
                    queueFollowupSave(otherKey, null, 'unknown', briefResponses);
                  }}
                  otherSpecify={otherSpecify}
                  onOtherSpecifyChange={text => {
                    queueFollowupSave(otherKey, text || null, 'consultant', briefResponses);
                  }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
