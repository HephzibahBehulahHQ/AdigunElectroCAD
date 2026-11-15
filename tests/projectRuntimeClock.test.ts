import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { templateFixtures } from "../src/projects/templateLibrary";
import { createProjectRuntimeDocument, executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import type { CircuitDocument, ElectricalProject, ProjectContinuation } from "../src/types/electrical";

function splitTimerAcrossSheets(): ElectricalProject {
  const design = structuredClone(templateFixtures[3].document);
  const timer = design.components[0];
  timer.properties = { energized: true, delaySeconds: 1, elapsedSeconds: 0 };
  design.components[2].properties.returnSpring = true;
  design.components.push({ id: "timer-enable", definitionId: "logic.no-contact", reference: "S2", x: 100, y: 600, rotation: 0, properties: { input: false } });
  design.wires.push({ id: "timer-enable-wire", from: { componentId: "timer-enable", terminalId: "out" }, to: { componentId: timer.id, terminalId: "a1" }, points: [], netName: "ENABLE" });

  const sheetFor = (componentId: string) => componentId === timer.id ? "sheet-2" : "sheet-1";
  const firstWires: CircuitDocument["wires"] = [];
  const secondWires: CircuitDocument["wires"] = [];
  const continuations: ProjectContinuation[] = [];
  for (const wire of design.wires) {
    const fromSheet = sheetFor(wire.from.componentId);
    const toSheet = sheetFor(wire.to.componentId);
    if (fromSheet === toSheet) {
      (fromSheet === "sheet-1" ? firstWires : secondWires).push(wire);
      continue;
    }
    continuations.push({
      id: `continue-${wire.id}`,
      label: wire.netName ?? wire.id,
      conductorColor: wire.draftingColor ?? "#c62828",
      points: [
        { sheetId: fromSheet, gridReference: "1.1", role: "source", endpoint: wire.from },
        { sheetId: toSheet, gridReference: "1.1", role: "destination", endpoint: wire.to },
      ],
    });
  }

  const firstComponents = design.components.filter((component) => component.id !== timer.id);
  const firstDocument: CircuitDocument = { ...design, id: "sheet-1-doc", components: firstComponents, wires: firstWires };
  const timerDocument: CircuitDocument = { ...design, id: "sheet-2-doc", components: [timer], wires: secondWires };
  return {
    id: "timed-cross-sheet-project",
    name: "Timed cross-sheet circuit",
    description: "A timed relay and actuator split between two sheets.",
    sheets: [
      { id: "sheet-1", name: "Control", kind: "free-schematic", document: firstDocument },
      { id: "sheet-2", name: "Timer", kind: "free-schematic", document: timerDocument },
    ],
    continuations,
    revision: 1,
  };
}

it("advances a timer and its connected actuator across sheet continuations", () => {
  const project = splitTimerAcrossSheets();
  let runtime = resetCircuitClock(createProjectRuntimeDocument(project), catalogById);
  runtime = advanceCircuitClock(runtime, catalogById, 2);
  expect(runtime.components.find((component) => component.id === "sheet-2::" + project.sheets[1].document.components[0].id)?.properties.elapsedSeconds).toBe(0);

  runtime = setCircuitBooleanInput(runtime, catalogById, "sheet-1::timer-enable", "input", true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.5);
  const timer = runtime.components.find((component) => component.id.startsWith("sheet-2::"))!;
  expect(timer.properties.elapsedSeconds).toBe(0.5);
  runtime = advanceCircuitClock(runtime, catalogById, 0.5);

  const actuator = executeProjectCircuitModels(project, catalogById, undefined, runtime)
    .find((run) => run.sheetId === "sheet-1" && run.reference === "Y1");
  expect(actuator?.output.value).toContain("EXTENDED");
});
