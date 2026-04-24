import { useState } from 'react';
import { REVIEW_GATE_NOTES_MAX } from '@glc/intake-core';
import { motion } from 'motion/react';
import { Star, CheckCircle, ArrowRight, MagnifyingGlass, HardDrives, Shield, Globe, Cursor, Target, Lightning, MapTrifold, WarningCircle, Info } from '@phosphor-icons/react';
import type { QualityGateReport, ReconData } from '../../data/auditTypes';
import type { PipelineMonitorCopy } from '../../config/pipeline-monitor-copy';
import { PIPELINE_MONITOR_UI_POLICY } from '../../pages/pipeline-monitor/config/pipeline-monitor-ui-policy';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Callout } from '../../../design-system/ui';
import { PIPELINE_MONITOR_COPY as PM } from '../../config/pipeline-monitor-copy';
import { isPipelineStrategyReviewGateAfterPhase } from '../../config/pipeline-phase-policy';
import { cn } from '../ui/utils';
import { StatusPill } from './StatusPill';
import { SectionLabel } from './SectionLabel';
import { ReconReviewSummary } from './ReconReviewSummary';

interface ReviewPoint {
  id: number;
  label: string;
  note: string;
  after: number; // phase index this review comes after
}

export interface GovernanceRefinePhaseSummary {
  phase: number;
  phaseLabel: string;
  reasoning: string;
}

export type ReconReviewSummaryPayload = {
  recon: ReconData | null;
  copy: PipelineMonitorCopy['reviewModal']['recon'];
  showCrawlerTruncationWarning: boolean;
};

interface ReviewPointModalProps {
  reviewPoint: ReviewPoint | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: number, consultantNotes: string, interviewNotes: string) => void;
  qualityGate?: QualityGateReport | null;
  /** Decision Layer `refine_recommended` events for domain phases in this review block */
  governanceRefines?: GovernanceRefinePhaseSummary[];
  governanceRefineSectionTitle?: string;
  governanceRefineSectionIntro?: string;
  /** After phase 0 only: persisted recon snapshot for informed approval */
  reconReviewSummary?: ReconReviewSummaryPayload | null;
}

// Phase data mirrored here for the "completed in this block" list
const ALL_PHASES = [
  { id: 0, name: 'Recon',              icon: MagnifyingGlass },
  { id: 1, name: 'Tech Infrastructure',icon: HardDrives      },
  { id: 2, name: 'Security',           icon: Shield          },
  { id: 3, name: 'SEO & Digital',      icon: Globe           },
  { id: 4, name: 'UX & Conversion',    icon: Cursor          },
  { id: 5, name: 'Marketing',          icon: Target          },
  { id: 6, name: 'Automation',         icon: Lightning       },
  { id: 7, name: 'Strategy & Roadmap', icon: MapTrifold      },
];

