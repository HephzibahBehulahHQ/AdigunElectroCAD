import { expect, it } from "vitest";
import { applyGenericTopologyTerminals, genericTopologyTerminalsForChange } from "../src/cad/componentTopology";
import { genericComponentProfiles } from "../src/catalog/dolCatalog";
import type { CircuitDocument } from "../src/types/electrical";

function documentWithWires(componentId: string, terminalIds: string[]): CircuitDocument {
  const components = [{ id: componentId, definitionId: "generic.iec.interface-relay", reference: "K1", x: 0, y: 0, rotation: 0 as const, properties: {} }];
  const wires = terminalIds.map((terminalId, index) => ({
    id: `w${index}`,
    from: { componentId, terminalId },
    to: { componentId: `other-${index}`, terminalId: "t1" },
    points: [],
  }));
  return { id: "test", name: "Test", description: "", components, wires, revision: 1 };
}

it("offers only the terminal topologies supported by generic profiles", () => {
  expect(genericTopologyChoices("generic.iec.circuit-breaker", "poles")).toEqual([3, 4]);
  expect(genericTopologyChoices("generic.iec.interface-relay", "changeoverContacts")).toEqual([1, 2, 3]);
  expect(genericTopologyChoices("generic.iec.selector-switch", "contactForm")).toEqual(["NO", "NC"]);
  expect(genericTopologyChoices("generic.iec.plc-digital-io", "channelCount")).toEqual([4]);
});

it("maps generic relay contact-count edits to matching connectable terminal sets", () => {
  const relay = genericComponentProfiles.find(({ id }) => id === "generic.iec.interface-relay")!;
  const threePole = genericTopologyTerminalsForChange(relay.id, "changeoverContacts", 3);
  expect(threePole?.map(({ id }) => id)).toEqual(["a1", "a2", "11", "12", "14", "21", "22", "24", "31", "32", "34"]);

  const onePole = genericTopologyTerminalsForChange(relay.id, "changeoverContacts", 1)!;
  const doc = documentWithWires("k1", ["a1", "11", "31"]);
  const applied = applyGenericTopologyTerminals(doc, "k1", relay.terminals, onePole);
  expect(applied.document.components[0].customTerminals?.map(({ id }) => id)).toEqual(["a1", "a2", "11", "12", "14"]);
  expect(applied.document.wires.map(({ from }) => from.terminalId)).toEqual(["a1", "11"]);
  expect(applied.removedWireCount).toBe(1);
});

it("maps breaker pole edits and selector NO/NC edits to the available terminal labels", () => {
  expect(genericTopologyTerminalsForChange("generic.iec.circuit-breaker", "poles", 4)?.map(({ id }) => id)).toEqual([
    "l1-in", "l2-in", "l3-in", "l1-out", "l2-out", "l3-out", "n-in", "n-out",
  ]);
  expect(genericTopologyTerminalsForChange("generic.iec.selector-switch", "contactForm", "NC")?.map(({ id }) => id)).toEqual(["21", "22"]);
  expect(genericTopologyTerminalsForChange("generic.iec.selector-switch", "contactForm", "NO")?.map(({ id }) => id)).toEqual(["13", "14"]);
});

it("rejects a generic PLC channel count that has no matching terminal set", () => {
  expect(genericTopologyTerminalsForChange("generic.iec.plc-digital-io", "channelCount", 4)).toHaveLength(5);
  expect(genericTopologyTerminalsForChange("generic.iec.plc-digital-io", "channelCount", 8)).toBeNull();
  expect(genericTopologyTerminalsForChange("generic.iec.circuit-breaker", "ratedCurrentA", 20)).toBeUndefined();
});
