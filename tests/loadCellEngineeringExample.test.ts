import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { verifyCircuitSequence } from "../src/projects/templateVerification";
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

it("uses the linked HBK bridge output to drive the acceptance circuit", () => {
  const file = new URL("../public/examples/hbk-z6-mounting-comparison.json", import.meta.url);
  const document = parseProjectJson(readFileSync(file, "utf8")).sheets[1].document;
  const check = (name: string, forceN: number, output: string, coil: "ON" | "OFF") => ({
    name, changes: [{ reference: "B1", properties: { forceN } }],
    expectations: [
      { reference: "B1", label: "Load-cell output", exact: output },
      { reference: "K1", label: "Coil", exact: coil },
    ],
  });
  const results = verifyCircuitSequence(document, [
    check("Empty", 0, "0.000 mV", "OFF"),
    check("Half scale", 490.3325, "5.000 mV", "ON"),
    check("Full scale", 980.665, "10.000 mV", "OFF"),
  ], catalogById);
  expect(results.flatMap(step => step.failures)).toEqual([]);
});
