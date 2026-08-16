import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { App } from "./App";

describe("IPA-driven planner UI", () => {
  it("shows only Gold and Dice Core as Dice Tree currencies", () => {
    render(<I18nProvider><App /></I18nProvider>);
    expect(screen.getByText("골드")).toBeInTheDocument();
    expect(screen.getByText("다이스 코어")).toBeInTheDocument();
    expect(screen.queryByText("파란 재화")).not.toBeInTheDocument();
    expect(screen.queryByText("빨간 재화")).not.toBeInTheDocument();
    expect(screen.queryByText("프리즘 재화")).not.toBeInTheDocument();
  });

  it("offers a real Predator stat simulator instead of detail-pending placeholders", () => {
    render(<I18nProvider><App /></I18nProvider>);
    expect(screen.getByRole("button", { name: /포식 주사위/ })).toBeInTheDocument();
    expect(screen.getByText("포식 시뮬레이터")).toBeInTheDocument();
    expect(screen.getByText(/기본 대미지/)).toBeInTheDocument();
    expect(screen.queryByText(/내용 상세 확인 중/)).not.toBeInTheDocument();
  });
});
