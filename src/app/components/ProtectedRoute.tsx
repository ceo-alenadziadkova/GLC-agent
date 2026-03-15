import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-3 animate-spin"
            style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--glc-blue)' }}
          />
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
