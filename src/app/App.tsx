import { QueryClientProvider } from './lib/tanstack-react-query';
import { RouterProvider } from 'react-router';
import { BrowserTranslateGuard } from './components/BrowserTranslateGuard';
import { GlcToaster } from './components/GlcToaster';
import { AuthProvider } from './hooks/useAuth';
import { getGlcQueryClient } from './lib/glc-query-client';
import { router } from './routes';

export default function App() {
  const queryClient = getGlcQueryClient();
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserTranslateGuard />
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
      <GlcToaster />
    </>
  );
}