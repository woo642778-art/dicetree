import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ConditionDefinitionV3 } from "../../../simulation/mechanics/types";
import { ConditionControls } from "./ConditionControls";

afterEach(cleanup);

const predatorStacks: ConditionDefinitionV3 = {
  key: "predatorStacks",
  labelKey: "sim_condition_predator_stacks",
  type: "number",
  defaultValue: 0,
  min: 0,
};

describe("ConditionControls", () => {
  it("never exposes an untranslated internal condition key", () => {
    render(
      <ConditionControls
        definitions={[predatorStacks]}
        values={{}}
        locale="ko"
        labelForKey={(key) => key}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("포식 스택")).toBeInTheDocument();
    expect(screen.queryByText("sim_condition_predator_stacks")).not.toBeInTheDocument();
  });

  it("uses English product copy and humanizes future condition keys", () => {
    render(
      <ConditionControls
        definitions={[
          predatorStacks,
          { ...predatorStacks, key: "futureMechanic", labelKey: "sim_condition_future_mechanic" },
        ]}
        values={{}}
        locale="en"
        labelForKey={(key) => key}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("Predator stacks")).toBeInTheDocument();
    expect(screen.getByText("Future Mechanic")).toBeInTheDocument();
    expect(screen.queryByText("sim_condition_future_mechanic")).not.toBeInTheDocument();
  });
});
