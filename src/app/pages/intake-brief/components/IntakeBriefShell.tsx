import type { ReactNode } from 'react';

export function IntakeBriefShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--mesh-brand)', opacity: 0.4 }}
      />
      {children}
    </div>
  );
}
