import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from './ui/utils';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export function CollapsibleSection({ 
  title, 
  subtitle, 
  defaultOpen = true, 
  children,
  headerExtra 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between group mb-4"
      >
        <div className="flex-1 text-left">
          <div className="text-xs font-semibold tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {title}
          </div>
          {subtitle && (
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {subtitle}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-3">
          {headerExtra}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="p-1 rounded-lg group-hover:bg-[var(--surface)] transition-colors"
          >
            <CaretDown
              className="w-5 h-5"
              style={{ color: 'var(--text-tertiary)' }}
            />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
