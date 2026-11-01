import { describe, expect, it } from "vitest";
import { functionalCatalog } from "../src/catalog/functionalCatalog";
import { evaluateFunctionalModel, hasFunctionalModel } from "../src/simulation/functionalModels";

describe("functional component catalog", () => {
  it("contains only executable PLC and instrumentation definitions", () => {
    expect(functionalCatalog.length).toBe(30);
    for (const definition of functionalCatalog) {
      expect(definition.simulationSupport).not.toBe("symbol-only");
      expect(hasFunctionalModel(definition.simulationModelId)).toBe(true);
      expect(evaluateFunctionalModel(definition.simulationModelId, definition.propertiesSchema)).toMatchObject({ label: expect.any(String), value: expect.any(String) });
    }
  });
});
