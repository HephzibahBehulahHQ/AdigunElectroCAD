import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { terminalGridReference } from "../src/cad/terminalAnchors";
import { ProjectLibraryPanel } from "../src/components/ProjectLibraryPanel";
import { validateCircuit } from "../src/electrical/topology";
import { createFourSheetAnalogLevelWorkbook } from "../src/projects/fourSheetAnalogLevelWorkbook";
import { resolveProjectNet, validateProjectContinuations } from "../src/projects/projectContinuations";
import { templateLibrary } from "../src/projects/templateLibrary";
import { verifyProjectTemplate } from "../src/projects/templateVerification";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput, setCircuitLevelInput } from "../src/simulation/circuitClock";
import { createProjectRuntimeDocument, executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";

it("shows the four-sheet analog workbook action in Projects for its source project", () => {
  const selected = templateLibrary.find((template) => template.id === "analog-level-plc-threshold")!;
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
    onOpenAnalogWorkbook: () => {},
  }));
  expect(markup).toContain("Open 4-sheet analog level project");
  expect(markup).toContain("Load into Free Sheet");
});

it("splits the connected level signal chain into four valid sheets with terminal references", () => {
  const project = createFourSheetAnalogLevelWorkbook();
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Field transmitter", "Signal conversion", "PLC control", "Actuator output"]);
  expect(project.sheets.flatMap((sheet) => sheet.document.components).map((component) => component.reference)).toEqual(["B1", "ADC1", "PLC1", "K1"]);
  expect(project.continuations.map((item) => item.label)).toEqual(["4_20mA", "AI0_RAW", "Q0"]);
  expect(validateProjectContinuations(project)).toEqual([]);
  expect(validateCircuit(createProjectRuntimeDocument(project), catalogById)).toEqual([]);
  for (const sheet of project.sheets) expect(validateCircuit(sheet.document, catalogById), sheet.name).toEqual([]);

  for (const continuation of project.continuations) {
    const [source, destination] = continuation.points;
    const sourceSheet = project.sheets.find((sheet) => sheet.id === source.sheetId)!;
    const destinationSheet = project.sheets.find((sheet) => sheet.id === destination.sheetId)!;
    expect(source.role).toBe("source");
    expect(destination.role).toBe("destination");
    expect(terminalGridReference(sourceSheet.document, source.endpoint)).toBe(source.gridReference);
    expect(terminalGridReference(destinationSheet.document, destination.endpoint)).toBe(destination.gridReference);
    expect(resolveProjectNet(project, { sheetId: source.sheetId, endpoint: source.endpoint })).toContainEqual({ sheetId: destination.sheetId, endpoint: destination.endpoint });
  }
});

it("carries the level threshold, open-loop fault, and recovery across sheet continuations", () => {
  const project = createFourSheetAnalogLevelWorkbook();
  const original = JSON.stringify(project);
  const coilValue = (runtime: ReturnType<typeof createProjectRuntimeDocument>) => executeProjectCircuitModels(project, catalogById, undefined, runtime).find((run) => run.reference === "K1")!.output.value;
  const plcValue = (runtime: ReturnType<typeof createProjectRuntimeDocument>) => executeProjectCircuitModels(project, catalogById, undefined, runtime).find((run) => run.reference === "PLC1")!.output.value;
  let runtime = resetCircuitClock(createProjectRuntimeDocument(project), catalogById);

  runtime = setCircuitLevelInput(runtime, catalogById, "analog-field::level", 75);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  expect(plcValue(runtime)).toContain("AI0 20736");
  expect(plcValue(runtime)).toContain("Q0 ON");
  expect(coilValue(runtime)).toBe("ON");

  runtime = setCircuitBooleanInput(runtime, catalogById, "analog-field::level", "simulateOpenLoop", true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  expect(plcValue(runtime)).toContain("AI0 INVALID");
  expect(plcValue(runtime)).toContain("Q0 OFF");
  const faultedCoil = executeProjectCircuitModels(project, catalogById, undefined, runtime).find((run) => run.reference === "K1")!;
  expect(faultedCoil.output.error).toMatch(/loop is open/i);
  expect(faultedCoil.evaluatedProperties.input).toBe(false);

  runtime = setCircuitBooleanInput(runtime, catalogById, "analog-field::level", "simulateOpenLoop", false);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  expect(plcValue(runtime)).toContain("AI0 20736");
  expect(coilValue(runtime)).toBe("ON");
  expect(JSON.stringify(project)).toBe(original);
});
