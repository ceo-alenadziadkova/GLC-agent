import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
import { applyGlcColorScheme, GLC_THEME_STORAGE_KEY } from "./app/lib/glc-theme.ts";
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
      <App />
    </ErrorBoundary>
  </StrictMode>
);
