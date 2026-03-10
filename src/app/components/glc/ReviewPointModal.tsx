import { useState } from 'react';
import { motion } from 'motion/react';
import { Star, CheckCircle2, ArrowRight, Search, Server, Shield, Globe, MousePointer, Target, Zap, Map } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../ui/dialog';
import { StatusPill } from './StatusPill';
import { SectionLabel } from './SectionLabel';

interface ReviewPoint {
  id: number;
  label: string;
  note: string;
  after: number; // phase index this review comes after
}

interface ReviewPointModalProps {
  reviewPoint: ReviewPoint | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: number, consultantNotes: string, interviewNotes: string) => void;
}

// Phase data mirrored here for the "completed in this block" list
const ALL_PHASES = [
  { id: 0, name: 'Recon',              icon: Search       },
  { id: 1, name: 'Tech Infrastructure',icon: Server       },
  { id: 2, name: 'Security',           icon: Shield       },
  { id: 3, name: 'SEO & Digital',      icon: Globe        },
  { id: 4, name: 'UX & Conversion',    icon: MousePointer },
  { id: 5, name: 'Marketing',          icon: Target       },
  { id: 6, name: 'Automation',         icon: Zap          },
  { id: 7, name: 'Strategy & Roadmap', icon: Map          },
];

export function ReviewPointModal({ reviewPoint, open, onClose, onApprove }: ReviewPointModalProps) {
  const [consultantNotes, setConsultantNotes] = useState('');
  const [interviewNotes,  setInterviewNotes]  = useState('');

  if (!reviewPoint) return null;

  // Phases completed before this review point
  const blockPhases = ALL_PHASES.filter(p => p.id <= reviewPoint.after);

  function handleApprove() {
    onApprove(reviewPoint.id, consultantNotes, interviewNotes);
    setConsultantNotes('');
    setInterviewNotes('');
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-canvas)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    resize: 'vertical' as const,
    outline: 'none',
    lineHeight: 'var(--leading-relaxed)',
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        style={{
          maxWidth: 560,
          padding: 0,
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* ── Header ──────────────────────────────── */}
        <DialogHeader
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--score-3-bg)', borderRadius: 'var(--radius-md)' }}
              >
                <Star className="w-4 h-4" style={{ color: 'var(--score-3)' }} />
              </div>
              <div>
                <DialogTitle
                  className="text-base font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {reviewPoint.label}
                </DialogTitle>
                <DialogDescription className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {reviewPoint.note}
                </DialogDescription>
              </div>
            </div>
            <StatusPill status="review" label="Your input needed" />
          </div>
        </DialogHeader>

        {/* ── Body ────────────────────────────────── */}
        <div
          className="overflow-y-auto space-y-5"
          style={{ padding: '20px 24px', backgroundColor: 'var(--bg-canvas)', maxHeight: 440 }}
        >
          {/* Completed phases in this block */}
          <div>
            <SectionLabel className="mb-2.5">Completed in this block</SectionLabel>
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              {blockPhases.map((ph, i) => {
                const I = ph.icon;
                return (
                  <div
                    key={ph.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      borderBottom: i < blockPhases.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <I className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>
                      Phase {ph.id}: {ph.name}
                    </span>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-green)' }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consultant notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Consultant Notes
              <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                your observations after reviewing these phases
              </span>
            </label>
            <textarea
              rows={3}
              value={consultantNotes}
              onChange={e => setConsultantNotes(e.target.value)}
              placeholder="e.g. Tech stack is significantly outdated. Security issues are blocking — need to address before proceeding with marketing analysis."
              style={inputStyle}
              onFocus={e => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'var(--glc-blue)';
                (e.target as HTMLTextAreaElement).style.boxShadow = 'var(--shadow-blue)';
              }}
              onBlur={e => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-default)';
                (e.target as HTMLTextAreaElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Interview notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Interview Notes
              <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                key points from client conversation
              </span>
            </label>
            <textarea
              rows={3}
              value={interviewNotes}
              onChange={e => setInterviewNotes(e.target.value)}
              placeholder="e.g. Client confirmed they are aware of WordPress issues but delayed due to budget. Priority: quick wins first."
              style={inputStyle}
              onFocus={e => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'var(--glc-blue)';
                (e.target as HTMLTextAreaElement).style.boxShadow = 'var(--shadow-blue)';
              }}
              onBlur={e => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-default)';
                (e.target as HTMLTextAreaElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Info strip */}
          <div
            className="rounded-lg px-4 py-3 text-xs leading-relaxed"
            style={{ backgroundColor: 'var(--glc-blue-xlight)', color: 'var(--glc-blue-dark)', border: '1px solid var(--glc-blue-light)' }}
          >
            <strong>After approving:</strong> the next wing of the pipeline will start automatically.
            Notes are saved to the audit record and appear in the final report.
          </div>
        </div>

        {/* ── Footer ──────────────────────────────── */}
        <DialogFooter
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            className="glc-btn-ghost"
          >
            Cancel
          </button>
          <motion.button
            onClick={handleApprove}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="glc-btn-primary"
          >
            Approve & Continue
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
