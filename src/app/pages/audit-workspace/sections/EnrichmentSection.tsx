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
      className="glc-card overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ui-info-border-20)]"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 bg-[var(--ui-info-muted-bg)] px-4 py-3 text-left"
        onClick={() => setEnrichOpen(prev => !prev)}
      >
        <CaretRight
          className="h-4 w-4 shrink-0 text-[var(--glc-blue)] transition-transform"
          style={{ transform: enrichOpen ? 'rotate(90deg)' : 'none' }}
        />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
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
            className="space-y-4 border-t border-[var(--border-subtle)] px-4 pb-4"
          >
            {enrichSaved && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium text-[var(--glc-green)]"
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
