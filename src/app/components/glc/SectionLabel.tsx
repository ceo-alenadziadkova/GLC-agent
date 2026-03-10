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
        fontSize: '10px',
        letterSpacing: '0.10em',
        color: accent ? 'var(--glc-blue)' : 'var(--text-tertiary)',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </span>
  );
}
