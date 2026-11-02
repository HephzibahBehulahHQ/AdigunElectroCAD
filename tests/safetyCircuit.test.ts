import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import type { CircuitDocument } from "../src/types/electrical";

it.each(["iec.safety-relay.01", "safety.dual-relay"])("runs wired reset and channel interruption for %s", (definitionId) => {
  const catalogModel = definitionId.startsWith("iec.");
  const design: CircuitDocument = {
    id: "safety-test", name: "Wired safety reset", description: "Educational Boolean reset model", revision: 1,
    components: [
      { id: "channel", definitionId: "logic.no-contact", reference: "S1", x: 100, y: 100, rotation: 0, properties: { input: true } },
      { id: "reset", definitionId: "logic.no-contact", reference: "S2", x: 100, y: 300, rotation: 0, properties: { input: true } },
      { id: "relay", definitionId, reference: "SR1", x: 300, y: 100, rotation: 0, properties: { channelAClosed: true, channelBClosed: true, reset: false } },
      { id: "output", definitionId: "logic.output-coil", reference: "K1", x: 500, y: 100, rotation: 0, properties: { input: false } },
    ],
    wires: [
      { id: "w1", from: { componentId: "channel", terminalId: "out" }, to: { componentId: "relay", terminalId: catalogModel ? "s11" : "in-a" }, points: [] },
      { id: "w2", from: { componentId: "reset", terminalId: "out" }, to: { componentId: "relay", terminalId: "reset" }, points: [] },
      { id: "w3", from: { componentId: "relay", terminalId: catalogModel ? "14" : "out" }, to: { componentId: "output", terminalId: "in" }, points: [] },
    ],
  };
  let runtime = advanceCircuitClock(design, catalogById, 0.1);
  const output = () => executeCircuitModels(runtime, catalogById).find((run) => run.reference === "K1")!.output.value;
  const operate = (id: string, property: string, value: boolean) => {
    runtime = setCircuitBooleanInput(runtime, catalogById, id, property, value);
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  };
  expect(output()).toBe("OFF");
  operate("reset", "input", false);
  operate("reset", "input", true);
  expect(output()).toBe("ON");
  operate("reset", "input", false);
  expect(output()).toBe("ON");
  runtime = setCircuitBooleanInput(runtime, catalogById, "channel", "input", false);
  expect(output()).toBe("OFF");
  runtime = setCircuitBooleanInput(runtime, catalogById, "channel", "input", true);
  expect(output()).toBe("OFF");
  operate("reset", "input", false);
  operate("reset", "input", true);
  expect(output()).toBe("ON");
  operate("channel", "input", false);
  expect(output()).toBe("OFF");
  operate("reset", "input", true);
  operate("channel", "input", true);
  expect(output()).toBe("OFF");
  operate("reset", "input", false);
  operate("reset", "input", true);
  expect(output()).toBe("ON");
  operate("relay", "channelBClosed", false);
  expect(output()).toBe("OFF");
  operate("relay", "channelBClosed", true);
  expect(output()).toBe("OFF");
  runtime = resetCircuitClock(runtime, catalogById);
  expect(output()).toBe("OFF");
  expect(design.components[2].properties.runtimeSafetyArmed).toBeUndefined();
});
