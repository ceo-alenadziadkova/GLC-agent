import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { cn } from './ui/utils';

gsap.registerPlugin(MotionPathPlugin);

/** Letter "G" trace from design reference (viewBox 0 0 37 37). */
const PATH_D =
  'M29.2339 8.03455C26.8776 5.50102 23.7179 3.85996 20.2901 3.3894C16.8624 2.91883 13.3774 3.6477 10.4255 5.45251C7.47363 7.25733 5.23644 10.0271 4.09296 13.2926C2.94947 16.5581 2.97002 20.1184 4.1511 23.3705C5.33219 26.6226 7.6012 29.3663 10.5737 31.137C13.5462 32.9076 17.0394 33.5962 20.4615 33.0861C23.8836 32.576 27.0241 30.8986 29.351 28.3381C31.6779 25.7775 33.0481 22.4913 33.2295 19.0362L18.2295 19.0301';

export type SyncPathLoaderProps = {
  className?: string;
  /** One full orbit cycle duration in seconds (reference default: 8). */
  durationSeconds?: number;
  /**
   * `indeterminate` — loop until unmount (auth / unknown wait).
   * `finite` — play once then show complete state (demo / staged transitions).
   */
  variant?: 'indeterminate' | 'finite';
  /**
   * `fullscreen` — dark canvas (e.g. auth gate).
   * `embedded` — transparent, light-theme path colours, fits inside existing pages (e.g. Snapshot).
   */
  layout?: 'fullscreen' | 'embedded';
  /** SVG edge length in px. Defaults by layout: embedded 128, fullscreen 180. */
  svgSize?: number;
  /** When false, status and percent are screen-reader only (animation still runs). */
  showCaptions?: boolean;
  loadingText?: string;
  completeText?: string;
};

