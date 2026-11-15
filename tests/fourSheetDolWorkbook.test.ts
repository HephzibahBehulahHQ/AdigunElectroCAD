import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { resolveProjectNet, validateProjectContinuations } from "../src/projects/projectContinuations";
import { createFourSheetDolWorkbook } from "../src/projects/fourSheetDolWorkbook";
import { executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";

it("builds a four-sheet sourced DOL starter with every wire retained locally or as a labeled continuation", () => {
  const project = createFourSheetDolWorkbook();
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Supply & breaker", "Motor power", "Control supply", "Operator station"]);
  expect(project.continuations).toHaveLength(9);
  expect(validateProjectContinuations(project)).toEqual([]);
  expect(project.sheets.flatMap((sheet) => sheet.document.components).map((component) => component.id).sort()).toEqual(["breaker", "contactor", "control", "control-psu", "motor", "overload", "start", "stop", "supply"]);
  expect(project.sheets.flatMap((sheet) => sheet.document.wires)).toHaveLength(13);
  expect(project.sheets.flatMap((sheet) => sheet.document.components).some((component) => component.definitionId.startsWith("generic."))).toBe(false);
  expect(project.continuations?.map((item) => item.label)).toEqual(["L1", "L2", "L3", "PE", "24V+", "STOP_OK", "OL_OK", "COIL_START", "0V"]);

  const feederNet = resolveProjectNet(project, { sheetId: "dol-page-supply", endpoint: { componentId: "breaker", terminalId: "l1-out" } });
  expect(feederNet).toContainEqual({ sheetId: "dol-page-motor", endpoint: { componentId: "contactor", terminalId: "l1-in" } });
  const motorNet = resolveProjectNet(project, { sheetId: "dol-page-motor", endpoint: { componentId: "overload", terminalId: "t1" } });
  expect(motorNet).toContainEqual({ sheetId: "dol-page-motor", endpoint: { componentId: "motor", terminalId: "u1" } });
});

it("runs the source-backed motor from the remote operator sheet through cross-sheet control wires", () => {
  const project = createFourSheetDolWorkbook();
  const operatorSheet = project.sheets.find((sheet) => sheet.id === "dol-page-station")!;
  const pressedDocument = {
    ...operatorSheet.document,
    components: operatorSheet.document.components.map((component) => component.id === "start"
      ? { ...component, properties: { ...component.properties, pressed: true } }
      : component),
  };
  const runs = executeProjectCircuitModels(project, catalogById, operatorSheet.id, pressedDocument);
  expect(runs.find((run) => run.sheetId === "dol-page-motor" && run.componentId === "motor")?.output.value).toBe("1470 rpm / 7.5 kW");
});
