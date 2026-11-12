import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { createWiredStarDeltaCircuit, createWiredStarDeltaTemplate } from "../src/projects/wiredStarDeltaCircuit";
import { advanceCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { evaluateWiredControl } from "../src/simulation/wiredControl";
import { verifyProjectTemplate } from "../src/projects/templateVerification";

const motor = (document: ReturnType<typeof createWiredStarDeltaCircuit>) => executeCircuitModels(document, catalogById).find(run => run.reference === "M1")!.output.value;

it("runs the wired star, open-transition, delta, overload and reset sequence", () => {
  const result = verifyProjectTemplate(createWiredStarDeltaTemplate(), catalogById);
  expect(validateCircuit(createWiredStarDeltaCircuit(), catalogById)).toEqual([]);
  expect(result).toMatchObject({ passed: true, topologyIssues: [], failedExpectations: [] });
});

it("requires the star contactor NC auxiliary path before delta can energize", () => {
  const document = createWiredStarDeltaCircuit();
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  runtime = advanceCircuitClock(runtime, catalogById, .1);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", false);
  runtime = advanceCircuitClock(runtime, catalogById, 5.1);
  runtime = advanceCircuitClock(runtime, catalogById, .2);
  expect(evaluateWiredControl(runtime, catalogById).get("delta")?.energized).toBe(true);
  runtime.wires = runtime.wires.filter(wire => !(wire.from.componentId === "star" && wire.from.terminalId === "aux-22" && wire.to.componentId === "delta" && wire.to.terminalId === "a1"));
  expect(evaluateWiredControl(runtime, catalogById).get("delta")?.energized).toBe(false);
  expect(motor(runtime)).toContain("OPEN");
});

it("uses the 200 ms transition timer to keep both branch contactors open", () => {
  const document = createWiredStarDeltaCircuit();
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  runtime = advanceCircuitClock(runtime, catalogById, .1);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", false);
  runtime = advanceCircuitClock(runtime, catalogById, 4.9);
  runtime = advanceCircuitClock(runtime, catalogById, .1);
  expect(evaluateWiredControl(runtime, catalogById).get("star")?.energized).toBe(false);
  expect(evaluateWiredControl(runtime, catalogById).get("delta")?.energized).toBe(false);
  expect(motor(runtime)).toContain("OPEN");
});

