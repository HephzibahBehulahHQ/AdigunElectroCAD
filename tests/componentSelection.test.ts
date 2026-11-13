import { expect, it } from "vitest";
import { componentsInMarquee, toggleComponentSelection } from "../src/cad/componentSelection";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";

it("adds and removes Shift-selected components without losing the other selection", () => {
  expect(toggleComponentSelection(["A"], "B")).toEqual(["A", "B"]);
  expect(toggleComponentSelection(["A", "B"], "A")).toEqual(["B"]);
  expect(toggleComponentSelection(["A"], "")).toEqual(["A"]);
});

it("selects component footprints intersecting a marquee in either drag direction", () => {
  const template = createAnalogLevelProject().document.components[0];
  const components = [
    { ...template, id: "inside", x: 220, y: 220 },
    { ...template, id: "edge", x: 350, y: 220 },
    { ...template, id: "outside", x: 540, y: 220 },
  ];
  expect(componentsInMarquee(components, 120, 150, 390, 290)).toEqual(["inside", "edge"]);
  expect(componentsInMarquee(components, 390, 290, 120, 150)).toEqual(["inside", "edge"]);
});
