import { useEffect, useState } from 'react';
import { APP_SHELL_UI_POLICY } from '../config/app-shell-ui-policy';

export type AppShellState = {
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  desktopSidebarCollapsed: boolean;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  isSmUp: boolean;
};

export function useAppShellState(): AppShellState {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [isSmUp, setIsSmUp] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(APP_SHELL_UI_POLICY.media.smMinWidth);
    const onMq = () => setIsSmUp(mql.matches);
    onMq();
    mql.addEventListener('change', onMq);
    return () => mql.removeEventListener('change', onMq);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return {
    notificationsOpen,
    setNotificationsOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed,
    isSmUp,
  };
}

