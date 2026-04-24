import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import { DictationProvider } from "./app/components/dictation/dictation-context";
import { applyGlcColorScheme, GLC_THEME_STORAGE_KEY } from "./app/lib/glc-theme";
import '@fontsource-variable/inter/index.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import "./styles/index.css";

applyGlcColorScheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (localStorage.getItem(GLC_THEME_STORAGE_KEY) == null) {
    applyGlcColorScheme();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <DictationProvider>
        <App />
      </DictationProvider>
    </ErrorBoundary>
  </StrictMode>
);
