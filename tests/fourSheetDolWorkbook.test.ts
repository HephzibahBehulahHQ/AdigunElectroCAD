import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { resolveProjectNet, validateProjectContinuations } from "../src/projects/projectContinuations";
import { createFourSheetDolWorkbook } from "../src/projects/fourSheetDolWorkbook";
import { executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";
import { terminalGridReference } from "../src/cad/terminalAnchors";

it("builds a four-sheet sourced DOL starter with real devices and every wire retained locally or as a labeled continuation", () => {
  const project = createFourSheetDolWorkbook();
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Supply & breaker", "Motor power", "Control supply", "Operator station"]);
  expect(project.continuations).toHaveLength(9);
  expect(validateProjectContinuations(project)).toEqual([]);
  expect(project.sheets.flatMap((sheet) => sheet.document.components).map((component) => component.id).sort()).toEqual(["breaker", "contactor", "control", "control-psu", "motor", "overload", "start", "stop", "supply"]);
  expect(project.sheets.flatMap((sheet) => sheet.document.wires)).toHaveLength(13);
  const definitions = Object.fromEntries(project.sheets.flatMap((sheet) => sheet.document.components).map((component) => [component.reference, component.definitionId]));
  expect(definitions).toEqual({
    X1: "iec.ac-supply.01",
    Q1: "iec.industrial-miniature-breaker.01",
    KM1: "iec.motor-starter.01",
    F1: "overload.thermal",
    M1: "iec.induction-motor.01",
    X2: "supply.control",
    T1: "iec.dc-control-supply.01",
    S0: "pushbutton.stop-nc",
    S1: "pushbutton.start-no",
  });
  expect(project.sheets.flatMap((sheet) => sheet.document.components).some((component) => component.definitionId.startsWith("generic."))).toBe(false);
  expect(project.continuations?.map((item) => item.label)).toEqual(["L1", "L2", "L3", "PE", "24V+", "STOP_OK", "OL_OK", "COIL_START", "0V"]);

  for (const sheet of project.sheets) expect(validateCircuit(sheet.document, catalogById), sheet.name).toEqual([]);
  for (const continuation of project.continuations ?? []) {
    const [source, destination] = continuation.points;
    for (const point of continuation.points) {
      const sheet = project.sheets.find((item) => item.id === point.sheetId)!;
      expect(point.gridReference).toBe(terminalGridReference(sheet.document, point.endpoint));
    }
    expect(source?.role).toBe("source");
    expect(destination?.role).toBe("destination");
    const resolved = resolveProjectNet(project, { sheetId: source!.sheetId, endpoint: source!.endpoint });
    expect(resolved).toContainEqual({ sheetId: destination!.sheetId, endpoint: destination!.endpoint });
  }
});

it("runs the source-backed motor from the remote operator sheet through cross-sheet START and STOP wiring", () => {
  const project = createFourSheetDolWorkbook();
  const operatorSheet = project.sheets.find((sheet) => sheet.id === "dol-page-station")!;
  const startedDocument = {
    ...operatorSheet.document,
    components: operatorSheet.document.components.map((component) => component.id === "start"
      ? { ...component, properties: { ...component.properties, pressed: true } }
      : component),
  };
  const startedRuns = executeProjectCircuitModels(project, catalogById, operatorSheet.id, startedDocument);
  expect(startedRuns.find((run) => run.sheetId === "dol-page-motor" && run.componentId === "motor")?.output.value).toBe("1470 rpm / 7.5 kW");

  const stoppedDocument = {
    ...operatorSheet.document,
    components: operatorSheet.document.components.map((component) => ({
      ...component,
      properties: {
        ...component.properties,
        ...(component.id === "start" ? { pressed: false } : {}),
        ...(component.id === "stop" ? { pressed: true } : {}),
      },
    })),
  };
  const stoppedRuns = executeProjectCircuitModels(project, catalogById, operatorSheet.id, stoppedDocument);
  expect(stoppedRuns.find((run) => run.sheetId === "dol-page-motor" && run.componentId === "motor")?.output.value).toBe("STANDBY");
});
