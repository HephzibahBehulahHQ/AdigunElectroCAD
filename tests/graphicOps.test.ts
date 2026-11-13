import { describe, expect, it } from "vitest";
import { duplicateSchematicGraphic, setSchematicGraphicBounds } from "../src/cad/graphicOps";
import type { SchematicGraphic } from "../src/types/electrical";

const pathGraphic: SchematicGraphic = {
  id: "path-1", name: "Route", kind: "polyline", x1: 100, y1: 100, x2: 200, y2: 200,
  points: [{ x: 100, y: 100 }, { x: 100, y: 200 }, { x: 200, y: 200 }],
  color: "#1565c0", strokeWidth: 2,
};

describe("drafting graphic duplication", () => {
  it("copies paths with a new id, a copy name, and independent shifted vertices", () => {
    const duplicate = duplicateSchematicGraphic(pathGraphic, "path-2");
    expect(duplicate).toEqual({ ...pathGraphic, id: "path-2", name: "Route copy", x1: 120, y1: 120, x2: 220, y2: 220, points: [{ x: 120, y: 120 }, { x: 120, y: 220 }, { x: 220, y: 220 }] });
    expect(duplicate.points).not.toBe(pathGraphic.points);
  });

  it("moves a duplicate left and up when the forward offset would cross the sheet edge", () => {
    const graphic: SchematicGraphic = { id: "box", name: "Box", kind: "rectangle", x1: 1080, y1: 760, x2: 1100, y2: 780, color: "#19324f", fillColor: null, strokeWidth: 2 };
    const duplicate = duplicateSchematicGraphic(graphic, "box-copy");
    expect([duplicate.x1, duplicate.y1, duplicate.x2, duplicate.y2]).toEqual([1060, 740, 1080, 760]);
  });
});

const rectangle: SchematicGraphic = { id: "r1", name: "Panel", kind: "rectangle", x1: 100, y1: 120, x2: 300, y2: 240, color: "#1565c0", strokeWidth: 2 };

it("edits exact graphic coordinates while preserving its drafting properties", () => {
  expect(setSchematicGraphicBounds(rectangle, { x1: 80, y1: 90, x2: 360, y2: 270 })).toEqual({ ...rectangle, x1: 80, y1: 90, x2: 360, y2: 270 });
});

it("rejects graphic coordinates outside the sheet or spans too small to draw", () => {
  expect(setSchematicGraphicBounds(rectangle, { x1: -1, y1: 90, x2: 360, y2: 270 })).toBeNull();
  expect(setSchematicGraphicBounds(rectangle, { x1: 80, y1: 90, x2: 82, y2: 270 })).toBeNull();
});

it("keeps path vertex geometry on the vertex editor", () => {
  const path = { ...rectangle, kind: "polyline" as const, points: [{ x: 100, y: 120 }, { x: 300, y: 240 }] };
  expect(setSchematicGraphicBounds(path, { x1: 80, y1: 90, x2: 360, y2: 270 })).toBeNull();
});
