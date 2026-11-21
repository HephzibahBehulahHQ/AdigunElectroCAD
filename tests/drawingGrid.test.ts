import { expect, it } from "vitest";
import { defaultDrawingGrid, snapDrawingCoordinate, visibleGridSpacing } from "../src/cad/drawingGrid";
import { insertWireRoutePointAt } from "../src/cad/wirePath";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createBlankProject } from "../src/projects/starterProject";

it("keeps display density independent of signed snapping and actual wire endpoints", () => {
  expect(visibleGridSpacing(10, 1)).toBe(20);
  expect(visibleGridSpacing(10, .25)).toBe(80);
  expect(snapDrawingCoordinate(-13.75, 2.5)).toBe(-12.5);
  expect(snapDrawingCoordinate(-13.75, null)).toBe(-13.75);
  const from = { x: -23.25, y: -3.5 }, to = { x: 21.25, y: -3.5 };
  expect(insertWireRoutePointAt(from, to, [], false, false, { x: -13, y: -3.5 }, 8, 2.5)?.point).toEqual({ x: -12.5, y: -3.5 });
});

it("preserves distinct sheet grid settings through reload and accepts old drawings", () => {
  const project = createBlankProject();
  expect(parseProjectJson(JSON.stringify(project)).sheets[0].document.drawingGrid).toBeUndefined();
  const configured = { ...defaultDrawingGrid, displaySpacing: 10, snapSpacing: 2.5, snapEnabled: false };
  project.sheets[0].document.drawingGrid = configured;
  expect(parseProjectJson(JSON.stringify(project)).sheets[0].document.drawingGrid).toEqual(configured);
});
