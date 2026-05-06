import { motion } from 'motion/react';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { getBriefQuestionText } from '../../../data/briefQuestions';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';

type FollowUpCardProps = {
  followUpQuestions: Array<Record<string, unknown>>;
  followUpQuestionsCount: number;
  answeredFollowUps: number;
};

type FollowUpQuestionViewModel = {
  id: string;
  text: string;
  answered: boolean;
};

function toFollowUpQuestionViewModels(questions: Array<Record<string, unknown>>): FollowUpQuestionViewModel[] {
  return questions.map((question, index) => {
    const rawId = typeof question.id === 'string' ? question.id.trim() : '';
    const fallbackId = `unknown-${index + 1}`;
    const resolvedId = rawId || fallbackId;
    const resolvedText = rawId
      ? getBriefQuestionText(rawId)
      : REPORT_VIEWER_COPY.followUp.questionUnavailableLabel;

    return {
      id: resolvedId,
      text: resolvedText || REPORT_VIEWER_COPY.followUp.questionUnavailableLabel,
      answered: Boolean(question.answered),
    };
  });
}

export function FollowUpCard({ followUpQuestions, followUpQuestionsCount, answeredFollowUps }: FollowUpCardProps) {
  if (followUpQuestionsCount <= 0) {
    return (
      <div className="glc-card p-5 ds-radius-xl">
        <SectionLabel>{REPORT_VIEWER_COPY.followUpHeading}</SectionLabel>
        <p className="mt-1.5 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
          {REPORT_VIEWER_COPY.followUp.noQuestionsYet}
        </p>
      </div>
    );
  }

  const progressText = REPORT_VIEWER_COPY.followUp.progressTemplate
    .replace('{answered}', String(answeredFollowUps))
    .replace('{total}', String(followUpQuestionsCount));
  const followUpItems = toFollowUpQuestionViewModels(followUpQuestions);

  return (
    <motion.div
      initial={{ opacity: 0, y: REPORT_VIEWER_CONSTANTS.motion.followUpEnterOffsetY }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: REPORT_VIEWER_CONSTANTS.motion.followUpEnterDurationSec }}
      className="glc-card p-5 ds-radius-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <SectionLabel>{REPORT_VIEWER_COPY.followUpHeading}</SectionLabel>
          <p className="mt-1.5 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
            {REPORT_VIEWER_COPY.followUpHint}
          </p>
          <p className="mt-1.5 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
            {progressText}
          </p>
        </div>
        <span className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
          {REPORT_VIEWER_COPY.followUp.estimatedTimeLabel}
        </span>
      </div>
      <ul className="mt-4 space-y-2" aria-label={REPORT_VIEWER_COPY.followUp.listLabel}>
        {followUpItems.map((item) => (
          <li key={item.id} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-[var(--text-primary)]">{item.text}</p>
              <span className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                {item.answered ? REPORT_VIEWER_COPY.followUp.answeredStatus : REPORT_VIEWER_COPY.followUp.pendingStatus}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
