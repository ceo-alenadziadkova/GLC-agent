import { FileText, DownloadSimple, ShareNetwork } from '@phosphor-icons/react';

interface AuditHeaderProps {
  title: string;
  subtitle?: string;
}

export function AuditHeader({ title, subtitle }: AuditHeaderProps) {
  return (
    <div className="mb-8 border-b border-[var(--panel-border)] pb-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-6 w-6 text-[var(--text-tertiary)]" />
            <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-base text-[var(--text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-4 py-2 text-[var(--text-secondary)] transition-all"
          >
            <ShareNetwork className="w-4 h-4" />
            <span className="text-sm font-medium">Share</span>
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--text-primary)] px-4 py-2 text-white transition-all"
          >
            <DownloadSimple className="w-4 h-4" />
            <span className="text-sm font-medium">Export PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
