import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';

type QueueInlineActionTone = 'info' | 'success' | 'default';

const QUEUE_INLINE_ACTION_TONE_CLASS: Record<QueueInlineActionTone, string> = {
  info: 'text-info border-info/40 hover:text-info',
  success: 'text-success border-success/40 bg-success/10 hover:bg-success/15 hover:text-success',
  default: 'text-foreground',
};

type QueueInlineActionLinkProps = {
  to: string;
  children: ReactNode;
  tone?: QueueInlineActionTone;
  variant?: 'ghost' | 'outline';
  className?: string;
  ariaLabel?: string;
};

export function QueueInlineActionLink({
  to,
  children,
  tone = 'info',
  variant = 'ghost',
  className,
  ariaLabel,
}: QueueInlineActionLinkProps) {
  return (
    <Button
      asChild
      type="button"
      variant={variant}
      size="sm"
      className={cn('glc-touch-target sm:min-h-0', QUEUE_INLINE_ACTION_TONE_CLASS[tone], className)}
    >
      <Link to={to} aria-label={ariaLabel}>
        {children}
      </Link>
    </Button>
  );
}