export function ReviewPointModal({
  reviewPoint,
  open,
  onClose,
  onApprove,
  qualityGate,
  governanceRefines = [],
  governanceRefineSectionTitle = 'Phases flagged for manual review',
  governanceRefineSectionIntro = '',
  reconReviewSummary = null,
}: ReviewPointModalProps) {
  const [consultantNotes, setConsultantNotes] = useState('');
  const [interviewNotes,  setInterviewNotes]  = useState('');

  if (!reviewPoint) return null;

  // Phases completed before this review point
  const blockPhases = ALL_PHASES.filter(p => p.id <= reviewPoint.after);

  const warnings = qualityGate?.flags.filter(f => f.severity === 'warning') ?? [];
  const infoFlags = qualityGate?.flags.filter(f => f.severity === 'info') ?? [];
  const notesRequired = warnings.length > 0 && !consultantNotes.trim();

  function handleApprove() {
    if (notesRequired) return;
    onApprove(reviewPoint.id, consultantNotes, interviewNotes);
    setConsultantNotes('');
    setInterviewNotes('');
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className={cn(
          'overflow-hidden p-0',
          reconReviewSummary
            ? PIPELINE_MONITOR_UI_POLICY.reviewModal.contentMaxWidthWithRecon
            : PIPELINE_MONITOR_UI_POLICY.reviewModal.contentMaxWidthDefault,
        )}
      >
        {/* ── Header ──────────────────────────────── */}
        <DialogHeader className="border-b bg-card px-6 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="bg-warning/15 text-warning flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              >
                <Star className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {reviewPoint.label}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  {reviewPoint.note}
                </DialogDescription>
              </div>
            </div>
            <StatusPill status="review" label="Your input needed" />
          </div>
        </DialogHeader>

        {/* ── Body ────────────────────────────────── */}
        <div
          className={cn(
            'space-y-5 overflow-y-auto bg-background px-6 py-5',
            reconReviewSummary
              ? PIPELINE_MONITOR_UI_POLICY.reviewModal.bodyMaxHeightWithRecon
              : PIPELINE_MONITOR_UI_POLICY.reviewModal.bodyMaxHeightDefault,
          )}
        >
          {reconReviewSummary ? (
            <>
              <ReconReviewSummary
                key={`${open}-${reviewPoint.after}`}
                recon={reconReviewSummary.recon}
                copy={reconReviewSummary.copy}
                showCrawlerTruncationWarning={reconReviewSummary.showCrawlerTruncationWarning}
              />
              <Callout intent="info" className="p-3 text-xs leading-relaxed">
                {PM.reviewModal.reconSnapshotCorrectionHint}
              </Callout>
            </>
          ) : null}
          {isPipelineStrategyReviewGateAfterPhase(reviewPoint.after) ? (
            <Callout intent="info" className="p-3 text-xs leading-relaxed">
              {PM.reviewModal.strategyReviseHint}
            </Callout>
          ) : null}
          {/* Completed phases in this block */}
          <div>
            <SectionLabel className="mb-2.5">Completed in this block</SectionLabel>
            <div className="overflow-hidden rounded-lg border bg-card">
              {blockPhases.map((ph, i) => {
                const I = ph.icon;
                return (
                  <div
                    key={ph.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i < blockPhases.length - 1 ? 'border-b' : ''}`}
                  >
                    <I className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-muted-foreground flex-1 text-sm">
                      Phase {ph.id}: {ph.name}
                    </span>
                    <CheckCircle className="text-success h-4 w-4 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Decision Layer refine (per-phase, advisory) */}
          {governanceRefines.length > 0 && (
            <div className="bg-warning/10 border-warning/40 overflow-hidden rounded-lg border">
              <div className="bg-warning/15 border-warning/35 flex items-center gap-2 border-b px-4 py-2.5">
                <WarningCircle size={15} weight="fill" className="text-warning flex-shrink-0" />
                <span className="text-foreground text-xs font-bold">
                  {governanceRefineSectionTitle}
                </span>
              </div>
              {governanceRefineSectionIntro ? (
                <p className="text-muted-foreground px-4 py-2 text-xs leading-relaxed">
                  {governanceRefineSectionIntro}
                </p>
              ) : null}
              <div>
                {governanceRefines.map((row, i) => (
                  <div
                    key={`${row.phase}-${i}`}
                    className={`px-4 py-2.5 ${i > 0 || governanceRefineSectionIntro ? 'border-warning/25 border-t' : ''}`}
                  >
                    <p className="text-foreground text-xs font-semibold">
                      Phase {row.phase}: {row.phaseLabel}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {row.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality Gate warnings */}
          {warnings.length > 0 && (
            <div className="bg-warning/10 border-warning/40 overflow-hidden rounded-lg border">
              <div className="bg-warning/15 border-warning/35 flex items-center gap-2 border-b px-4 py-2.5">
                <WarningCircle size={15} weight="fill" className="text-warning flex-shrink-0" />
                <span className="text-foreground text-xs font-bold">
                  {warnings.length} Quality Warning{warnings.length > 1 ? 's' : ''} — Notes Required
                </span>
              </div>
              <div>
                {warnings.map((flag, i) => (
                  <div
                    key={flag.id}
                    className={`px-4 py-2.5 ${i > 0 ? 'border-warning/35 border-t' : ''}`}
                  >
                    <p className="text-warning-foreground text-xs leading-relaxed">{flag.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality Gate info flags */}
          {infoFlags.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-2">
                <Info size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground text-xs font-medium">
                  {infoFlags.length} Informational Note{infoFlags.length > 1 ? 's' : ''}
                </span>
              </div>
              <div>
                {infoFlags.map((flag, i) => (
                  <div
                    key={flag.id}
                    className={`px-4 py-2.5 ${i > 0 ? 'border-t' : ''}`}
                  >
                    <p className="text-muted-foreground text-xs leading-relaxed">{flag.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consultant notes */}
          <div className="space-y-1.5">
            <label className="text-foreground block text-sm font-medium">
              Consultant Notes
              {warnings.length > 0 ? (
                <span className="text-destructive ml-1.5 text-xs font-semibold">* required</span>
              ) : (
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  your observations after reviewing these phases
                </span>
              )}
            </label>
            <Textarea
              rows={3}
              value={consultantNotes}
              maxLength={REVIEW_GATE_NOTES_MAX}
              onChange={e => setConsultantNotes(e.target.value)}
              placeholder="e.g. Tech stack is significantly outdated. Security issues are blocking — need to address before proceeding with marketing analysis."
              className="resize-y bg-background"
            />
            {notesRequired && (
              <p className="text-destructive mt-1 text-xs">
                Notes are required to acknowledge the quality warnings above before approving.
              </p>
            )}
          </div>

          {/* Interview notes */}
          <div className="space-y-1.5">
            <label className="text-foreground block text-sm font-medium">
              Interview Notes
              <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                key points from client conversation
              </span>
            </label>
            <Textarea
              rows={3}
              value={interviewNotes}
              maxLength={REVIEW_GATE_NOTES_MAX}
              onChange={e => setInterviewNotes(e.target.value)}
              placeholder="e.g. Client confirmed they are aware of WordPress issues but delayed due to budget. Priority: quick wins first."
              className="resize-y bg-background"
            />
          </div>

          {/* Info strip */}
          <div className="bg-info/10 text-info-foreground border-info/40 rounded-lg border px-4 py-3 text-xs leading-relaxed">
            <strong>After approving:</strong> the next wing of the pipeline will start automatically.
            Notes are saved on the audit and fed to the AI context for remaining phases (they do not edit the recon table above in place).
          </div>
        </div>

        {/* ── Footer ──────────────────────────────── */}
        <DialogFooter className="flex items-center justify-end gap-2.5 border-t bg-card px-6 py-4">
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <motion.div
            whileHover={notesRequired ? {} : { scale: 1.01 }}
            whileTap={notesRequired ? {} : { scale: 0.98 }}
          >
            <Button type="button" variant="default" onClick={handleApprove} disabled={notesRequired}>
              Approve & Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
