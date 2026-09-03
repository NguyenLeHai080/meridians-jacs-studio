import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./core/i18n";
import { getToken } from "./core/session";
import { LoginPage } from "./modules/auth/LoginPage";
import { Dashboard } from "./modules/dashboard/Dashboard";
import "./styles/main.scss";

function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  return authenticated ? <Dashboard onLogout={() => setAuthenticated(false)} /> : <LoginPage onAuthenticated={() => setAuthenticated(true)} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
