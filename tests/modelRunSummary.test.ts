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

it("keeps retained PLC state visible when a wired fault inhibits the scan", () => {
  const result = evaluateFunctionalModel("catalog-plc-digital-io", {
    inputA: true, inputB: false, runtimeQ0: false, runtimeD0: 1234,
    program: "LD D0; OUT Q0", runtimeSignalError: "ADC input has an incompatible unit.",
  });
  expect(result).toMatchObject({ label: "I/O state", error: "ADC input has an incompatible unit." });
  expect(result?.value).toContain("I0 ON");
  expect(result?.value).toContain("Q0 OFF");
  expect(result?.value).toContain("D0 1234");
  expect(result?.value).toContain("ERROR: ADC input has an incompatible unit.");
  const summary = renderToStaticMarkup(createElement(ModelRunSummary, { runs: [{ componentId: "plc1", reference: "PLC1", modelId: "catalog-plc-digital-io", output: result!, evaluatedProperties: {} }] }));
  expect(summary).toContain("PLC1: ADC input has an incompatible unit.");
  expect(summary).toContain("I/O state: I0 ON · I1 OFF · Q0 OFF · D0 1234");
});

it("shows the live PLC watch table and recent scan trace for I/O and retained registers", () => {
  const result = evaluateFunctionalModel("catalog-plc-digital-io", {
    inputA: true, inputB: false, analogInput0: 13824, runtimeQ0: true,
    runtimeD0: 50, runtimeD7: -2, program: "LD AI0; MOV AI0 D0; OUT Q0",
  });
  const runtimeScanTrace = JSON.stringify([{ scan: 4, elapsedSeconds: 0.4, input0: true, input1: false, analogInput0: 13824, output: true, registers: [50, 0, 0, 0, 0, 0, 0, -2], status: "ok" }]);
  const summary = renderToStaticMarkup(createElement(ModelRunSummary, { runs: [{
    componentId: "plc1", reference: "PLC1", modelId: "catalog-plc-digital-io", output: result!,
    evaluatedProperties: { inputA: true, inputB: false, analogInput0: 13824, runtimeQ0: true, runtimeD0: 50, runtimeD7: -2, program: "LD AI0; MOV AI0 D0; OUT Q0", runtimeScanTrace },
  }] }));
  expect(summary).toContain('aria-label="PLC1 PLC watch table"');
  expect(summary).toContain("AI0");
  expect(summary).toContain("13824");
  expect(summary).toContain("D0");
  expect(summary).toContain("50");
  expect(summary).toContain("D7");
  expect(summary).toContain("-2");
  expect(summary).toContain('aria-label="PLC1 recent PLC scan trace"');
  expect(summary).toContain("Recent scan trace");
  expect(summary).toContain("0.4");
  expect(summary).toContain("PLC scan attempts");
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

