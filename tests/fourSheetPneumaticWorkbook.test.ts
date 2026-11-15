import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { terminalGridReference } from "../src/cad/terminalAnchors";
import { ProjectLibraryPanel } from "../src/components/ProjectLibraryPanel";
import { validateCircuit } from "../src/electrical/topology";
import { createFourSheetPneumaticWorkbook } from "../src/projects/fourSheetPneumaticWorkbook";
import { resolveProjectNet, validateProjectContinuations } from "../src/projects/projectContinuations";
import { templateLibrary } from "../src/projects/templateLibrary";
import { verifyProjectTemplate } from "../src/projects/templateVerification";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { createProjectRuntimeDocument, executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";

it("offers the four-sheet cylinder workbook from its pneumatic project entry", () => {
  const selected = templateLibrary.find((template) => template.id === "pneumatic-double")!;
  const markup = renderToStaticMarkup(createElement(ProjectLibraryPanel, {
    active: true,
    templates: templateLibrary,
    selected,
    verification: verifyProjectTemplate(selected, catalogById),
    onSelect: () => {},
    onLoad: () => {},
    onOpenWorkbook: () => {},
    onOpenFourSheetWorkbook: () => {},
    onOpenStarDeltaWorkbook: () => {},
    onOpenReversingWorkbook: () => {},
    onOpenTwoMotorWorkbook: () => {},
    onOpenPneumaticWorkbook: () => {},
  }));
  expect(markup).toContain("Open 4-sheet cylinder control");
  expect(markup).toContain("Load into Free Sheet");
});

it("splits the pneumatic command, valve, cylinder and feedback into valid terminal-referenced sheets", () => {
  const project = createFourSheetPneumaticWorkbook();
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Command station", "5/2 valve", "Cylinder motion", "Position feedback"]);
  expect(project.sheets.flatMap((sheet) => sheet.document.components).map((component) => component.reference)).toEqual(["S1", "S2", "YV1", "CY1", "G1", "HL1"]);
  expect(project.continuations.map((item) => item.label)).toEqual(["EXTEND_CMD", "RETRACT_CMD", "VALVE_MOTION", "CY1_POS"]);
  expect(project.sheets.find((sheet) => sheet.id === "pneumatic-feedback")!.document.wires.map((wire) => wire.from.terminalId)).toEqual(["out"]);
  expect(validateProjectContinuations(project)).toEqual([]);
  expect(validateCircuit(createProjectRuntimeDocument(project), catalogById)).toEqual([]);
  for (const sheet of project.sheets) expect(validateCircuit(sheet.document, catalogById), sheet.name).toEqual([]);

  for (const continuation of project.continuations) {
    const [source, destination] = continuation.points;
    const sourceSheet = project.sheets.find((sheet) => sheet.id === source.sheetId)!;
    const destinationSheet = project.sheets.find((sheet) => sheet.id === destination.sheetId)!;
    expect(terminalGridReference(sourceSheet.document, source.endpoint)).toBe(source.gridReference);
    expect(terminalGridReference(destinationSheet.document, destination.endpoint)).toBe(destination.gridReference);
    expect(resolveProjectNet(project, { sheetId: source.sheetId, endpoint: source.endpoint })).toContainEqual({ sheetId: destination.sheetId, endpoint: destination.endpoint });
  }
});

it("runs extend, retained valve motion, position indication, retract and conflicting-coil inhibition across sheets", () => {
  const project = createFourSheetPneumaticWorkbook();
  const original = JSON.stringify(project);
  let runtime = resetCircuitClock(createProjectRuntimeDocument(project), catalogById);
  const runs = () => executeProjectCircuitModels(project, catalogById, undefined, runtime);
  const position = () => Number(runs().find((run) => run.sheetId === "pneumatic-motion" && run.reference === "CY1")!.evaluatedProperties.runtimePositionPercent ?? 0);
  const indicator = () => runs().find((run) => run.sheetId === "pneumatic-feedback" && run.reference === "HL1")!;
  const input = (component: string, value: boolean) => { runtime = setCircuitBooleanInput(runtime, catalogById, `pneumatic-command::${component}`, "input", value); };
  const tick = (seconds: number) => { runtime = advanceCircuitClock(runtime, catalogById, seconds); };

  input("command-extend", true);
  tick(1);
  expect(position()).toBe(25);
  input("command-extend", false);
  tick(2.5);
  expect(position()).toBe(87.5);
  expect(indicator().output.value).toBe("ON");

  input("command-retract", true);
  tick(4);
  expect(position()).toBe(0);
  expect(indicator().output.value).toBe("OFF");

  input("command-extend", true);
  input("command-retract", true);
  tick(1);
  expect(position()).toBe(0);
  expect(indicator().output.value).toContain("ERROR: Both valve coils are energized");
  expect(JSON.stringify(project)).toBe(original);
});
