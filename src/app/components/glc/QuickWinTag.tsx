import { Zap } from 'lucide-react';

interface QuickWinTagProps {
  time?: string;
  cost?: string;
}

export function QuickWinTag({ time, cost }: QuickWinTagProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: 'var(--glc-orange-xlight)',
        color: 'var(--glc-orange)',
        border: '1px solid var(--glc-orange-light)',
      }}
    >
      <Zap className="w-3 h-3" />
      Quick Win
      {(time || cost) && (
        <span className="opacity-60 font-normal">
          {time && ` · ${time}`}
          {cost && ` · ${cost}`}
        </span>
      )}
    </span>
  );
}
