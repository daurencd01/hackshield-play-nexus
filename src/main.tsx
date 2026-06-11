import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";
import App from "./App.tsx";
import "./styles/index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from '@/contexts/AuthContext';

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </I18nextProvider>
);
