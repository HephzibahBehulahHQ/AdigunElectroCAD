import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelRunSummary } from "../src/components/ModelRunSummary";
import { evaluateFunctionalModel } from "../src/simulation/functionalModels";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { catalogById } from "../src/catalog/dolCatalog";
import type { CircuitDocument } from "../src/types/electrical";

it.each([
  ["logic-math-divide", { left: 1, right: 0 }],
  ["catalog-on-delay-timer", { delaySeconds: -1 }],
  ["sensor-pt100", { temperatureC: 900 }],
  ["sensor-thermocouple", { temperatureC: 2000 }],
  ["catalog-plc-digital-io", { runtimeError: "Invalid instruction" }],
  ["logic-output-coil", { runtimeSignalError: "Upstream failure" }],
  ["six-terminal-windings", { resistanceOhm: 0 }],
] as const)("exposes structured errors for %s", (model, properties) => {
  expect(evaluateFunctionalModel(model, properties)?.error).toEqual(expect.any(String));
});

it("shows faults beyond the first two models and restores success after correction", () => {
  const document: CircuitDocument = { id: "summary", name: "Summary", description: "", revision: 1, wires: [], components: [
    { id: "a", definitionId: "logic.output-coil", reference: "K1", x: 0, y: 0, rotation: 0, properties: { input: false } },
    { id: "b", definitionId: "logic.output-coil", reference: "K2", x: 100, y: 0, rotation: 0, properties: { input: false } },
    { id: "c", definitionId: "logic.math-divide", reference: "MTH3", x: 200, y: 0, rotation: 0, properties: { left: 1, right: 0 } },
  ] };
  const render = () => renderToStaticMarkup(createElement(ModelRunSummary, { runs: executeCircuitModels(document, catalogById) }));
  const failed = render();
  expect(failed).toContain('role="alert"');
  expect(failed).toContain("MTH3:");
  expect(failed).toContain("1 of 3");
  expect(failed).not.toContain('class="pass"');
  document.components[2].properties.right = 2;
  const recovered = render();
  expect(recovered).toContain('class="pass"');
  expect(recovered).toContain("K1 OFF");
  expect(recovered).not.toContain('role="alert"');
});
