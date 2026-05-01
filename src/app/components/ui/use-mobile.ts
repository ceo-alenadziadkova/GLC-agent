import * as React from 'react';

import { UI_BREAKPOINTS } from '../../config/ui-breakpoints';

const MOBILE_BREAKPOINT = UI_BREAKPOINTS.mobile;

function readMediaMatchesMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

/** Tracks `(max-width: mobile-1)` via matchMedia (`matches`), aligned with resize/zoom semantics. SSR: false until hydrated. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(readMediaMatchesMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(mql.matches);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
