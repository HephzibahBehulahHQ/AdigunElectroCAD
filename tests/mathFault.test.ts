import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { evaluateFunctionalModel, evaluateFunctionalSignal } from "../src/simulation/functionalModels";
import { mathBlock } from "../src/simulation/controlLogic";
import type { CircuitDocument } from "../src/types/electrical";

it.each(["add", "subtract", "multiply", "divide"] as const)("rejects %s overflow", kind => {
  const right = kind === "subtract" ? -Number.MAX_VALUE : kind === "divide" ? Number.MIN_VALUE : Number.MAX_VALUE;
  expect(mathBlock(kind, Number.MAX_VALUE, right)).toMatchObject({ ok: false });
});

it.each([NaN, Infinity, "2", true])("reports malformed math input %s without zero substitution", left => {
  expect(evaluateFunctionalModel("logic-math-add", { left, right: 1 })?.value).toContain("ERROR:");
  expect(evaluateFunctionalSignal("logic-math-add", { left, right: 1 })).toMatchObject({ value: false, error: expect.any(String) });
});

it("propagates division failure through a comparator to a configured-on coil and recovers", () => {
  const document: CircuitDocument = { id: "math-fault", name: "Math fault", description: "", revision: 1, components: [
    { id: "math", definitionId: "logic.math-divide", reference: "A1", x: 100, y: 100, rotation: 0, properties: { left: 10, right: 2 } },
    { id: "compare", definitionId: "logic.comparator-greater-than", reference: "G1", x: 300, y: 100, rotation: 0, properties: { left: 100, right: 3 } },
    { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 500, y: 100, rotation: 0, properties: { input: true } },
  ], wires: [
    { id: "w1", from: { componentId: "math", terminalId: "out" }, to: { componentId: "compare", terminalId: "in-a" }, points: [] },
    { id: "w2", from: { componentId: "compare", terminalId: "out" }, to: { componentId: "coil", terminalId: "in" }, points: [] },
  ] };
  const runs = () => executeCircuitModels(document, catalogById);
  expect(runs().find(r => r.componentId === "coil")!.output.value).toBe("ON");
  document.components[0].properties.right = 0;
  const failed = runs();
  expect(failed.every(r => r.output.value.includes("ERROR:"))).toBe(true);
  expect(failed.find(r => r.componentId === "coil")!.evaluatedProperties.input).toBe(false);
  expect(document.components.every(c => c.properties.runtimeSignalError === undefined)).toBe(true);
  document.components[0].properties.right = 2;
  expect(runs().find(r => r.componentId === "coil")!.output.value).toBe("ON");
});
