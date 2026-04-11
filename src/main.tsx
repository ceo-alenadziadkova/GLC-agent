import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./app/App";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import { applyGlcColorScheme, GLC_THEME_STORAGE_KEY } from "./app/lib/glc-theme";
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
      <Analytics />
    </ErrorBoundary>
  </StrictMode>
);
