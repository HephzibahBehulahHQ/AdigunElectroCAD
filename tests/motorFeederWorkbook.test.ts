import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Schematic } from "../src/components/Schematic";
import { createMotorFeederWorkbook } from "../src/projects/motorFeederWorkbook";
import { resolveProjectNet, updateProjectContinuation, validateProjectContinuations } from "../src/projects/projectContinuations";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { initialDolState } from "../src/simulation/dolSimulator";
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
      expect(project.continuations?.some((net) => net.points.at(-1)?.sheetId === sheet.id && net.points.at(-1)?.endpoint.terminalId === `${phase}-in`)).toBe(true);
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
    const destinations = net.filter((item) => item.endpoint.terminalId === destinationTerminalId && item.sheetId !== "sheet-source");

    expect(net).toHaveLength(conductor === "pe" ? 10 : 11);
    expect(destinations).toHaveLength(9);
    expect(destinations.map((item) => item.endpoint.terminalId)).toEqual(Array(9).fill(destinationTerminalId));
    expect(new Set(destinations.map((item) => item.sheetId)).size).toBe(9);
  }
});

it("persists distinct cable cores and reciprocal references through the W2 junction sheet", () => {
  const initial = createMotorFeederWorkbook();
  const edited = updateProjectContinuation(initial, "feed-m2-l1", { label: "Feeder 2 phase A" });
  const project = parseProjectJson(JSON.stringify(edited));
  const nets = project.continuations!;
  expect(new Set(nets.map((net) => `${net.cableCore?.cableId}/${net.cableCore?.coreId}`)).size).toBe(36);

  const net = nets.find((item) => item.id === "feed-m2-l1")!;
  expect(net.cableCore).toEqual({ cableId: "W2", coreId: "L1" });
  expect(net.points.map((point) => point.role)).toEqual(["source", "continuation", "destination"]);
  const [origin, junction, destination] = net.points;
  expect(junction.endpoint).toEqual({ componentId: "w2-junction-l1", terminalId: "node" });
  expect(resolveProjectNet(project, destination)).toContainEqual({ sheetId: origin.sheetId, endpoint: origin.endpoint });
  const renderSheet = (index: number) => renderToStaticMarkup(createElement(Schematic, {
    document: project.sheets[index].document,
    activeSheetId: project.sheets[index].id,
    projectSheets: project.sheets,
    continuations: [net],
    selectedComponentId: "",
    selectedWireId: "",
    simulation: initialDolState(),
    wireMode: false,
    wireStart: null,
    onSelect: () => {},
    onWireSelect: () => {},
    onTerminalSelect: () => {},
  }));
  expect(renderSheet(0)).toContain(`Feeder 2 phase A → S2 · ${junction.gridReference}`);
  expect(renderSheet(1)).toContain(`Feeder 2 phase A ← S1 · ${origin.gridReference} → S3 · ${destination.gridReference}`);
  expect(renderSheet(2)).toContain(`Feeder 2 phase A ← S2 · ${junction.gridReference} (src S1 · ${origin.gridReference})`);

  const duplicate = { ...nets[0], cableCore: net.cableCore };
  expect(() => parseProjectJson(JSON.stringify({ ...project, continuations: [duplicate, ...nets.slice(1)] })))
    .toThrow("Duplicate cable core: W2 / L1.");
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
