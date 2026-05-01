import { useEffect, useState } from 'react';

/** Subscribes to `window.matchMedia` for responsive layout branching (tablet vs desktop splits). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => {
      setMatches(media.matches);
    };
    media.addEventListener('change', onChange);
    setMatches(media.matches);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
}
