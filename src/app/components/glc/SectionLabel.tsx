interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}

export function SectionLabel({ children, className = '', accent = false }: SectionLabelProps) {
  return (
    <span
      className={`inline-flex items-center font-bold ${className}`}
      style={{
        fontSize: 'var(--text-2xs)',
        letterSpacing: '0.10em',
        color: accent ? 'var(--glc-blue)' : 'var(--text-secondary)',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </span>
  );
}
