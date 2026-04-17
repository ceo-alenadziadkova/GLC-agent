import { CheckCircle, ClipboardText, Cursor, Globe, HardDrives, Lightning, MagnifyingGlass, MapTrifold, Rocket, Shield, Target } from '@phosphor-icons/react';

const STEPS = [
  { label: 'Basics', icon: Globe },
  { label: 'Brief', icon: ClipboardText },
  { label: 'Launch', icon: Rocket },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0.5 mobile:gap-0 mb-6 mobile:mb-5 sm:mb-8 justify-center px-1">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex items-center gap-0.5 mobile:gap-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 mobile:w-7 mobile:h-7 rounded-full flex items-center justify-center"
                style={{
                  background: done
                    ? 'var(--score-5-bg)'
                    : active
                      ? 'var(--gradient-brand)'
                      : 'var(--bg-muted)',
                  border: done
                    ? '1px solid var(--score-5-border)'
                    : active
                      ? 'none'
                      : '1px solid var(--border-subtle)',
                  boxShadow: active ? '0 0 12px rgba(28,189,255,0.30)' : 'none',
                }}
              >
                {done
                  ? <CheckCircle weight="fill" className="h-4 w-4 text-[var(--score-5)]" />
                  : <s.icon className={`h-4 w-4 ${active ? 'text-[var(--primary-foreground)]' : 'text-[var(--text-tertiary)]'}`} />}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: active ? 'var(--text-blue)' : 'var(--text-tertiary)',
                  letterSpacing: '0.04em',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-4 h-px w-6 mobile:mb-3.5 mobile:w-4 sm:w-10 ${i < current ? 'bg-[var(--score-5)]' : 'bg-[var(--border-default)]'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const DOMAIN_PILLS = [
  { icon: MagnifyingGlass, label: 'Recon', color: 'var(--glc-blue)' },
  { icon: HardDrives, label: 'Tech', color: '#8B5CF6' },
  { icon: Shield, label: 'Security', color: 'var(--score-1)' },
  { icon: Globe, label: 'SEO', color: 'var(--glc-green)' },
  { icon: Cursor, label: 'UX', color: 'var(--score-3)' },
  { icon: Target, label: 'Marketing', color: 'var(--glc-orange)' },
  { icon: Lightning, label: 'Automation', color: 'var(--glc-blue-dark)' },
  { icon: MapTrifold, label: 'Strategy', color: 'var(--glc-green-dark)' },
] as const;
