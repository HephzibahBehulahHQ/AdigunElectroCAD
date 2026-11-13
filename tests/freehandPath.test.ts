import { expect, it } from "vitest";
import { appendFreehandPoint, freehandPathBounds, MAX_FREEHAND_POINTS } from "../src/cad/freehandPath";

it("samples editable freehand points inside the sheet", () => {
  const points = appendFreehandPoint(appendFreehandPoint([{ x: 10, y: 20 }], { x: 12, y: 20 }), { x: 30, y: 50 });
  expect(points).toEqual([{ x: 10, y: 20 }, { x: 30, y: 50 }]);
  expect(freehandPathBounds(points)).toEqual({ x1: 10, y1: 20, x2: 30, y2: 50 });
  expect(appendFreehandPoint(points, { x: -10, y: 900 }).at(-1)).toEqual({ x: 0, y: 780 });
});

it("keeps freehand path storage bounded while preserving the current endpoint", () => {
  const points = Array.from({ length: MAX_FREEHAND_POINTS }, (_, index) => ({ x: index % 1100, y: 100 }));
  const next = appendFreehandPoint(points, { x: 1099, y: 200 });
  expect(next).toHaveLength(MAX_FREEHAND_POINTS);
  expect(next.at(-1)).toEqual({ x: 1099, y: 200 });
});
