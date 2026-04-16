import { motion, AnimatePresence } from 'motion/react';
import { SyncPathLoader } from '../../../components/SyncPathLoader';
import { PHASE_LABELS } from '../../../lib/snapshot-landing-helpers';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../config/snapshot-landing-copy.en';

export function SnapshotLandingProgress(props: { phaseIdx: number; quotaHint: string }) {
  const { phaseIdx, quotaHint } = props;

  return (
    <motion.div
      layout={false}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex w-full max-w-[min(100%,26rem)] flex-col items-center px-0 text-center mobile:px-1"
    >
      <SyncPathLoader
        layout="embedded"
        variant="indeterminate"
        showCaptions={false}
        loadingText={SNAPSHOT_LANDING_HERO_COPY.runningLoaderText}
        durationSeconds={8}
        className="mb-4 px-2"
      />

      <h2
        className="text-balance text-xl font-bold mobile:px-1 mobile:text-lg"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
        }}
      >
        {SNAPSHOT_LANDING_HERO_COPY.runningTitle}
      </h2>

      <AnimatePresence mode="wait">
        <motion.p
          key={phaseIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="mt-3"
          style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}
        >
          {PHASE_LABELS[phaseIdx]}
        </motion.p>
      </AnimatePresence>

      <p className="mt-6 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {SNAPSHOT_LANDING_HERO_COPY.runningHint}
      </p>

      {quotaHint && (
        <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {quotaHint}
        </p>
      )}
    </motion.div>
  );
}

