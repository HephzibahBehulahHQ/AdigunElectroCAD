import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { terminalGridReference } from "../src/cad/terminalAnchors";
import { ProjectLibraryPanel } from "../src/components/ProjectLibraryPanel";
import { validateCircuit } from "../src/electrical/topology";
import { createPlcSensorActuatorProject } from "../src/projects/plcSensorActuator";
import { createThreeSheetPlcSensorWorkbook } from "../src/projects/threeSheetPlcSensorWorkbook";
import { resolveProjectNet, validateProjectContinuations } from "../src/projects/projectContinuations";
import { templateLibrary } from "../src/projects/templateLibrary";
import { verifyProjectTemplate } from "../src/projects/templateVerification";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { createProjectRuntimeDocument, executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";

it("adds a fully wired, tested generic IEC sensor/PLC/actuator project to the library", () => {
  const template = templateLibrary.find((item) => item.id === "plc-proximity-solenoid-hold")!;
  expect(template).toEqual(createPlcSensorActuatorProject());
  expect(validateCircuit(template.document, catalogById)).toEqual([]);
  expect(verifyProjectTemplate(template, catalogById)).toMatchObject({ passed: true, topologyIssues: [], failedExpectations: [] });
  expect(template.document.wires.map((wire) => wire.netName)).toEqual(["SENSOR_I0", "SENSOR_COM", "Q0"]);
  expect(template.document.components.map((component) => component.definitionId)).toEqual([
    "generic.iec.proximity-sensor", "generic.iec.plc-digital-io", "generic.iec.solenoid-actuator",
  ]);
});

it("offers its three-sheet workbook from the selected project", () => {
  const selected = templateLibrary.find((item) => item.id === "plc-proximity-solenoid-hold")!;
  const markup = renderToStaticMarkup(createElement(ProjectLibraryPanel, {
    active: true, templates: templateLibrary, selected, verification: verifyProjectTemplate(selected, catalogById),
    onSelect: () => {}, onLoad: () => {}, onOpenWorkbook: () => {}, onOpenFourSheetWorkbook: () => {},
    onOpenStarDeltaWorkbook: () => {}, onOpenReversingWorkbook: () => {}, onOpenTwoMotorWorkbook: () => {},
    onOpenPlcSensorWorkbook: () => {},
  }));
  expect(markup).toContain("Open 3-sheet PLC sensor control");
  expect(markup).toContain("Load into Free Sheet");
});

it("retains each wired PLC sensor path across its actual sheet terminal references", () => {
  const project = createThreeSheetPlcSensorWorkbook();
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Sensor field", "PLC scan", "Solenoid output"]);
  expect(project.continuations.map((item) => item.label)).toEqual(["SENSOR_I0", "SENSOR_COM", "Q0"]);
  expect(validateProjectContinuations(project)).toEqual([]);
  expect(validateCircuit(createProjectRuntimeDocument(project), catalogById)).toEqual([]);
  for (const sheet of project.sheets) expect(validateCircuit(sheet.document, catalogById), sheet.name).toEqual([]);
  for (const continuation of project.continuations) {
    const [source, destination] = continuation.points;
    const from = project.sheets.find((sheet) => sheet.id === source.sheetId)!;
    const to = project.sheets.find((sheet) => sheet.id === destination.sheetId)!;
    expect(terminalGridReference(from.document, source.endpoint)).toBe(source.gridReference);
    expect(terminalGridReference(to.document, destination.endpoint)).toBe(destination.gridReference);
    expect(resolveProjectNet(project, { sheetId: source.sheetId, endpoint: source.endpoint })).toContainEqual({ sheetId: destination.sheetId, endpoint: destination.endpoint });
  }
});

it("runs the project-wide holding and stop sequence across the three sheets", () => {
  const project = createThreeSheetPlcSensorWorkbook();
  let runtime = resetCircuitClock(createProjectRuntimeDocument(project), catalogById);
  const runs = () => executeProjectCircuitModels(project, catalogById, undefined, runtime);
  const plc = () => runs().find((run) => run.sheetId === "plc-sensor-scan" && run.reference === "PLC1")!.output.value;
  const actuator = () => runs().find((run) => run.sheetId === "plc-sensor-output" && run.reference === "Y1")!.output.value;
  const tick = () => { runtime = advanceCircuitClock(runtime, catalogById, 0.1); };

  tick();
  expect(plc()).toBe("I0 OFF · I1 OFF · Q0 OFF");
  runtime = setCircuitBooleanInput(runtime, catalogById, "plc-sensor-field::sensor", "detected", true);
  tick();
  expect(plc()).toBe("I0 ON · I1 OFF · Q0 ON");
  expect(actuator()).toBe("EXTENDED 0 mm");
  runtime = setCircuitBooleanInput(runtime, catalogById, "plc-sensor-field::sensor", "detected", false);
  tick();
  expect(actuator()).toBe("EXTENDED 0 mm");
  runtime = setCircuitBooleanInput(runtime, catalogById, "plc-sensor-scan::plc", "inputB", true);
  tick();
  expect(plc()).toBe("I0 OFF · I1 ON · Q0 OFF");
  expect(actuator()).toBe("RETRACTED");
  runtime = setCircuitBooleanInput(runtime, catalogById, "plc-sensor-scan::plc", "inputB", false);
  tick();
  expect(actuator()).toBe("RETRACTED");
});
