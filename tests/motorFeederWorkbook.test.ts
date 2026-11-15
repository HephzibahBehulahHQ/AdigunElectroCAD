import { expect, it } from "vitest";
import { createMotorFeederWorkbook } from "../src/projects/motorFeederWorkbook";
import { resolveProjectNet, validateProjectContinuations } from "../src/projects/projectContinuations";
import { createMotorStarterWorkbook } from "../src/projects/starterProject";
import { catalogById } from "../src/catalog/dolCatalog";
import { executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";

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

it("uses the real ten-sheet feeder workbook as the motor starter project", () => {
  expect(createMotorStarterWorkbook().sheets).toHaveLength(10);
});

it("resolves a source phase to all nine real feeder breaker terminals without mixing phases", () => {
  const project = createMotorFeederWorkbook();
  const net = resolveProjectNet(project, { sheetId: "sheet-source", endpoint: { componentId: "distribution-source", terminalId: "l1-out" } });
  expect(net).toHaveLength(10);
  expect(net.every((item) => item.endpoint.terminalId === "l1-out" || item.endpoint.terminalId === "l1-in")).toBe(true);
  expect(net.filter((item) => item.endpoint.terminalId === "l1-in")).toHaveLength(9);
  const otherPhase = resolveProjectNet(project, { sheetId: "sheet-source", endpoint: { componentId: "distribution-source", terminalId: "l2-out" } });
  expect(otherPhase).toHaveLength(10);
  expect(otherPhase.some((item) => item.endpoint.terminalId === "l1-in")).toBe(false);
});

it("simulates source continuations across sheets and keeps motor results scoped to their sheet", () => {
  const project = createMotorFeederWorkbook();
  const feeder = project.sheets.find((sheet) => sheet.id === "sheet-motor-1")!;
  const pressedDocument = {
    ...feeder.document,
    components: feeder.document.components.map((component) => component.id === "m1-start"
      ? { ...component, properties: { ...component.properties, pressed: true } }
      : component),
  };
  const runs = executeProjectCircuitModels(project, catalogById, feeder.id, pressedDocument);
  const motor = runs.find((run) => run.sheetId === feeder.id && run.componentId === "m1-motor");
  const otherMotor = runs.find((run) => run.sheetId === "sheet-motor-2" && run.componentId === "m2-motor");

  expect(motor?.output.value).toContain("rpm");
  expect(otherMotor?.output.value).toBe("STANDBY");
});

