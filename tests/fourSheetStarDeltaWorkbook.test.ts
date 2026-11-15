import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { terminalGridReference } from "../src/cad/terminalAnchors";
import { validateCircuit } from "../src/electrical/topology";
import { createFourSheetStarDeltaWorkbook } from "../src/projects/fourSheetStarDeltaWorkbook";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { createProjectRuntimeDocument, executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";
import { evaluateWiredControl } from "../src/simulation/wiredControl";

it("splits the sourced star-delta starter into four complete, labeled sheets", () => {
  const project = createFourSheetStarDeltaWorkbook();
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Supply", "Motor power", "Control", "Operator station"]);
  expect(project.continuations.length).toBeGreaterThan(10);
  const componentSheets = new Map(project.sheets.flatMap((sheet) => sheet.document.components.map((component) => [component.id, sheet] as const)));
  expect(componentSheets.size).toBe(13);
  expect([...componentSheets.keys()].sort()).toEqual(["breaker", "control", "control-psu", "delta", "forward", "motor", "overload", "star", "star-point", "star-timer", "start", "stop", "supply", "transition-timer"].sort());

  const sourced = createProjectRuntimeDocument(project);
  expect(validateCircuit(sourced, catalogById)).toEqual([]);
  for (const continuation of project.continuations) {
    expect(continuation.label).not.toMatch(/^sd-control|^SD_/);
    for (const point of continuation.points) {
      const sheet = project.sheets.find((item) => item.id === point.sheetId)!;
      expect(terminalGridReference(sheet.document, point.endpoint)).toBe(point.gridReference);
      expect(sheet.document.components.some((component) => component.id === point.endpoint.componentId)).toBe(true);
    }
  }
});

it("runs the 5-second star, 200-millisecond transition, and delta phases across the four sheets", () => {
  const project = createFourSheetStarDeltaWorkbook();
  let runtime = resetCircuitClock(createProjectRuntimeDocument(project), catalogById);
  runtime = setCircuitBooleanInput(runtime, catalogById, "star-delta-supply::breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "star-delta-station::start", "pressed", true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  const wired = () => evaluateWiredControl(runtime, catalogById);
  expect(wired().get("star-delta-power::forward")?.energized).toBe(true);
  expect(wired().get("star-delta-power::star")?.energized).toBe(true);

  runtime = setCircuitBooleanInput(runtime, catalogById, "star-delta-station::start", "pressed", false);
  runtime = advanceCircuitClock(runtime, catalogById, 4.9);
  expect(wired().get("star-delta-power::star")?.energized).toBe(true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  expect(wired().get("star-delta-power::star")?.energized).toBe(false);
  expect(wired().get("star-delta-power::delta")?.energized).toBe(false);
  runtime = advanceCircuitClock(runtime, catalogById, 0.2);
  expect(wired().get("star-delta-power::delta")?.energized).toBe(true);
  expect(executeProjectCircuitModels(project, catalogById, undefined, runtime)
    .find((run) => run.sheetId === "star-delta-power" && run.reference === "M1")?.output.value).toContain("DELTA");
});
