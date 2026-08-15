import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { treeNodes } from "../../tree-data/nodes";
import { TreeCanvas } from "./TreeCanvas";

function renderCanvas(search = "") {
  const onSelect = vi.fn();
  render(
    <I18nProvider>
      <TreeCanvas
        nodes={treeNodes}
        ranks={{}}
        onSelect={onSelect}
        recommendations={[]}
        familyFilter="all"
        search={search}
      />
    </I18nProvider>,
  );
  return onSelect;
}

describe("TreeCanvas", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("marks unknown tree slots as unverified and keeps them inspectable", () => {
    const onSelect = renderCanvas();
    const unknown = screen.getAllByRole("button", { name: "미확인 노드" })[0];
    expect(unknown).toHaveClass("is-unverified");
    fireEvent.click(unknown);
    expect(onSelect).toHaveBeenCalled();
  });

  it("matches English names while the Korean locale is active", () => {
    renderCanvas("All-dice bullet damage");
    expect(screen.getByTestId("node-global-bullet-observed-next")).not.toHaveClass("is-dim");
    expect(screen.getByTestId("node-chaos-attack-speed-observed-next")).toHaveClass("is-dim");
  });
});
