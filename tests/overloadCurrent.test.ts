import { expect, it } from "vitest";
import { traceOverloadCurrents } from "../src/simulation/overloadCurrent";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { createWiredReversingCircuit } from "../src/projects/wiredReversingCircuit";
import { catalogById } from "../src/catalog/dolCatalog";

const relay = [{ id: "F1", poles: [{ input: "in", output: "out" }] }];
const load = (reference: string, terminal: string, currentA: number) => ({ reference, currentA, feeds: [{ source: "source", terminal }] });

it("rejects a converter before or after the relay on the actual load path", () => {
  for (const graph of [new Map([["source", ["drive"]], ["drive", ["in"]], ["in", ["out"]], ["out", ["motor"]]]), new Map([["source", ["in"]], ["in", ["out"]], ["out", ["drive"]], ["drive", ["motor"]]])]) {
    expect(traceOverloadCurrents(graph, relay, [load("M1", "motor", 10)], ["drive"]).get("F1")?.error).toContain("Unsupported power conversion");
  }
});

it("sums distinct downstream loads through a shared relay pole", () => {
  const graph = new Map([["source", ["in"]], ["in", ["out"]], ["out", ["m1", "m2"]]]);
  expect(traceOverloadCurrents(graph, relay, [load("M1", "m1", 10), load("M2", "m2", 4)]).get("F1")).toEqual({ phaseCurrentsA: [14], currentA: 14 });
});

it("does not assign current to an unpowered or dead-end relay branch", () => {
  const graph = new Map([["source", ["in", "motor"]], ["in", ["out"]]]);
  expect(traceOverloadCurrents(graph, relay, [load("M1", "motor", 10)]).get("F1")?.currentA).toBe(0);
  graph.set("source", []);
  graph.set("out", ["motor"]);
  expect(traceOverloadCurrents(graph, relay, [load("M1", "motor", 10)]).get("F1")?.currentA).toBe(0);
});

it("rejects parallel branches and a direct wire bypass rather than guessing a split", () => {
  for (const paths of [["out", "out"], ["parallel", "out"]]) {
    const graph = new Map([["source", ["in"]], ["in", paths], ["parallel", ["motor"]], ["out", ["motor"]]]);
    const result = traceOverloadCurrents(graph, relay, [load("M1", "motor", 10)]).get("F1")!;
    expect(result.error).toContain("current division is not modeled");
    expect(result.phaseCurrentsA).toEqual([]);
  }
});

it("reports invalid connected current without returning a misleading partial total", () => {
  const graph = new Map([["source", ["in"]], ["in", ["out"]], ["out", ["motor"]]]);
  for (const current of [NaN, Infinity, -1]) expect(traceOverloadCurrents(graph, relay, [load("M1", "motor", current)]).get("F1")?.error).toContain("Invalid nominal load current");
});

it("derives the same three pole currents from forward and reversed wired feeds", () => {
  for (const command of ["start", "reverse-start"]) {
    let circuit = createWiredReversingCircuit();
    const saved = JSON.stringify(circuit);
    expect(executeCircuitModels(circuit, catalogById).find(r => r.reference === "F1")?.evaluatedProperties.runtimeLoadCurrentA).toBe(0);
    circuit = setCircuitBooleanInput(circuit, catalogById, command, "pressed", true);
    circuit = setCircuitBooleanInput(circuit, catalogById, command, "pressed", false);
    const properties = executeCircuitModels(circuit, catalogById).find(r => r.reference === "F1")!.evaluatedProperties;
    expect(properties.runtimeCurrentError).toBe("");
    expect([properties.runtimePhase1CurrentA, properties.runtimePhase2CurrentA, properties.runtimePhase3CurrentA]).toEqual([14.1, 14.1, 14.1]);
    expect(properties.runtimeLoadCurrentA).toBe(14.1);
    circuit = setCircuitBooleanInput(circuit, catalogById, "breaker", "closed", false);
    expect(executeCircuitModels(circuit, catalogById).find(r => r.reference === "F1")?.evaluatedProperties.runtimeLoadCurrentA).toBe(0);
    expect(JSON.stringify(createWiredReversingCircuit())).toBe(saved);
  }
});

it("detects a physical relay bypass and zeroes current after losing a motor phase", () => {
  let circuit = setCircuitBooleanInput(createWiredReversingCircuit(), catalogById, "start", "pressed", true);
  circuit.wires.push({ id: "bypass", from: { componentId: "overload", terminalId: "l1-in" }, to: { componentId: "overload", terminalId: "t1" }, points: [] });
  const bypass = executeCircuitModels(circuit, catalogById).find(r => r.reference === "F1")!;
  expect(bypass.evaluatedProperties.runtimeCurrentError).toContain("bypassed power path");
  circuit.wires = circuit.wires.filter(w => w.to.componentId !== "motor" || w.to.terminalId !== "u1");
  expect(executeCircuitModels(circuit, catalogById).find(r => r.reference === "M1")?.output.value).toBe("STANDBY");
  expect(executeCircuitModels(circuit, catalogById).find(r => r.reference === "F1")?.evaluatedProperties.runtimeLoadCurrentA).toBe(0);
});
