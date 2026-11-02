import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { createReversingCircuit, applyReversingState } from "../src/projects/reversingCircuit";
import { initialReversingState, transitionReversing } from "../src/simulation/reversingStarter";
import { executeCircuitModels } from "../src/simulation/circuitModels";

it("executes the reversing power topology under its controller", () => {
  const document = createReversingCircuit();
  expect(validateCircuit(document, catalogById)).toEqual([]);
  let state = transitionReversing(initialReversingState(), "close-breaker");
  for (const direction of ["start-forward", "start-reverse"] as const) {
    state = transitionReversing(state, direction);
    const runtime = applyReversingState(document, state);
    const expected = direction === "start-forward" ? 1440 : -1440;
    expect(Number.parseFloat(executeCircuitModels(runtime, catalogById).find((run) => run.reference === "M1")!.output.value)).toBe(expected);
    state = transitionReversing(state, "stop");
  }
  expect(document.components.find((component) => component.id === "breaker")?.properties.closed).toBe(false);
});

it("interrupts a commanded motor through the wired overload NC contact", () => {
  const document = createReversingCircuit();
  const state = transitionReversing(transitionReversing(initialReversingState(), "close-breaker"), "start-forward");
  const runtime = applyReversingState(document, state);
  runtime.components.find((component) => component.id === "overload-control")!.properties.tripped = true;
  expect(runtime.components.find((component) => component.id === "breaker")!.properties.closed).toBe(true);
  const runs = executeCircuitModels(runtime, catalogById);
  expect(runs.find((run) => run.reference === "M1")!.output.value).toBe("STANDBY");
  expect(runs.find((run) => run.reference === "KM1")!.output.value).toBe("OPEN");
  expect(runs.find((run) => run.reference === "KM2")!.output.value).toBe("OPEN");
  expect(document.components.find((component) => component.id === "overload-control")!.properties.tripped).toBe(false);
});
