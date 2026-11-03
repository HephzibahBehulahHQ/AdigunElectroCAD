import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createWiredHoldingTemplate } from "../src/projects/wiredHoldingCircuit";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import type { CircuitDocument } from "../src/types/electrical";
import { createThermalOverloadTemplate } from "../src/projects/thermalOverloadCircuit";
import { verifyProjectTemplate } from "../src/projects/templateVerification";

const relay = (d: CircuitDocument) => d.components.find(c => c.id === "overload")!.properties;
const motor = (d: CircuitDocument) => executeCircuitModels(d, catalogById).find(r => r.reference === "M1")!.output.value;
const input = (d: CircuitDocument, id: string, property: string, value: boolean) => setCircuitBooleanInput(d, catalogById, id, property, value);
function running() {
  let d = createWiredHoldingTemplate().document;
  Object.assign(relay(d), { thermalEnabled: true, settingA: 7.05, overloadFactor: 1, heatingTimeSeconds: 10, coolingTimeSeconds: 20 });
  d = input(d, "start", "pressed", true);
  return input(d, "start", "pressed", false);
}
const coldTrip = 10 * Math.log(4 / 3);

it("runs the dedicated cold/hot overload sequence", () => {
  const result = verifyProjectTemplate(createThermalOverloadTemplate(), catalogById);
  expect(result.failedExpectations).toEqual([]);
  expect(result.passed).toBe(true);
});

it("opens the wired control path at the thermal event and cools for the remaining interval", () => {
  const d = running(), saved = JSON.stringify(d);
  const result = advanceCircuitClock(d, catalogById, coldTrip + 20);
  expect(relay(result).runtimeThermalTripped).toBe(true);
  expect(relay(result).runtimeThermalLevel).toBeCloseTo(Math.exp(-1), 12);
  expect(motor(result)).toBe("STANDBY");
  expect(JSON.stringify(d)).toBe(saved);
  expect(relay(resetCircuitClock(result, catalogById)).runtimeThermalLevel).toBeUndefined();
});

it("agrees across coarse and fine time steps including the trip and cooling interval", () => {
  const one = advanceCircuitClock(running(), catalogById, 10);
  let many = running();
  for (let i = 0; i < 100; i++) many = advanceCircuitClock(many, catalogById, .1);
  expect(relay(many).runtimeThermalLevel).toBeCloseTo(Number(relay(one).runtimeThermalLevel), 11);
  expect(relay(many).runtimeThermalTripped).toBe(true);
  expect(motor(many)).toBe("STANDBY");
});

it("rejects hot reset, requires a new cool reset and retains heat without restarting", () => {
  let d = advanceCircuitClock(running(), catalogById, coldTrip + .01);
  d = input(d, "overload", "reset", true);
  d = advanceCircuitClock(d, catalogById, 20);
  expect(relay(d).runtimeThermalTripped).toBe(true);
  d = input(d, "overload", "reset", false);
  const heat = relay(d).runtimeThermalLevel;
  d = input(d, "overload", "reset", true);
  expect(relay(d).runtimeThermalTripped).toBe(false);
  expect(relay(d).runtimeThermalLevel).toBe(heat);
  expect(motor(d)).toBe("STANDBY");
  d = input(d, "start", "pressed", true);
  expect(motor(d)).toContain("1440 rpm");
  d = advanceCircuitClock(d, catalogById, coldTrip - .1);
  expect(relay(d).runtimeThermalTripped).toBe(true);
});

it("keeps heating after a trip if 95–96 is bypassed, rather than opening power poles magically", () => {
  const d = running();
  d.wires.push({ id: "control-bypass", from: { componentId: "overload", terminalId: "aux-95" }, to: { componentId: "overload", terminalId: "aux-96" }, points: [] });
  const result = advanceCircuitClock(d, catalogById, 10);
  expect(relay(result).runtimeThermalTripped).toBe(true);
  expect(relay(result).runtimeThermalLevel).toBeCloseTo(4 * (1 - Math.exp(-1)), 12);
  expect(motor(result)).toContain("1440 rpm");
});

it("inhibits an invalid current path and reports a fault without corrupting retained heat", () => {
  const d = running();
  d.wires.push({ id: "power-bypass", from: { componentId: "overload", terminalId: "l1-in" }, to: { componentId: "overload", terminalId: "t1" }, points: [] });
  const result = advanceCircuitClock(d, catalogById, 2);
  expect(relay(result).runtimeThermalTripped).toBe(true);
  expect(relay(result).runtimeThermalError).toContain("current division");
  expect(relay(result).runtimeThermalLevel).toBe(0);
  expect(motor(result)).toBe("STANDBY");
});

it("continues cooling after a current fault so a repaired circuit can be reset", () => {
  let d = advanceCircuitClock(running(), catalogById, 2);
  expect(Number(relay(d).runtimeThermalLevel)).toBeGreaterThan(.5);
  d.wires.push({ id: "power-bypass", from: { componentId: "overload", terminalId: "l1-in" }, to: { componentId: "overload", terminalId: "t1" }, points: [] });
  d = advanceCircuitClock(d, catalogById, 20);
  expect(Number(relay(d).runtimeThermalLevel)).toBeLessThan(.5);
  expect(relay(d).runtimeThermalTripped).toBe(true);
  d.wires = d.wires.filter(w => w.id !== "power-bypass");
  d = input(d, "overload", "reset", true);
  expect(relay(d).runtimeThermalTripped).toBe(false);
  expect(relay(d).runtimeThermalError).toBe("");
  expect(motor(d)).toBe("STANDBY");
});

it.each([0, NaN, -1])("rejects invalid thermal settings %s and inhibits the wired coil", value => {
  const d = running();
  relay(d).heatingTimeSeconds = value;
  const result = advanceCircuitClock(d, catalogById, 1);
  expect(relay(result).runtimeThermalTripped).toBe(true);
  expect(String(relay(result).runtimeThermalError).length).toBeGreaterThan(0);
  expect(motor(result)).toBe("STANDBY");
});
