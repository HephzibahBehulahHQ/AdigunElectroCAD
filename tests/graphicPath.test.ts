import { expect, it } from "vitest";
import { deleteGraphicPathVertex, insertGraphicPathVertex, moveGraphicPathVertex } from "../src/cad/graphicPath";

it("inserts a snapped vertex on the nearest polyline segment and ignores distant clicks", () => {
  const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  expect(insertGraphicPathVertex(points, "polyline", 55, 5)).toEqual([{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 100, y: 0 }]);
  expect(insertGraphicPathVertex(points, "polyline", 55, 50)).toBeNull();
});

it("inserts into the closing edge of a polygon and preserves ordered vertices", () => {
  const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  expect(insertGraphicPathVertex(points, "polygon", 5, 55)).toEqual([...points, { x: 0, y: 60 }]);
});

it("prevents deleting required vertices or collapsing a polygon", () => {
  expect(deleteGraphicPathVertex([{ x: 0, y: 0 }, { x: 100, y: 0 }], "polyline", 0)).toBeNull();
  const square = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  expect(deleteGraphicPathVertex(square, "polygon", 1)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
  expect(deleteGraphicPathVertex(square.slice(0, 3), "polygon", 0)).toBeNull();
  expect(deleteGraphicPathVertex([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }, { x: 300, y: 0 }], "polygon", 1)).toBeNull();
});

it("snaps moved vertices to the grid and rejects duplicate adjacent points", () => {
  const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
  expect(moveGraphicPathVertex(points, "polyline", 1, 42, 37)).toEqual([{ x: 0, y: 0 }, { x: 40, y: 40 }, { x: 100, y: 100 }]);
  expect(moveGraphicPathVertex(points, "polyline", 1, 3, 2)).toBeNull();
});
