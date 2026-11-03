import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { functionalCatalog } from "../src/catalog/functionalCatalog";
import { evaluateFunctionalModel, hasFunctionalModel } from "../src/simulation/functionalModels";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";

describe("functional component catalog", () => {
  it.each([
    ["and", "&amp;", false], ["or", "≥1", false], ["not", "1", true],
    ["nand", "&amp;", true], ["nor", "≥1", true], ["xor", "=1", false],
  ] as const)("renders the actual %s catalog gate distinctly", (kind, label, inverted) => {
    const definition = functionalCatalog.find(d => d.id === `logic.gate-${kind}`)!;
    const markup = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 100, y: 100 }));
    expect(markup).toContain(`aria-label="${kind.toUpperCase()} logic gate"`);
    expect(markup).toContain(`>${label}</text>`);
    expect(markup.includes("<circle")).toBe(inverted);
    expect(markup).toContain("<rect");
  });
  it("contains only executable requested component definitions", () => {
    expect(functionalCatalog.length).toBe(67);
    expect(Object.fromEntries(Array.from(new Set(functionalCatalog.map((definition) => definition.category))).map((category) => [category, functionalCatalog.filter((definition) => definition.category === category).length]))).toMatchObject({ "Logic & Control": 20, "Advanced Sensors & Instrumentation": 10, "Pneumatics & Hydraulics": 9, HVAC: 6, "Solar & Renewable Energy": 5, "Safety & Monitoring Devices": 6, "Distribution & Panel Hardware": 7, "Wiring & Cables": 4 });
    for (const definition of functionalCatalog) {
      expect(definition.simulationSupport).not.toBe("symbol-only");
      expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
      expect(renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 0, y: 0 }))).toContain("functional-symbol");
      expect(hasFunctionalModel(definition.simulationModelId)).toBe(true);
      expect(evaluateFunctionalModel(definition.simulationModelId, definition.propertiesSchema)).toMatchObject({ label: expect.any(String), value: expect.any(String) });
    }
  });
});
