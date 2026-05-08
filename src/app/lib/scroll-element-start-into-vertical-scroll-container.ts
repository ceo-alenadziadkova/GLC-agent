/** Parses a CSS length from `getComputedStyle`; returns 0 when unparsable (e.g. jsdom). */
export function parseCssPixels(length: string): number {
  const value = Number.parseFloat(length);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Nearest ancestor that can scroll vertically (`overflow-y` scrollable and content taller than viewport).
 * Skips {@link document.documentElement}; returns null when none so callers can fall back to
 * {@link Element.scrollIntoView} (window/document scrolling).
 */
export function getNearestVerticalScrollAncestor(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    if (current === document.documentElement) {
      return null;
    }

    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    const allowsVerticalScroll =
      overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';

    if (allowsVerticalScroll && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * Aligns `element` to the top of its nearest vertical scroll container (`block: 'start'`), honoring
 * CSS `scroll-margin-top`. Avoids calling {@link Element.scrollIntoView} when a scroll parent exists
 * so nested AppShell columns do not also scroll the window/document (which caused large negative
 * `getBoundingClientRect().top` for in-column panels like `#glc-execution-roadmap`).
 */
export function scrollElementStartIntoNearestVerticalScrollContainer(
  element: HTMLElement,
  options?: { behavior?: ScrollBehavior },
): void {
  const scrollParent = getNearestVerticalScrollAncestor(element);
  const behavior = options?.behavior ?? 'auto';

  if (!scrollParent) {
    element.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
    return;
  }

  const scrollMarginTop = parseCssPixels(getComputedStyle(element).scrollMarginTop);
  const parentRect = scrollParent.getBoundingClientRect();
  const elRect = element.getBoundingClientRect();
  let nextTop = scrollParent.scrollTop + (elRect.top - parentRect.top) - scrollMarginTop;
  const maxTop = Math.max(0, scrollParent.scrollHeight - scrollParent.clientHeight);
  nextTop = Math.min(Math.max(0, nextTop), maxTop);
  scrollParent.scrollTo({ top: nextTop, behavior });
}
