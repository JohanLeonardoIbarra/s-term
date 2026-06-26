import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import { getSettings } from "./settings";
import "@xterm/xterm/css/xterm.css";
import "./styles/index.css";

const settings = getSettings();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider initialLanguage={settings.language}>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
