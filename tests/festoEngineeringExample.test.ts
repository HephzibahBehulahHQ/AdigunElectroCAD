import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { verifyCircuitSequence } from "../src/projects/templateVerification";

it("operates the published 5/2 valve from the linked mounting drawing", () => {
  const file = new URL("../public/examples/festo-vovg-coil-test.json", import.meta.url);
  const [plan, schematic] = parseProjectJson(readFileSync(file, "utf8")).sheets;
  const [outline] = plan.document.graphics!;
  const valve = schematic.document.components.find(component => component.id === outline.deviceLink?.componentId)!;
  expect(outline.deviceLink?.sheetId).toBe(schematic.id);
  expect(valve.definitionId).toBe("festo.vovg.560708");
  expect([outline.x2 - outline.x1, outline.y2 - outline.y1]).toEqual([49, 25]);

  const coilReturn = schematic.document.wires.find(wire => wire.id === "coil-return")!;
  const check = (name: string, pressed: boolean, exact: string) => ({
    name,
    changes: [{ reference: "S1", properties: { pressed } }],
    expectations: [{ reference: valve.reference, label: "Open pneumatic paths", exact }],
  });
  const [released, energized, fault, repaired, stopped] = verifyCircuitSequence(schematic.document, [
    check("Release", false, "1 ↔ 2 · 4 ↔ 5"),
    check("Energize", true, "1 ↔ 4 · 2 ↔ 3"),
    { ...check("Break coil return", true, "1 ↔ 2 · 4 ↔ 5"), wireChanges: [{ ...coilReturn, connected: false }] },
    { ...check("Repair coil return", true, "1 ↔ 4 · 2 ↔ 3"), wireChanges: [{ ...coilReturn, connected: true }] },
    check("Release again", false, "1 ↔ 2 · 4 ↔ 5"),
  ], catalogById);
  expect([released, energized, fault, repaired, stopped].map(step => step.failures)).toEqual([[], [], [], [], []]);
});
