import { Link } from 'react-router';
import { GlcLogo } from '../../../components/GlcLogo';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

export function IntakeBriefHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
      <Link to="/" className="inline-flex items-center" aria-label={copy.headerHomeAria}>
        <GlcLogo className="h-9" />
      </Link>
      <ThemeToggle />
    </header>
  );
}
