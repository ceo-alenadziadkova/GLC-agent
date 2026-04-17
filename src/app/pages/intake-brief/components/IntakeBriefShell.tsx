import type { ReactNode } from 'react';

export function IntakeBriefShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col ds-marketing-layout-canvas">
      <div className="fixed inset-0 pointer-events-none ds-intake-brief-mesh-backdrop" />
      {children}
    </div>
  );
}
