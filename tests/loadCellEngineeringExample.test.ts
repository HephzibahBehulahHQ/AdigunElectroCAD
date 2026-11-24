import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";

const variants = [
  { id: "hbk.z6fc3.100kg", length: 123, width: 42, centres: [13, 31, 113], diameters: [8.2, 8.2, 8.2] },
  { id: "hbk.z6fc3.500kg", length: 123, width: 42, centres: [13, 31, 113], diameters: [10.5, 10.5, 11.1] },
  { id: "hbk.z6gc3.500kg", length: 210, width: 60, centres: [15, 55, 188], diameters: [13, 13, 11.1] },
];

it("imports and round-trips all three published HBK mounting drawings", () => {
  const file = new URL("../public/examples/hbk-z6-mounting-comparison.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  expect(project.sheets).toHaveLength(6);
  for (const [index, variant] of variants.entries()) {
    const [mounting, schematic] = project.sheets.slice(2 * index, 2 * index + 2);
    const [outline, ...bores] = mounting.document.graphics!;
    const [cell] = schematic.document.components;
    expect(cell.definitionId).toBe(variant.id);
    expect(outline.deviceLink).toEqual({ sheetId: schematic.id, componentId: cell.id });
    expect(mounting.document.drawingGrid?.units).toBe("mm");
    expect(outline.x2 - outline.x1).toBe(variant.length);
    expect(outline.y2 - outline.y1).toBe(variant.width);
    expect(bores).toHaveLength(3);
    for (const [boreIndex, bore] of bores.entries()) {
      expect(bore.kind).toBe("ellipse");
      expect(bore.x2 - bore.x1).toBeCloseTo(variant.diameters[boreIndex]);
      expect(bore.y2 - bore.y1).toBeCloseTo(variant.diameters[boreIndex]);
      expect((bore.x1 + bore.x2) / 2 - outline.x1).toBeCloseTo(variant.centres[boreIndex]);
      expect((bore.y1 + bore.y2) / 2).toBeCloseTo((outline.y1 + outline.y2) / 2);
    }
  }
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
});
