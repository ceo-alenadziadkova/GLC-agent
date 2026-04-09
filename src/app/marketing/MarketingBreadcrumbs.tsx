import { Link } from 'react-router';
import { CaretRight } from '@phosphor-icons/react';

export type Crumb = { label: string; to?: string };

export function MarketingBreadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Section navigation" className="mb-8">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <CaretRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />}
            {c.to && i < items.length - 1 ? (
              <Link
                to={c.to}
                className="font-medium transition-colors hover:underline"
                style={{ color: 'var(--glc-blue)' }}
              >
                {c.label}
              </Link>
            ) : (
              <span
                className={i === items.length - 1 ? 'font-medium' : undefined}
                style={{ color: i === items.length - 1 ? 'var(--text-secondary)' : undefined }}
              >
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
