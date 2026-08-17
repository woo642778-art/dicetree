import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { I18nProvider } from "./i18n/I18nContext";
import "./app/tokens.css";
import "./app/app-v3.css";
import "./app/recommend-v3.css";
import "./app/motion-v3.css";
import "./app/mobile-v3.css";
import "./app/product-v4.css";
import "./app/ingame-v41.css";
import "./app/assets-v42.css";
import "./app/v45-guided-analysis.css";
import "./app/v46-tree-core.css";
import "./app/accessibility.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
