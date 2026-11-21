import { expect, it } from "vitest";
import { cameraBounds, viewportToDrawing, zoomDrawingAt } from "../src/cad/drawingCamera";

it("keeps the same signed drawing point under the pointer through zoom", () => {
  const camera = { center: { x: -250, y: -170 }, zoom: 0.5 };
  const viewport = { width: 800, height: 600 };
  const pointer = { x: 600, y: 200 };
  expect(cameraBounds(camera, viewport)).toEqual({ x: -1050, y: -770, width: 1600, height: 1200 });
  const point = viewportToDrawing(camera, viewport, pointer);
  expect(point).toEqual({ x: 150, y: -370 });
  expect(viewportToDrawing(zoomDrawingAt(camera, viewport, pointer, 2), viewport, pointer)).toEqual(point);
});
