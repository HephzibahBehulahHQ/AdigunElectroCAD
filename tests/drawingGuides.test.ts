import { expect, it } from "vitest";
import { snapToDrawingGuides } from "../src/cad/drawingGuides";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createBlankProject } from "../src/projects/starterProject";

it("keeps signed guide positions and flags on a project round trip", () => {
  const project = createBlankProject();
  const document = project.sheets[0].document;
  const guides = [
    { id: "left", axis: "x" as const, coordinate: -124.75, hidden: false, locked: true },
    { id: "top", axis: "y" as const, coordinate: -80, hidden: true, locked: false },
  ];
  document.guides = guides;
  expect(parseProjectJson(JSON.stringify(project)).sheets[0].document.guides).toEqual(guides);
  document.guides = [...guides, guides[0]];
  expect(() => parseProjectJson(JSON.stringify(project))).toThrow("guide ids must be unique");
});

it("snaps each axis to its closest visible guide, including locked guides", () => {
  const point = { x: -121, y: -78 };
  const result = snapToDrawingGuides(point, [
    { id: "far", axis: "x", coordinate: -127, hidden: false, locked: false },
    { id: "close", axis: "x", coordinate: -124.75, hidden: false, locked: true },
    { id: "hidden", axis: "y", coordinate: -80, hidden: true, locked: false },
  ], 8);
  expect(result).toEqual({ point: { x: -124.75, y: -78 }, axes: new Set(["x"]) });
});
