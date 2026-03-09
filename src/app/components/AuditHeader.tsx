import { FileText, Download, Share2 } from 'lucide-react';

interface AuditHeaderProps {
  title: string;
  subtitle?: string;
}

export function AuditHeader({ title, subtitle }: AuditHeaderProps) {
  return (
    <div className="border-b mb-8 pb-6" style={{ borderColor: 'var(--panel-border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }} />
            <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-lg border transition-all flex items-center gap-2"
            style={{
              borderColor: 'var(--panel-border)',
              color: 'var(--text-secondary)'
            }}
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Share</span>
          </button>
          <button
            className="px-4 py-2 rounded-lg border transition-all flex items-center gap-2"
            style={{
              borderColor: 'var(--panel-border)',
              backgroundColor: 'var(--text-primary)',
              color: 'white'
            }}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
