import { useEffect, useMemo } from 'react';
import { isRouteErrorResponse, useNavigate, useLocation, useRouteError } from 'react-router';
import { resolveGlcErrorHome } from '../lib/glc-error-home';
import { GlcAppErrorScreen } from './GlcAppErrorScreen';

function errorToTechnicalDetail(error: unknown): string | undefined {
  if (isRouteErrorResponse(error)) {
    return `RouteError ${error.status}: ${typeof error.data === 'string' ? error.data : 'navigation error'}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === 'string') return error;
  return undefined;
}

/**
 * React Router `errorElement` — friendly copy; technical detail only for support payload / console.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  const supportRef = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    console.error('[RouteErrorPage]', error);
  }, [error]);

  const technicalDetail = errorToTechnicalDetail(error);
  const { href: homeHref, label: homeLabel } = resolveGlcErrorHome(location.pathname);

  return (
    <GlcAppErrorScreen
      supportRef={supportRef}
      technicalDetail={technicalDetail}
      onRetry={() => navigate(0)}
      homeHref={homeHref}
      homeLabel={homeLabel}
      title="This page could not be shown"
    />
  );
}
