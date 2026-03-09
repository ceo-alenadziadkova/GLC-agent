import { cn } from './ui/utils';

interface StatusBadgeProps {
  status: 'excellent' | 'good' | 'moderate' | 'needs-improvement' | 'critical';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    const styles: Record<string, { bg: string; color: string; text: string }> = {
      'excellent': { 
        bg: '#F0FDF4', 
        color: 'var(--status-excellent)', 
        text: 'Excellent' 
      },
      'good': { 
        bg: '#F0FDF4', 
        color: 'var(--status-good)', 
        text: 'Good' 
      },
      'moderate': { 
        bg: '#FFFBEB', 
        color: 'var(--status-moderate)', 
        text: 'Moderate' 
      },
      'needs-improvement': { 
        bg: '#FFF7ED', 
        color: 'var(--status-needs-improvement)', 
        text: 'Needs Improvement' 
      },
      'critical': { 
        bg: '#FFF1F0', 
        color: 'var(--status-critical)', 
        text: 'Critical' 
      }
    };

    return styles[status] || styles.moderate;
  };

  const style = getStatusStyles(status);

  return (
    <span
      className={cn('inline-flex items-center px-3 py-1 text-xs font-medium rounded-full', className)}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.text}
    </span>
  );
}
