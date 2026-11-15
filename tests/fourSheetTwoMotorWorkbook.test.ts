import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { terminalGridReference } from "../src/cad/terminalAnchors";
import { validateCircuit } from "../src/electrical/topology";
import { validateProjectContinuations } from "../src/projects/projectContinuations";
import { createFourSheetTwoMotorWorkbook } from "../src/projects/fourSheetTwoMotorWorkbook";
import { advanceCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { createProjectRuntimeDocument, executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";

it("splits the two-motor sequence into four valid sheets with real terminal references", () => {
  const project = createFourSheetTwoMotorWorkbook();
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Supply", "Motor feeders", "Operator", "Sequence logic"]);
  expect(project.sheets.reduce((count, sheet) => count + sheet.document.components.length, 0)).toBe(18);
  expect(new Set(project.sheets.flatMap((sheet) => sheet.document.components.map((component) => component.id))).size).toBe(18);
  expect(validateProjectContinuations(project)).toEqual([]);
  expect(validateCircuit(createProjectRuntimeDocument(project), catalogById)).toEqual([]);
  for (const continuation of project.continuations) for (const point of continuation.points) {
    const sheet = project.sheets.find((item) => item.id === point.sheetId)!;
    expect(terminalGridReference(sheet.document, point.endpoint)).toBe(point.gridReference);
  }
});

it("starts and stops both motors through the cross-sheet control and timer nets", () => {
  const project = createFourSheetTwoMotorWorkbook();
  let runtime = createProjectRuntimeDocument(project);
  const input = (id: string, property: string, value: boolean) => {
    runtime = setCircuitBooleanInput(runtime, catalogById, id, property, value);
  };
  const tick = (seconds: number) => { runtime = advanceCircuitClock(runtime, catalogById, seconds); };
  const motor = (reference: string) => executeProjectCircuitModels(project, catalogById, undefined, runtime)
    .find((run) => run.sheetId === "two-motor-power" && run.reference === reference)!.output.value;
  expect(motor("M1")).toBe("STANDBY");
  expect(motor("M2")).toBe("STANDBY");
  input("two-motor-operator::start", "input", true);
  tick(0.1);
  expect(motor("M1")).toContain("1470 rpm");
  expect(motor("M2")).toBe("STANDBY");
  input("two-motor-operator::start", "input", false);
  tick(2.9);
  expect(motor("M2")).toBe("STANDBY");
  tick(0.1);
  expect(motor("M2")).toContain("1470 rpm");
  input("two-motor-operator::stop", "input", true);
  tick(0.1);
  expect(motor("M1")).toBe("STANDBY");
  expect(motor("M2")).toBe("STANDBY");
});
