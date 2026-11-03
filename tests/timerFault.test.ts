import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createTwoMotorSequence } from "../src/projects/twoMotorSequence";
import { advanceCircuitClock } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { evaluateFunctionalModel, evaluateFunctionalSignal } from "../src/simulation/functionalModels";

it.each([-1, NaN, Infinity, "3", false])("rejects invalid timer value %s in both display and signal", (value) => {
  for (const key of ["delaySeconds", "elapsedSeconds"]) {
    const properties = { energized: true, delaySeconds: 3, elapsedSeconds: 4, [key]: value };
    expect(evaluateFunctionalModel("catalog-on-delay-timer", properties)?.value).toContain("ERROR:");
    expect(evaluateFunctionalSignal("catalog-on-delay-timer", properties)).toMatchObject({ value: false, error: expect.any(String) });
  }
});

it("inhibits the second motor on an invalid timer and recovers after correction", () => {
  const design = createTwoMotorSequence();
  design.components.find(c => c.id === "start")!.properties.input = true;
  design.components.find(c => c.id === "timer")!.properties.delaySeconds = -1;
  const snapshot = JSON.stringify(design);
  let runtime = advanceCircuitClock(design, catalogById, .1);
  runtime = advanceCircuitClock(runtime, catalogById, 4);
  let runs = executeCircuitModels(runtime, catalogById);
  expect(runs.find(r => r.componentId === "timer")!.output.value).toContain("ERROR:");
  expect(runs.find(r => r.componentId === "m2")!.evaluatedProperties.energized).toBe(false);
  expect(runtime.components.find(c => c.id === "timer")!.properties.elapsedSeconds).toBe(0);
  runtime = { ...runtime, components: runtime.components.map(c => c.id === "timer" ? { ...c, properties: { ...c.properties, delaySeconds: 3 } } : c) };
  runtime = advanceCircuitClock(runtime, catalogById, 3);
  runs = executeCircuitModels(runtime, catalogById);
  expect(runs.find(r => r.componentId === "m2")!.output.value).toContain("1440 rpm");
  expect(JSON.stringify(design)).toBe(snapshot);
});
