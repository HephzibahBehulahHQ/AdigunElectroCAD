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
    expect(executeCircuitModels(runtime, catalogById).find((run) => run.reference === "M1")?.output.value).toContain("1440 rpm");
    state = transitionReversing(state, "stop");
  }
  expect(document.components.find((component) => component.id === "breaker")?.properties.closed).toBe(false);
});