export function SyncPathLoader({
  className,
  durationSeconds = 8,
  variant = 'indeterminate',
  layout = 'fullscreen',
  svgSize: svgSizeProp,
  showCaptions: showCaptionsProp,
  loadingText = 'Loading',
  completeText = 'Ready',
}: SyncPathLoaderProps) {
  const showCaptions = showCaptionsProp ?? layout === 'fullscreen';
  const svgSize = svgSizeProp ?? (layout === 'embedded' ? 128 : 180);
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const ballGroupRef = useRef<SVGGElement>(null);
  const ballShapeRef = useRef<SVGPathElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const percentRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const logo = logoRef.current;
    const ballGroup = ballGroupRef.current;
    const ballShape = ballShapeRef.current;
    const pathG = pathRef.current;
    const percentEl = percentRef.current;
    const statusEl = statusRef.current;

    if (!root || !logo || !ballGroup || !ballShape || !pathG || !percentEl || !statusEl) {
      return;
    }

    const css = getComputedStyle(document.documentElement);
    const pathIdleVar = (css.getPropertyValue('--sync-loader-path-idle') || '').trim() || '#30363d';
    const pathPulseVar = (css.getPropertyValue('--sync-loader-path-pulse') || '').trim() || '#484f58';
    const pathStrokeIdle = layout === 'embedded' ? pathIdleVar : '#30363d';
    const pathStrokePulse = layout === 'embedded' ? pathPulseVar : '#484f58';

    const TOTAL_DURATION = durationSeconds;
    const progress = { value: 0 };

    const ctx = gsap.context(() => {
      gsap.set(pathG, { stroke: pathStrokeIdle });
      gsap.set(ballShape, { x: -4, y: -4 });
      gsap.set(logo, { rotation: 0, transformOrigin: '50% 50%' });

      function setInitialBallState() {
        gsap.set(ballGroup, {
          motionPath: {
            path: pathG,
            align: pathG,
            alignOrigin: [0.5, 0.5],
            start: 0,
            end: 0,
          },
        });
      }
      setInitialBallState();

      function finalizeLoader() {
        statusEl.textContent = completeText;
        statusEl.style.color = 'var(--glc-blue)';
        statusEl.style.opacity = '1';
        gsap.to(percentEl, { opacity: 0, y: -10, duration: 0.3 });
        gsap.to(logo, {
          filter: 'drop-shadow(0 0 20px rgba(28, 189, 255, 0.3))',
          duration: 1.5,
          repeat: -1,
          yoyo: true,
        });
      }

      statusEl.textContent = loadingText;
      statusEl.style.color = '';
      statusEl.style.opacity = '';
      gsap.set(percentEl, { opacity: 1, y: 0 });

      const masterTl = gsap.timeline({
        repeat: variant === 'indeterminate' ? -1 : 0,
        onComplete: variant === 'finite' ? finalizeLoader : undefined,
      });

      for (let i = 1; i <= 4; i++) {
        const segmentTl = gsap.timeline();
        segmentTl
          .to(ballGroup, {
            duration: (TOTAL_DURATION / 4) * 0.6,
            ease: 'power2.inOut',
            motionPath: {
              path: pathG,
              align: pathG,
              alignOrigin: [0.5, 0.5],
              start: 0,
              end: 1,
            },
          })
          .to(ballGroup, {
            duration: (TOTAL_DURATION / 4) * 0.2,
            ease: 'power1.in',
            motionPath: {
              path: pathG,
              align: pathG,
              alignOrigin: [0.5, 0.5],
              start: 1,
              end: 0,
            },
          })
          .to(logo, {
            rotation: 90 * i,
            duration: (TOTAL_DURATION / 4) * 0.2,
            ease: 'expo.inOut',
            onStart: () => {
              gsap.to(logo, { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1 });
            },
          });
        masterTl.add(segmentTl);
      }

      gsap.to(progress, {
        value: 100,
        duration: TOTAL_DURATION,
        ease: 'none',
        repeat: variant === 'indeterminate' ? -1 : 0,
        onUpdate: () => {
          percentEl.textContent = `${Math.round(progress.value)}%`;
        },
      });

      gsap.to(pathG, {
        stroke: pathStrokePulse,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, root);

    return () => ctx.revert();
  }, [variant, durationSeconds, loadingText, completeText, layout]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative flex flex-col items-center justify-center font-sans',
        layout === 'fullscreen' &&
          'min-h-screen overflow-hidden bg-[var(--glc-ink)] text-[#e6edf3]',
        layout === 'embedded' && 'w-full max-w-[min(100%,20rem)] text-[var(--text-primary)]',
        className,
      )}
      role="status"
      aria-live={showCaptions ? 'polite' : 'off'}
      aria-busy="true"
      aria-label={!showCaptions ? loadingText : undefined}
    >
      {layout === 'fullscreen' && (
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.5)_100%)]"
          aria-hidden
        />
      )}

      <div className="relative flex flex-col items-center">
        <svg
          ref={logoRef}
          width={svgSize}
          height={svgSize}
          viewBox="0 0 37 37"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto block max-w-[min(100%,11.25rem)] overflow-visible"
          aria-hidden
        >
          <path
            ref={pathRef}
            d={PATH_D}
            stroke={layout === 'embedded' ? 'var(--sync-loader-path-idle)' : '#30363d'}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g ref={ballGroupRef}>
            <path
              ref={ballShapeRef}
              d="M4 0C6.20914 0 8 1.79086 8 4C8 6.20914 6.20914 8 4 8C1.79086 8 0 6.20914 0 4C0 1.79086 1.79086 0 4 0Z"
              fill="var(--glc-blue)"
              stroke="none"
              style={{ filter: 'drop-shadow(0 0 8px rgba(28, 189, 255, 0.6))' }}
            />
          </g>
        </svg>

        <div
          ref={statusRef}
          aria-hidden={!showCaptions}
          className={cn(
            layout === 'fullscreen' && 'mt-10 text-sm font-light uppercase tracking-[0.2rem] opacity-80',
            layout === 'embedded' && showCaptions && 'mt-6 text-xs font-medium uppercase tracking-[0.15em] text-[var(--text-tertiary)]',
            !showCaptions && 'sr-only',
          )}
        >
          {loadingText}
        </div>
        <div
          ref={percentRef}
          aria-hidden={!showCaptions}
          className={cn(
            'font-mono font-bold text-[var(--glc-blue)]',
            layout === 'fullscreen' && 'mt-2.5 text-base',
            layout === 'embedded' && showCaptions && 'mt-2 text-sm',
            !showCaptions && 'sr-only',
          )}
        >
          0%
        </div>
      </div>
    </div>
  );
}
