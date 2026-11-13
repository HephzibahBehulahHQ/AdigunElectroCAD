import { expect, it } from "vitest";
import { toggleComponentSelection } from "../src/cad/componentSelection";

it("adds and removes Shift-selected components without losing the other selection", () => {
  expect(toggleComponentSelection(["A"], "B")).toEqual(["A", "B"]);
  expect(toggleComponentSelection(["A", "B"], "A")).toEqual(["B"]);
  expect(toggleComponentSelection(["A"], "")).toEqual(["A"]);
});
