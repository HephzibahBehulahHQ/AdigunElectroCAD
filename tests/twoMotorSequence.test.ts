import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { createTwoMotorSequence } from "../src/projects/twoMotorSequence";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";

it("starts two real three-phase branches in order and stops both", () => {
  const design = createTwoMotorSequence(), snapshot = JSON.stringify(design);
  expect(validateCircuit(design, catalogById)).toEqual([]);
  let runtime = resetCircuitClock(design, catalogById);
  const motors = () => executeCircuitModels(runtime, catalogById).filter(r => ["m1", "m2"].includes(r.componentId)).map(r => r.output.value);
  const input = (id: string, property: string, value: boolean) => { runtime = setCircuitBooleanInput(runtime, catalogById, id, property, value); };
  const tick = (seconds: number) => { runtime = advanceCircuitClock(runtime, catalogById, seconds); };
  expect(motors()).toEqual(["STANDBY", "STANDBY"]);
  input("start", "input", true); tick(.1);
  expect(motors()[0]).toContain("1440 rpm"); expect(motors()[1]).toBe("STANDBY");
  input("start", "input", false); tick(2.9);
  expect(motors()[1]).toBe("STANDBY");
  tick(.1); expect(motors().every(v => v.includes("1440 rpm"))).toBe(true);
  input("stop", "input", true); tick(.1);
  expect(motors()).toEqual(["STANDBY", "STANDBY"]);
  input("stop", "input", false); tick(5);
  expect(motors()).toEqual(["STANDBY", "STANDBY"]);
  expect(JSON.stringify(design)).toBe(snapshot);
});

it.each([["breaker", "closed", false], ["f1", "tripped", true], ["f2", "tripped", true]] as const)("requires a fresh START after %s restoration", (device, property, fault) => {
  let runtime = resetCircuitClock(createTwoMotorSequence(), catalogById);
  const input = (id: string, key: string, value: boolean) => { runtime = setCircuitBooleanInput(runtime, catalogById, id, key, value); };
  const tick = (seconds: number) => { runtime = advanceCircuitClock(runtime, catalogById, seconds); };
  const motors = () => executeCircuitModels(runtime, catalogById).filter(r => ["m1", "m2"].includes(r.componentId)).map(r => r.output.value);
  input("start", "input", true); tick(.1); tick(3.1);
  expect(motors().every(v => v.includes("1440 rpm"))).toBe(true);
  input(device, property, fault); tick(.1);
  expect(motors()).toEqual(["STANDBY", "STANDBY"]);
  input(device, property, !fault); tick(5);
  expect(motors()).toEqual(["STANDBY", "STANDBY"]);
  input("start", "input", false); tick(.1);
  input("start", "input", true); tick(.1);
  expect(motors()[0]).toContain("1440 rpm"); expect(motors()[1]).toBe("STANDBY");
});

it("does not run M2 with a missing power phase despite its control command", () => {
  const design = createTwoMotorSequence();
  design.wires = design.wires.filter(w => !(w.to.componentId === "m2" && w.to.terminalId === "w1"));
  let runtime = setCircuitBooleanInput(resetCircuitClock(design, catalogById), catalogById, "start", "input", true);
  runtime = advanceCircuitClock(advanceCircuitClock(runtime, catalogById, .1), catalogById, 4);
  const runs = executeCircuitModels(runtime, catalogById);
  expect(runs.find(r => r.componentId === "m1")!.output.value).toContain("1440 rpm");
  expect(runs.find(r => r.componentId === "m2")!.output.value).toBe("STANDBY");
});
