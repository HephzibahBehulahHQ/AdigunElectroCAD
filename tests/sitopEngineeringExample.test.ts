import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";
import { verifyCircuitSequence } from "../src/projects/templateVerification";

it("reopens the linked SITOP drawing and operates its pilot through the second return", () => {
  const file = new URL("../public/examples/sitop-psu100c-pilot-panel.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
  const [panel, circuit] = project.sheets;
  expect(panel.document.drawingGrid?.units).toBe("mm");
  const outlines = panel.document.graphics!;
  expect(outlines.map(({ x1, x2, y1, y2 }) => [x2 - x1, y2 - y1])).toEqual([[52.5, 80], [100, 80]]);
  expect(outlines.map(outline => outline.deviceLink)).toEqual(Array(2).fill({ sheetId: circuit.id, componentId: "dc" }));
  const returnWire = circuit.document.wires.find(wire => wire.id === "pilot-return")!;
  expect(returnWire.to).toEqual({ componentId: "dc", terminalId: "zero-out-2" });

  const check = (name: string, pressed: boolean, exact: string) => ({ name,
    changes: [{ reference: "S1", properties: { pressed } }],
    expectations: [{ reference: "H1", label: "Indicator lamp", exact }],
  });
  const steps = verifyCircuitSequence(circuit.document, [
    check("Released", false, "OFF"),
    check("Energized", true, "LIT · 24 V DC"),
    { ...check("Return interrupted", true, "OFF"), wireChanges: [{ ...returnWire, connected: false }] },
    { ...check("Return restored", true, "LIT · 24 V DC"), wireChanges: [{ ...returnWire, connected: true }] },
  ], catalogById);
  expect(steps.map(step => step.failures)).toEqual([[], [], [], []]);
});
