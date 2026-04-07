import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { BrowserTranslateGuard } from './components/BrowserTranslateGuard';
import { GlcToaster } from './components/GlcToaster.tsx';
import { getGlcQueryClient } from './lib/glc-query-client';
import { router } from './routes';

export default function App() {
  const queryClient = getGlcQueryClient();
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <BrowserTranslateGuard />
        <RouterProvider router={router} />
      </QueryClientProvider>
      <GlcToaster />
    </>
  );
}