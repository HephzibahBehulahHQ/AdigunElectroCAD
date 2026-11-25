import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { terminalSignalUnits } from "../src/electrical/signalContracts";
import { connectionSignalIssue } from "../src/electrical/topology";
import { verifyCircuitSequence } from "../src/projects/templateVerification";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";

it("opens and round-trips the published encoder drawing with linked geometry and isolated terminal levels", () => {
  const file = new URL("../public/examples/omron-e6b2-engineering-drawing.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  const [mechanical, schematic] = project.sheets;
  const [front, ...features] = mechanical.document.graphics!;
  const side = features.pop()!;
  expect(mechanical.document.drawingGrid?.units).toBe("mm");
  for (const outline of [front, side]) {
    expect(outline.deviceLink).toEqual({ sheetId: schematic.id, componentId: "encoder" });
    expect(outline.y2 - outline.y1).toBe(40);
  }
  expect(front.x2 - front.x1).toBe(40);
  expect(side.x2 - side.x1).toBe(54);
  expect(side.x1).toBeGreaterThan(front.x2);
  expect(features).toHaveLength(3);
  for (const mark of features) {
    expect(mark.labelHidden).toBe(true);
    expect(Math.hypot((mark.x1 + mark.x2 - front.x1 - front.x2) / 2, (mark.y1 + mark.y2 - front.y1 - front.y2) / 2)).toBeCloseTo(15);
  }
  expect(schematic.document.wires.map(({ from, to }) => [from.terminalId, to.terminalId])).toEqual([
    ["phase-a", "upper-left"], ["phase-a-inverted", "lower-left"], ["phase-z", "signal"],
  ]);
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
});

it("feeds the meter with one Z index pulse per revolution", () => {
  const file = new URL("../public/examples/omron-e6b2-engineering-drawing.json", import.meta.url);
  const document = parseProjectJson(readFileSync(file, "utf8")).sheets[1].document;
  const results = verifyCircuitSequence(document, [0, 1200, 2400].map(shaftSpeedRpm => ({
    name: `${shaftSpeedRpm} rpm`,
    changes: [{ reference: "B2", properties: { shaftSpeedRpm } }],
    expectations: [{ reference: "P1", label: "Frequency reading", exact: `${shaftSpeedRpm / 60} / 100` }],
  })), catalogById);
  expect(results.flatMap(step => step.failures)).toEqual([]);
});

it("declares Hertz on all six encoder outputs while keeping the power pins unclassified", () => {
  const file = new URL("../public/examples/omron-e6b2-engineering-drawing.json", import.meta.url);
  const document = parseProjectJson(readFileSync(file, "utf8")).sheets[1].document;
  const encoder = document.components.find(part => part.id === "encoder")!;
  const definition = catalogById.get(encoder.definitionId)!;
  for (const terminal of definition.terminals) {
    expect(terminalSignalUnits(definition, terminal.id)).toEqual(terminal.id.startsWith("phase-") ? ["hertz"] : undefined);
  }
  const wire = document.wires.find(wire => wire.id === "index-frequency")!;
  expect(connectionSignalIssue(document, catalogById, wire.from, wire.to)).toBeUndefined();
  const voltageMeter = {
    ...document,
    components: document.components.map(part => part.id === "index-meter"
      ? { ...part, properties: { ...part.properties, measurementKind: "Voltage" } }
      : part),
  };
  expect(connectionSignalIssue(voltageMeter, catalogById, wire.from, wire.to)).toMatch(/hertz/i);
});
