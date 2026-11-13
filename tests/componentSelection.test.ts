import { expect, it } from "vitest";
import { componentsInMarquee, previewComponentMove, toggleComponentSelection } from "../src/cad/componentSelection";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import { terminalAnchors } from "../src/components/Schematic";

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

it("previews a moved group without mutating the document or wire topology", () => {
  const document = createAnalogLevelProject().document;
  const selected = document.components.slice(0, 2).map((component) => component.id);
  const wires = document.wires;
  const preview = previewComponentMove(document, selected, 40, -20);
  expect(preview.components.filter((component) => selected.includes(component.id)).map(({ x, y }) => [x, y])).toEqual(
    document.components.slice(0, 2).map(({ x, y }) => [x + 40, y - 20]),
  );
  expect(preview.components.find((component) => !selected.includes(component.id))).toEqual(document.components.find((component) => !selected.includes(component.id)));
  expect(preview.wires).toBe(wires);
  expect(document.components.slice(0, 2).map(({ x, y }) => [x, y])).not.toEqual(preview.components.slice(0, 2).map(({ x, y }) => [x, y]));
  const beforeAnchors = terminalAnchors(document).filter((anchor) => selected.includes(anchor.endpoint.componentId));
  const afterAnchors = terminalAnchors(preview).filter((anchor) => selected.includes(anchor.endpoint.componentId));
  expect(afterAnchors.map(({ x, y }) => [x, y])).toEqual(beforeAnchors.map(({ x, y }) => [x + 40, y - 20]));
});
