import { cn } from '../ui/utils';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}

export function SectionLabel({ children, className = '', accent = false }: SectionLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase font-[family-name:var(--font-sans)] text-[length:var(--text-2xs)] tracking-[length:var(--section-label-tracking)]',
        accent ? 'text-[var(--glc-blue)]' : 'text-[var(--text-secondary)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
