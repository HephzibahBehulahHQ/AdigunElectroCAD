import { expect, it } from "vitest";
import { pt100ResistanceOhm } from "../src/simulation/controlLogic";
import { evaluateFunctionalModel, evaluateFunctionalSignal } from "../src/simulation/functionalModels";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import type { CircuitDocument } from "../src/types/electrical";

// Independently published rounded reference values from SAB Bröckskes' Pt100 table.
it.each([[-200, 18.52], [-100, 60.26], [0, 100], [100, 138.51], [200, 175.86], [400, 247.09], [500, 280.98], [850, 390.48]])("matches the nominal resistance table at %s °C", (temperature, resistance) => {
  expect(Math.abs(pt100ResistanceOhm(temperature) - resistance)).toBeLessThanOrEqual(.0051);
});

it("preserves a monotonic resistance curve across its supported temperature range", () => {
  let previous = pt100ResistanceOhm(-200);
  for (let temperature = -190; temperature <= 850; temperature += 10) {
    const current = pt100ResistanceOhm(temperature);
    expect(current).toBeGreaterThan(previous);
    previous = current;
  }
  expect(pt100ResistanceOhm(0)).toBe(100);
});

it.each([-200.001, 850.001, NaN, Infinity, -Infinity])("rejects unsupported temperature %s", (temperature) => {
  expect(() => pt100ResistanceOhm(temperature)).toThrow(RangeError);
});

it.each([true, "100", NaN, Infinity, 900])("reports malformed/out-of-range placed sensor input %s", (temperatureC) => {
  expect(evaluateFunctionalModel("sensor-pt100", { temperatureC })?.value).toContain("ERROR:");
  expect(evaluateFunctionalSignal("sensor-pt100", { temperatureC })).toMatchObject({ value: false, error: expect.stringContaining("PT100") });
});

it("drives wired resistance comparison, suppresses invalid input and recovers without mutating the design", () => {
  const document: CircuitDocument = {
    id: "pt100-control", name: "PT100 resistance threshold", description: "Nominal resistance feeding an ohm threshold", revision: 1,
    components: [
      { id: "sensor", definitionId: "sensor.pt100", reference: "B1", x: 100, y: 100, rotation: 0, properties: { temperatureC: 500 } },
      { id: "compare", definitionId: "logic.comparator-greater-than", reference: "G1", x: 300, y: 100, rotation: 0, properties: { left: 500, right: 285 } },
      { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 500, y: 100, rotation: 0, properties: { input: true } },
    ],
    wires: [
      { id: "w1", from: { componentId: "sensor", terminalId: "signal" }, to: { componentId: "compare", terminalId: "in-a" }, points: [] },
      { id: "w2", from: { componentId: "compare", terminalId: "out" }, to: { componentId: "coil", terminalId: "in" }, points: [] },
    ],
  };
  expect(validateCircuit(document, catalogById)).toEqual([]);
  const evaluate = () => executeCircuitModels(document, catalogById);
  // 280.98 ohm is below the threshold; the former linear model gave 292.5 ohm.
  expect(evaluate().find((run) => run.componentId === "coil")!.output.value).toBe("OFF");
  document.components[0].properties.temperatureC = 850;
  expect(evaluate().find((run) => run.componentId === "coil")!.output.value).toBe("ON");
  document.components[0].properties.temperatureC = -201;
  const failed = evaluate();
  expect(failed.every((run) => run.output.value.includes("ERROR:"))).toBe(true);
  const coil = failed.find((run) => run.componentId === "coil")!;
  expect(evaluateFunctionalSignal(coil.modelId, coil.evaluatedProperties)).toMatchObject({ value: false, error: expect.stringContaining("PT100") });
  document.components[0].properties.temperatureC = 0;
  expect(evaluate().find((run) => run.componentId === "coil")!.output.value).toBe("OFF");
  expect(document.components.every((c) => c.properties.runtimeSignalError === undefined)).toBe(true);
});
