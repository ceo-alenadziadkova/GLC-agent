/** Where to send users after an app-level error (consultant shell vs marketing vs portal). */
export function resolveGlcErrorHome(pathname: string): { href: string; label: string } {
  if (pathname.startsWith('/portal')) {
    return { href: '/portal', label: 'Back to portal' };
  }
  const consultantLike =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/portfolio') ||
    pathname.startsWith('/pipeline/') ||
    pathname.startsWith('/reports/') ||
    pathname.startsWith('/strategy/') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/audit/new') ||
    /^\/audit\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/i.test(pathname);
  if (consultantLike) {
    return { href: '/dashboard', label: 'Back to dashboard' };
  }
  return { href: '/', label: 'Home' };
}
