import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
  getNearestVerticalScrollAncestor,
  scrollElementStartIntoNearestVerticalScrollContainer,
} from '../scroll-element-start-into-vertical-scroll-container';

describe('getNearestVerticalScrollAncestor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('returns overflow-y-auto parent when it can scroll vertically', () => {
    const scroll = document.createElement('div');
    scroll.style.height = '100px';
    scroll.style.overflowY = 'auto';

    const spacer = document.createElement('div');
    spacer.style.height = '500px';
    const target = document.createElement('div');
    target.style.height = '20px';

    scroll.appendChild(spacer);
    scroll.appendChild(target);
    document.body.appendChild(scroll);

    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 100 });
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 520 });

    expect(getNearestVerticalScrollAncestor(target)).toBe(scroll);
  });

  it('returns null when no scrollable ancestor', () => {
    const flat = document.createElement('div');
    const target = document.createElement('div');
    flat.appendChild(target);
    document.body.appendChild(flat);

    expect(getNearestVerticalScrollAncestor(target)).toBeNull();
  });
});

describe('scrollElementStartIntoNearestVerticalScrollContainer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('scrolls the nearest scroll parent instead of calling scrollIntoView on the target', () => {
    const scrollIntoView = vi.fn();
    const scroll = document.createElement('div');
    scroll.style.height = '100px';
    scroll.style.overflowY = 'auto';

    const topSpacer = document.createElement('div');
    topSpacer.style.height = '200px';
    const target = document.createElement('div');
    target.style.height = '40px';

    scroll.appendChild(topSpacer);
    scroll.appendChild(target);
    document.body.appendChild(scroll);

    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 100 });
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 500 });
    scroll.scrollTop = 0;
    scroll.scrollTo = function scrollTo(opts: ScrollToOptions) {
      scroll.scrollTop = typeof opts.top === 'number' ? opts.top : 0;
    };

    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 320, 100));
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 220, 320, 40));

    Object.defineProperty(target, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    scrollElementStartIntoNearestVerticalScrollContainer(target, { behavior: 'auto' });

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(scroll.scrollTop).toBe(220);
  });

  it('falls back to scrollIntoView when no scroll parent exists', () => {
    const scrollIntoView = vi.fn();

    const target = document.createElement('div');
    document.body.appendChild(target);

    Object.defineProperty(target, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    scrollElementStartIntoNearestVerticalScrollContainer(target, { behavior: 'smooth' });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });
  });
});
