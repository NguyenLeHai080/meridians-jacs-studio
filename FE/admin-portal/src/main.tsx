import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./core/i18n";
import { getToken } from "./core/session";
import { LoginPage } from "./modules/auth/LoginPage";
import { Dashboard } from "./modules/dashboard/Dashboard";
import "./styles/tailwind.css";
import "./styles/main.scss";

function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));

  useEffect(() => {
    const handleUnauthorized = () => setAuthenticated(false);
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);

  return authenticated ? <Dashboard onLogout={() => setAuthenticated(false)} /> : <LoginPage onAuthenticated={() => setAuthenticated(true)} />;
}

const container = document.getElementById("root")!;
let root = (container as any)._reactRoot;
if (!root) {
  root = createRoot(container);
  (container as any)._reactRoot = root;
}

root.render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
