import { Link } from 'react-router';
import { CaretRight } from '@phosphor-icons/react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <CaretRight className="h-4 w-4 text-[var(--text-tertiary)]" />
          )}
          {item.href ? (
            <Link
              to={item.href}
              className="text-sm text-[var(--text-secondary)] hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
