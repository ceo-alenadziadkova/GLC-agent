import * as React from 'react';

import { UI_BREAKPOINTS } from '../../config/ui-breakpoints';

const MOBILE_BREAKPOINT = UI_BREAKPOINTS.mobile;

function readViewportIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/** Tracks `(max-width: mobile-1)`. Initial read is synchronous so first paint matches breakpoint (SSR: false until hydrated). */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(readViewportIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(readViewportIsMobile());
    };
    mql.addEventListener('change', onChange);
    setIsMobile(readViewportIsMobile());
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
