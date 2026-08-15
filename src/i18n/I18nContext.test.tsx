import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { I18nProvider, useI18n } from "./I18nContext";

function Probe({ semanticRank }: { semanticRank: number }) {
  const { locale, setLocale, t } = useI18n();
  return <>
    <span data-testid="title">{t("app.title")}</span>
    <output data-testid="semantic-rank">{semanticRank}</output>
    <button type="button" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>switch</button>
  </>;
}

beforeEach(() => localStorage.clear());

it("changes display language without touching semantic planner data", async () => {
  const user = userEvent.setup();
  render(<I18nProvider><Probe semanticRank={3} /></I18nProvider>);
  expect(screen.getByTestId("title")).toHaveTextContent("랜덤다이스2");
  expect(screen.getByTestId("semantic-rank")).toHaveTextContent("3");
  await user.click(screen.getByRole("button", { name: "switch" }));
  expect(screen.getByTestId("title")).toHaveTextContent("Random Dice 2 Tree Planner");
  expect(screen.getByTestId("semantic-rank")).toHaveTextContent("3");
});
