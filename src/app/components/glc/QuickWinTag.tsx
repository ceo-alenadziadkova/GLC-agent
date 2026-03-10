import { Zap } from 'lucide-react';

interface QuickWinTagProps {
  time?: string;
  cost?: string;
}

export function QuickWinTag({ time, cost }: QuickWinTagProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold"
      style={{
        backgroundColor: 'var(--glc-orange-xlight)',
        color: 'var(--glc-orange)',
        border: '1px solid rgba(242,79,29,0.22)',
        padding: '2px 8px 2px 6px',
        fontSize: '11px',
        letterSpacing: '0.01em',
      }}
    >
      <Zap className="w-3 h-3 flex-shrink-0" style={{ fill: 'var(--glc-orange)', stroke: 'none' }} />
      Quick Win
      {(time || cost) && (
        <span style={{ opacity: 0.55, fontWeight: 400 }}>
          {time && ` · ${time}`}
          {cost && ` · ${cost}`}
        </span>
      )}
    </span>
  );
}
