import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./tree-data-v2/augmentTopology";
import "./tree-data-v2/currentCorrections";
import { App } from "./app/App";
import { I18nProvider } from "./i18n/I18nContext";
import { CostResearchPanel } from "./features/research/CostResearchPanel";
import "./app/app.css";
import "./app/accessibility.css";
import "./app/motion-fixes.css";
import "./app/cost-research.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
      <CostResearchPanel />
    </I18nProvider>
  </StrictMode>,
);
