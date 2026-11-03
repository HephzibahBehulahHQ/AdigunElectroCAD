import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createWiredReversingCircuit } from "../src/projects/wiredReversingCircuit";
import { setCircuitBooleanInput, resetCircuitClock } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { evaluateWiredControl } from "../src/simulation/wiredControl";
import { validateCircuit } from "../src/electrical/topology";

it("holds either direction and blocks its opposite through the actual NC contacts", () => {
  let runtime = createWiredReversingCircuit();
  expect(validateCircuit(runtime, catalogById)).toEqual([]);
  const input = (id: string, property: string, value: boolean) => { runtime = setCircuitBooleanInput(runtime, catalogById, id, property, value); };
  const check = (forward: boolean, reverse: boolean, speed: string) => {
    const coils = evaluateWiredControl(runtime, catalogById);
    expect(coils.get("contactor")?.energized).toBe(forward);
    expect(coils.get("reverse")?.energized).toBe(reverse);
    expect(executeCircuitModels(runtime, catalogById).find(r => r.reference === "M1")?.output.value).toBe(speed);
  };
  input("start", "pressed", true); input("start", "pressed", false);
  check(true, false, "1440 rpm / 7.5 kW");
  input("reverse-start", "pressed", true);
  check(true, false, "1440 rpm / 7.5 kW");
  input("reverse-start", "pressed", false);
  input("stop", "pressed", true); input("stop", "pressed", false);
  check(false, false, "STANDBY");
  input("reverse-start", "pressed", true); input("reverse-start", "pressed", false);
  check(false, true, "-1440 rpm / 7.5 kW");
  input("start", "pressed", true);
  check(false, true, "-1440 rpm / 7.5 kW");
  input("start", "pressed", false);
  input("overload", "tripped", true); input("overload", "tripped", false);
  check(false, false, "STANDBY");
});

it("inhibits simultaneous opposing commands until the conflict is removed", () => {
  let runtime = createWiredReversingCircuit();
  for (const c of runtime.components) if (["start", "reverse-start"].includes(c.id)) c.properties.pressed = true;
  const coils = evaluateWiredControl(resetCircuitClock(runtime, catalogById), catalogById);
  expect([...coils.values()].every(c => !c.energized && c.error?.includes("did not settle"))).toBe(true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", false);
  expect(evaluateWiredControl(runtime, catalogById).get("reverse")?.energized).toBe(true);
});

it.each(["contactor", "reverse"])("cannot energize %s with a broken NC series wire", target => {
  let runtime = createWiredReversingCircuit();
  runtime.wires = runtime.wires.filter(w => !(w.to.componentId === target && w.to.terminalId === "a1"));
  runtime = setCircuitBooleanInput(runtime, catalogById, target === "contactor" ? "start" : "reverse-start", "pressed", true);
  expect(evaluateWiredControl(runtime, catalogById).get(target)?.energized).toBe(false);
});

it("verifies the recorded operating sequence and is independent of component order", async () => {
  const { createWiredReversingTemplate } = await import("../src/projects/wiredReversingCircuit");
  const { verifyProjectTemplate } = await import("../src/projects/templateVerification");
  const template = createWiredReversingTemplate();
  template.document.components.reverse();
  template.document.wires.reverse();
  const result = verifyProjectTemplate(template, catalogById);
  expect(result.topologyIssues).toEqual([]);
  expect(result.failedExpectations).toEqual([]);
});
