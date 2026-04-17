import { motion } from 'motion/react';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';

type FollowUpCardProps = {
  followUpQuestionsCount: number;
  answeredFollowUps: number;
};

export function FollowUpCard({ followUpQuestionsCount, answeredFollowUps }: FollowUpCardProps) {
  if (followUpQuestionsCount <= 0) {
    return null;
  }

  const progressText = REPORT_VIEWER_COPY.followUp.progressTemplate
    .replace('{answered}', String(answeredFollowUps))
    .replace('{total}', String(followUpQuestionsCount));

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
          {REPORT_VIEWER_COPY.followUp.answerNowLabel}
        </span>
      </div>
    </motion.div>
  );
}
