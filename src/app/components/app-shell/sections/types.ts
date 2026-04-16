import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AppShellNavItem } from '../../../lib/app-shell-nav';
import type { AppShellCopy } from '../../../config/app-shell-copy';

export type AppShellSectionCopy = AppShellCopy['aria'];

export type AppShellSharedSectionProps = {
  navItems: AppShellNavItem[];
  sectionLabel: string;
  roleUnknown: boolean;
  isGuest: boolean;
  isClient: boolean;
  isConsultant: boolean;
  isAuthenticated: boolean;
  locationPathname: string;
  unreadCount: number;
  onOpenNotifications: () => void;
  onCloseMobileMenu: () => void;
  shellCopy: AppShellCopy;
};

export type AppShellHeaderProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  isSmUp: boolean;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenMobileMenu: () => void;
  shellCopy: AppShellCopy;
};

export type AppShellUserBlockProps = {
  user: User | null;
  profile: { full_name: string | null } | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isClient: boolean;
  roleDisplayName: string | null;
  onSignOut: () => void | Promise<void>;
  shellCopy: AppShellCopy;
};

