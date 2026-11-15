import { expect, it } from "vitest";
import { createMotorFeederWorkbook } from "../src/projects/motorFeederWorkbook";
import { resolveProjectNet, validateProjectContinuations } from "../src/projects/projectContinuations";
import { createMotorStarterWorkbook } from "../src/projects/starterProject";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";
import { terminalGridReference } from "../src/cad/terminalAnchors";

it("builds a ten-sheet motor-feeder project with real wired branches and terminal-level phase/PE continuations", () => {
  const project = createMotorFeederWorkbook();
  expect(project.sheets).toHaveLength(10);
  expect(project.continuations).toHaveLength(36);
  expect(validateProjectContinuations(project)).toEqual([]);
  expect(project.sheets[0].document.components.map((component) => component.definitionId)).toEqual(["iec.ac-supply.01"]);
  expect(catalogById.get("iec.ac-supply.01")?.terminals.map((terminal) => terminal.id)).toEqual(["l1-out", "l2-out", "l3-out", "pe"]);
  expect(project.sheets.flatMap((sheet) => sheet.document.components).some((component) => component.definitionId.startsWith("generic."))).toBe(false);

  for (let ordinal = 1; ordinal <= 9; ordinal++) {
    const sheet = project.sheets[ordinal];
    const references = sheet.document.components.map((component) => component.reference);
    expect(references).toContain(`Q${ordinal}`);
    expect(references).toContain(`KM${ordinal}`);
    expect(references).toContain(`F${ordinal}`);
    expect(references).toContain(`M${ordinal}`);
    expect(references.some((reference) => reference.startsWith("H"))).toBe(false);
    expect(sheet.document.wires.length).toBeGreaterThanOrEqual(16);
    for (const phase of ["l1", "l2", "l3"]) {
      expect(project.continuations?.some((net) => net.points[1].sheetId === sheet.id && net.points[1].endpoint.terminalId === `${phase}-in`)).toBe(true);
    }
    expect(project.continuations?.some((net) => net.points[1].sheetId === sheet.id && net.points[1].endpoint.terminalId === "pe")).toBe(true);
  }
});

it("validates the actual terminal wiring on every sheet", () => {
  const project = createMotorFeederWorkbook();
  for (const sheet of project.sheets) {
    expect(validateCircuit(sheet.document, catalogById), sheet.name).toEqual([]);
  }
});

it("uses the real ten-sheet feeder workbook as the motor starter project", () => {
  expect(createMotorStarterWorkbook().sheets).toHaveLength(10);
});

it("resolves each source conductor to only its nine matching feeder terminals", () => {
  const project = createMotorFeederWorkbook();
  for (const conductor of ["l1", "l2", "l3", "pe"] as const) {
    const terminalId = conductor === "pe" ? "pe" : `${conductor}-out`;
    const destinationTerminalId = conductor === "pe" ? "pe" : `${conductor}-in`;
    const net = resolveProjectNet(project, { sheetId: "sheet-source", endpoint: { componentId: "distribution-source", terminalId } });
    const destinations = net.filter((item) => item.sheetId !== "sheet-source");

    expect(net).toHaveLength(10);
    expect(destinations).toHaveLength(9);
    expect(destinations.map((item) => item.endpoint.terminalId)).toEqual(Array(9).fill(destinationTerminalId));
    expect(new Set(destinations.map((item) => item.sheetId)).size).toBe(9);
  }
});

it("uses terminal-derived grid references and distinct phase colors across all 36 continuations", () => {
  const project = createMotorFeederWorkbook();
  const colors = new Map([["L1", "#c42626"], ["L2", "#d2a000"], ["L3", "#356ac3"], ["PE", "#1d8f53"]]);
  for (const continuation of project.continuations ?? []) {
    const conductor = continuation.label.startsWith("L1") ? "L1" : continuation.label.startsWith("L2") ? "L2" : continuation.label.startsWith("L3") ? "L3" : "PE";
    expect(continuation.conductorColor).toBe(colors.get(conductor));
    for (const point of continuation.points) {
      const sheet = project.sheets.find((item) => item.id === point.sheetId)!;
      expect(point.gridReference).toBe(terminalGridReference(sheet.document, point.endpoint));
    }
  }
});

it("starts each feeder independently when its own START control is pressed", () => {
  const project = createMotorFeederWorkbook();
  for (let ordinal = 1; ordinal <= 9; ordinal++) {
    const feeder = project.sheets[ordinal];
    const pressedDocument = {
      ...feeder.document,
      components: feeder.document.components.map((component) => component.id === `m${ordinal}-start`
        ? { ...component, properties: { ...component.properties, pressed: true } }
        : component),
    };
    const runs = executeProjectCircuitModels(project, catalogById, feeder.id, pressedDocument);
    for (let motorOrdinal = 1; motorOrdinal <= 9; motorOrdinal++) {
      const motor = runs.find((run) => run.sheetId === `sheet-motor-${motorOrdinal}` && run.componentId === `m${motorOrdinal}-motor`);
      expect(motor, `M${motorOrdinal} result while S${ordinal} is pressed`).toBeDefined();
      if (motorOrdinal === ordinal) expect(motor!.output.value).toContain("rpm");
      else expect(motor!.output.value).toBe("STANDBY");
    }
  }
});
