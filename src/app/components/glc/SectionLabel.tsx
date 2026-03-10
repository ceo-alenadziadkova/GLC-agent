interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold ${className}`}
      style={{
        fontSize: '10px',
        letterSpacing: 'var(--tracking-widest)',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}
