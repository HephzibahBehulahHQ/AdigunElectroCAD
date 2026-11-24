import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";
import { verifyCircuitSequence } from "../src/projects/templateVerification";

it("reopens the linked PTTB drawing and lights the pilot only with both levels connected", () => {
  const file = new URL("../public/examples/phoenix-pttb-two-level-pilot.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
  const [panel, circuit] = project.sheets;
  expect(panel.document.drawingGrid?.units).toBe("mm");
  const outlines = panel.document.graphics!;
  expect(outlines).toHaveLength(2);
  [5.2, 45.9].forEach((width, index) => {
    const outline = outlines[index];
    expect(outline.x2 - outline.x1).toBeCloseTo(width);
    expect(outline.y2 - outline.y1).toBeCloseTo(68.2);
    expect(outline.deviceLink).toEqual({ sheetId: circuit.id, componentId: "terminal" });
  });

  const upper = circuit.document.wires.find(wire => wire.id === "terminal-to-pilot")!;
  const lower = circuit.document.wires.find(wire => wire.id === "terminal-to-return")!;
  expect([upper.from.terminalId, lower.from.terminalId]).toEqual(["upper-right", "lower-left"]);
  const check = (name: string, pressed: boolean, exact: string) => ({ name,
    changes: [{ reference: "S1", properties: { pressed } }],
    expectations: [{ reference: "H1", label: "Indicator lamp", exact }],
  });
  const steps = verifyCircuitSequence(circuit.document, [
    check("Released", false, "OFF"),
    check("Both levels connected", true, "LIT · 24 V DC"),
    { ...check("Upper level interrupted", true, "OFF"), wireChanges: [{ ...upper, connected: false }] },
    { ...check("Lower level interrupted", true, "OFF"), wireChanges: [{ ...upper, connected: true }, { ...lower, connected: false }] },
    { ...check("Both levels restored", true, "LIT · 24 V DC"), wireChanges: [{ ...lower, connected: true }] },
  ], catalogById);
  expect(steps.flatMap(step => step.failures)).toEqual([]);
});
