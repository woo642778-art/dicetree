import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { App } from "./App";
import { I18nProvider } from "../i18n/I18nContext";
it("renders Korean by default and exposes unverified state", () => { localStorage.removeItem("dicetree.locale"); render(<I18nProvider><App /></I18nProvider>); expect(screen.getByText("랜덤다이스2 다이스 트리 플래너")).toBeInTheDocument(); expect(screen.getByText(/미확인 슬롯/)).toBeInTheDocument(); });
