import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { terminalGridReference } from "../src/cad/terminalAnchors";
import { validateCircuit } from "../src/electrical/topology";
import { createFourSheetReversingWorkbook } from "../src/projects/fourSheetReversingWorkbook";
import { setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { createProjectRuntimeDocument, executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";
import { evaluateWiredControl } from "../src/simulation/wiredControl";

it("builds four complete reversing-starter sheets with real terminal references", () => {
  const project = createFourSheetReversingWorkbook();
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Supply", "Reversing power", "Control supply", "Direction stations"]);
  expect(project.continuations.length).toBeGreaterThan(5);
  const componentIds = project.sheets.flatMap((sheet) => sheet.document.components.map((component) => component.id));
  expect(new Set(componentIds).size).toBe(11);
  expect(componentIds.sort()).toEqual(["breaker", "contactor", "control", "control-psu", "motor", "overload", "reverse", "reverse-start", "start", "stop", "supply"].sort());
  const network = createProjectRuntimeDocument(project);
  expect(validateCircuit(network, catalogById)).toEqual([]);
  for (const continuation of project.continuations) {
    expect(continuation.label).not.toMatch(/^REV_|^reverse-/);
    for (const point of continuation.points) {
      const sheet = project.sheets.find((item) => item.id === point.sheetId)!;
      expect(terminalGridReference(sheet.document, point.endpoint)).toBe(point.gridReference);
      expect(point.gridReference).not.toBe("A1");
    }
  }
});

it("holds forward/reverse interlocks and swaps motor rotation through cross-sheet wiring", () => {
  const project = createFourSheetReversingWorkbook();
  let runtime = createProjectRuntimeDocument(project);
  const input = (id: string, property: string, value: boolean) => {
    runtime = setCircuitBooleanInput(runtime, catalogById, id, property, value);
  };
  const state = () => evaluateWiredControl(runtime, catalogById);
  const motor = () => executeProjectCircuitModels(project, catalogById, undefined, runtime)
    .find((run) => run.sheetId === "reverse-power" && run.reference === "M1")?.output.value;

  input("reverse-stations::start", "pressed", true);
  input("reverse-stations::start", "pressed", false);
  expect(state().get("reverse-power::contactor")?.energized).toBe(true);
  expect(state().get("reverse-power::reverse")?.energized).toBe(false);
  expect(motor()).toBe("1470 rpm / 7.5 kW");

  input("reverse-stations::reverse-start", "pressed", true);
  expect(state().get("reverse-power::contactor")?.energized).toBe(true);
  expect(state().get("reverse-power::reverse")?.energized).toBe(false);
  input("reverse-stations::reverse-start", "pressed", false);
  input("reverse-controls::stop", "pressed", true);
  input("reverse-controls::stop", "pressed", false);
  expect(state().get("reverse-power::contactor")?.energized).toBe(false);
  expect(motor()).toBe("STANDBY");

  input("reverse-stations::reverse-start", "pressed", true);
  input("reverse-stations::reverse-start", "pressed", false);
  expect(state().get("reverse-power::contactor")?.energized).toBe(false);
  expect(state().get("reverse-power::reverse")?.energized).toBe(true);
  expect(motor()).toBe("-1470 rpm / 7.5 kW");
});
