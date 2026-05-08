import { useId, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CaretDown } from '@phosphor-icons/react';

interface CollapsibleSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  children: React.ReactNode;
  summary?: string;
  headerExtra?: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  id,
  title,
  subtitle,
  defaultOpen = true,
  isOpen,
  onToggle,
  children,
  summary,
  headerExtra,
  className,
}: CollapsibleSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const panelId = useId();
  const contentId = id ?? `collapsible-section-${panelId}`;
  const controlled = typeof isOpen === 'boolean';
  const open = controlled ? isOpen : internalOpen;

  function handleToggle() {
    const nextOpen = !open;
    if (!controlled) {
      setInternalOpen(nextOpen);
    }
    onToggle?.(nextOpen);
  }

  return (
    <section id={contentId} className={className ?? 'mb-6'}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={`${contentId}-content`}
        className="w-full flex items-center justify-between group mb-5"
      >
        <div className="flex-1 text-left">
          <h2 className="mb-1 text-sm font-semibold tracking-wide text-[var(--text-tertiary)]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xl font-semibold text-[var(--text-primary)]">
              {subtitle}
            </p>
          )}
          {summary ? (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              {summary}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {headerExtra}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="p-1 rounded-lg group-hover:bg-[var(--surface)] transition-colors"
          >
            <CaretDown className="h-5 w-5 text-[var(--text-tertiary)]" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${contentId}-content`}
            initial={shouldReduceMotion ? false : { opacity: 0, gridTemplateRows: '0fr' }}
            animate={{ opacity: 1, gridTemplateRows: '1fr' }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, gridTemplateRows: '0fr' }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeInOut' }}
            className="grid overflow-hidden"
          >
            <div className="min-h-0 overflow-hidden">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
