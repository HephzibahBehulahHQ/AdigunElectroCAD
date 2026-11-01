import { describe, expect, it } from "vitest";
import { functionalCatalog } from "../src/catalog/functionalCatalog";
import { evaluateFunctionalModel, hasFunctionalModel } from "../src/simulation/functionalModels";
import { hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";

describe("functional component catalog", () => {
  it("contains only executable requested component definitions", () => {
    expect(functionalCatalog.length).toBe(67);
    expect(Object.fromEntries(Array.from(new Set(functionalCatalog.map((definition) => definition.category))).map((category) => [category, functionalCatalog.filter((definition) => definition.category === category).length]))).toMatchObject({ "Logic & Control": 20, "Advanced Sensors & Instrumentation": 10, "Pneumatics & Hydraulics": 9, HVAC: 6, "Solar & Renewable Energy": 5, "Safety & Monitoring Devices": 6, "Distribution & Panel Hardware": 7, "Wiring & Cables": 4 });
    for (const definition of functionalCatalog) {
      expect(definition.simulationSupport).not.toBe("symbol-only");
      expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
      expect(hasFunctionalModel(definition.simulationModelId)).toBe(true);
      expect(evaluateFunctionalModel(definition.simulationModelId, definition.propertiesSchema)).toMatchObject({ label: expect.any(String), value: expect.any(String) });
    }
  });
});
