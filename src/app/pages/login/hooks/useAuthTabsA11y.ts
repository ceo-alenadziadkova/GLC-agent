import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { LOGIN_UI_POLICY } from '../config/login-ui-policy';
import type { AuthMode } from '../types';

type UseAuthTabsA11yParams = {
  mode: AuthMode;
  activateMode: (nextMode: AuthMode) => void;
};

export function useAuthTabsA11y({ mode, activateMode }: UseAuthTabsA11yParams) {
  const signInTabRef = useRef<HTMLButtonElement | null>(null);
  const signUpTabRef = useRef<HTMLButtonElement | null>(null);

  function focusAuthTab(modeToFocus: AuthMode) {
    if (modeToFocus === 'signin') {
      signInTabRef.current?.focus();
      return;
    }
    signUpTabRef.current?.focus();
  }

  function handleAuthTabsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    event.preventDefault();
    const activeIndex = LOGIN_UI_POLICY.authTabOrder.findIndex(tab => tab === mode);
    if (activeIndex === -1) {
      return;
    }

    if (event.key === 'Home') {
      activateMode('signin');
      focusAuthTab('signin');
      return;
    }
    if (event.key === 'End') {
      activateMode('signup');
      focusAuthTab('signup');
      return;
    }

    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (activeIndex + delta + LOGIN_UI_POLICY.authTabOrder.length) % LOGIN_UI_POLICY.authTabOrder.length;
    const nextMode = LOGIN_UI_POLICY.authTabOrder[nextIndex] as AuthMode;
    activateMode(nextMode);
    focusAuthTab(nextMode);
  }

  return {
    signInTabRef,
    signUpTabRef,
    handleAuthTabsKeyDown,
  };
}
