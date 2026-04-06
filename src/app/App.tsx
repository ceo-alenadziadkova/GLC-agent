import { RouterProvider } from 'react-router';
import { GlcToaster } from './components/GlcToaster.tsx';
import { router } from './routes';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <GlcToaster />
    </>
  );
}