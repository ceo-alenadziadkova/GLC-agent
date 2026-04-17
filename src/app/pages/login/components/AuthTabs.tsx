import type { KeyboardEventHandler, RefObject } from 'react';
import { LOGIN_PAGE_COPY_EN as LC } from '../../../config/login-copy.en';
import type { AuthMode } from '../types';

type AuthTabsProps = {
  mode: AuthMode;
  authTabIds: { signIn: string; signUp: string; panel: string };
  signInTabRef: RefObject<HTMLButtonElement | null>;
  signUpTabRef: RefObject<HTMLButtonElement | null>;
  onActivateMode: (mode: AuthMode) => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

function getTabStyle(isActive: boolean) {
  return {
    backgroundColor: isActive ? 'var(--bg-canvas)' : 'transparent',
    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
    border: 'none',
    cursor: 'pointer',
  } as const;
}

export function AuthTabs(props: AuthTabsProps) {
  const { mode, authTabIds, signInTabRef, signUpTabRef, onActivateMode, onKeyDown } = props;
  return (
    <div
      className="glc-auth-tabs flex rounded-lg p-0.5"
      role="tablist"
      aria-label={LC.tagline}
      onKeyDown={onKeyDown}
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <button
        ref={signInTabRef}
        type="button"
        onClick={() => onActivateMode('signin')}
        id={authTabIds.signIn}
        role="tab"
        aria-selected={mode === 'signin'}
        aria-controls={authTabIds.panel}
        tabIndex={mode === 'signin' ? 0 : -1}
        className="glc-auth-tab flex-1 py-2 text-sm font-medium rounded-md transition-colors"
        style={getTabStyle(mode === 'signin')}
      >
        {LC.tabSignIn}
      </button>
      <button
        ref={signUpTabRef}
        type="button"
        onClick={() => onActivateMode('signup')}
        id={authTabIds.signUp}
        role="tab"
        aria-selected={mode === 'signup'}
        aria-controls={authTabIds.panel}
        tabIndex={mode === 'signup' ? 0 : -1}
        className="glc-auth-tab flex-1 py-2 text-sm font-medium rounded-md transition-colors"
        style={getTabStyle(mode === 'signup')}
      >
        {LC.tabRegister}
      </button>
    </div>
  );
}
