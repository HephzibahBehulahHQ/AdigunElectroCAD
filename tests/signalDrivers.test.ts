import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { canConnectTerminals, validateCircuit } from "../src/electrical/topology";
import { signalDriverConflicts } from "../src/electrical/signalDrivers";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createReversingCircuit } from "../src/projects/reversingCircuit";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import type { CircuitDocument, ComponentInstance, TerminalEndpoint } from "../src/types/electrical";

const component = (id: string, definitionId: string, x: number): ComponentInstance => ({ id, definitionId, reference: id.toUpperCase(), x, y: 200, rotation: 0, properties: {} });
const endpoint = (componentId: string, terminalId: string): TerminalEndpoint => ({ componentId, terminalId });
const wire = (id: string, from: TerminalEndpoint, to: TerminalEndpoint) => ({ id, from, to, points: [] });
function circuit(): CircuitDocument {
  return { id: "signal-drivers", name: "Signal drivers", description: "Independent Boolean signals", revision: 1, components: [component("s1", "logic.no-contact", 100), component("s2", "logic.no-contact", 260), component("k1", "logic.output-coil", 420), component("k2", "logic.output-coil", 580)], wires: [wire("w1", endpoint("s1", "out"), endpoint("k1", "in"))] };
}

it("rejects a second output feeding an already driven input", () => {
  const document = circuit();
  expect(canConnectTerminals(document, catalogById, endpoint("s2", "out"), endpoint("k1", "in"))).toMatchObject({ ok: false, reason: expect.stringContaining("S1.out, S2.out") });
  document.wires.push(wire("w2", endpoint("s2", "out"), endpoint("k1", "in")));
  expect(validateCircuit(document, catalogById)).toContainEqual(expect.objectContaining({ code: "conflicting-signal-drivers" }));
});

it("accepts one output driving multiple consumers", () => {
  const document = circuit();
  expect(canConnectTerminals(document, catalogById, endpoint("s1", "out"), endpoint("k2", "in"))).toEqual({ ok: true });
  document.wires.push(wire("w2", endpoint("s1", "out"), endpoint("k2", "in")));
  expect(validateCircuit(document, catalogById)).toEqual([]);
});

it("detects an indirect conflict through bidirectional control terminals", () => {
  const document = circuit();
  document.wires.push(wire("w2", endpoint("s2", "out"), endpoint("k2", "in")), wire("w3", endpoint("k1", "in"), endpoint("k1", "common")), wire("w4", endpoint("k2", "in"), endpoint("k2", "common")));
  expect(validateCircuit(document, catalogById)).toEqual([]);
  expect(canConnectTerminals(document, catalogById, endpoint("k1", "common"), endpoint("k2", "common"))).toMatchObject({ ok: false });
  document.wires.push(wire("bridge", endpoint("k1", "common"), endpoint("k2", "common")));
  expect(signalDriverConflicts(document, catalogById)).toHaveLength(1);
});

it("rejects multiple analog current outputs on one ADC input", () => {
  const document = createAnalogLevelProject().document;
  const level = document.components.find((item) => item.id === "level")!;
  document.components.push({ ...structuredClone(level), id: "level-2", reference: "B2", y: 460 });
  expect(canConnectTerminals(document, catalogById, endpoint("level-2", "signal"), endpoint("adc", "in"))).toMatchObject({ ok: false, reason: expect.stringContaining("Multiple simulated signal outputs") });
});

it("does not treat parallel power contactors as competing simulated signal drivers", () => {
  expect(validateCircuit(createReversingCircuit(), catalogById)).toEqual([]);
});

it("rejects imported multi-driver wiring instead of relying on wire iteration order", () => {
  const document = circuit();
  document.wires.push(wire("w2", endpoint("s2", "out"), endpoint("k1", "in")));
  const project = { id: "driver-import", name: "Conflicting drivers", description: "Invalid input net", revision: 1, sheets: [{ id: "sheet-1", name: "Control", kind: "free-schematic", document }] };
  expect(() => parseProjectJson(JSON.stringify(project))).toThrow("Multiple simulated signal outputs");
  document.wires.reverse();
  expect(() => parseProjectJson(JSON.stringify(project))).toThrow("Multiple simulated signal outputs");
});
