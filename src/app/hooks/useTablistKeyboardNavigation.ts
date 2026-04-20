import { useRef } from 'react';
import type { KeyboardEvent, RefCallback } from 'react';

type UseTablistKeyboardNavigationParams<T extends string> = {
  order: readonly T[];
  activeKey: T;
  onChange: (next: T) => void;
};

type UseTablistKeyboardNavigationResult<T extends string> = {
  setTabRef: (key: T) => RefCallback<HTMLButtonElement>;
  handleTablistKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export function useTablistKeyboardNavigation<T extends string>({
  order,
  activeKey,
  onChange,
}: UseTablistKeyboardNavigationParams<T>): UseTablistKeyboardNavigationResult<T> {
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  function focusTab(key: T) {
    tabRefs.current[key]?.focus();
  }

  function setTabRef(key: T): RefCallback<HTMLButtonElement> {
    return (element) => {
      tabRefs.current[key] = element;
    };
  }

  function handleTablistKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    event.preventDefault();
    const activeIndex = order.findIndex((key) => key === activeKey);
    if (activeIndex === -1) {
      return;
    }

    if (event.key === 'Home') {
      const first = order[0];
      onChange(first);
      focusTab(first);
      return;
    }

    if (event.key === 'End') {
      const last = order[order.length - 1];
      onChange(last);
      focusTab(last);
      return;
    }

    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (activeIndex + delta + order.length) % order.length;
    const next = order[nextIndex];
    onChange(next);
    focusTab(next);
  }

  return {
    setTabRef,
    handleTablistKeyDown,
  };
}
