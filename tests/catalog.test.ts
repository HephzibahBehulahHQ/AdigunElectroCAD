import { describe, expect, it } from "vitest";
import { componentCatalog, dolCatalog } from "../src/catalog/dolCatalog";
import { modeledCatalog } from "../src/catalog/modeledCatalog";

describe("IEC-oriented component catalog", () => {
  it("contains 520 or more uniquely identified modeled entries", () => {
    expect(componentCatalog.length).toBeGreaterThanOrEqual(520);
    expect(new Set(componentCatalog.map((definition) => definition.id)).size).toBe(componentCatalog.length);
    expect(new Set(modeledCatalog.map((definition) => definition.category)).size).toBeGreaterThanOrEqual(16);
  });

  it("keeps the DOL simulation models distinct from generic symbol templates", () => {
    expect(dolCatalog).toHaveLength(8);
    expect(modeledCatalog.every((definition) => definition.simulationSupport === "symbol-only" && definition.propertiesSchema.manufacturerDataVerified === false)).toBe(true);
  });

  it("provides terminal and standards metadata for every entry", () => {
    for (const definition of componentCatalog) {
      expect(definition.referencePrefix).not.toBe("");
      expect(definition.terminals.length).toBeGreaterThan(0);
      expect(new Set(definition.terminals.map((terminal) => terminal.id)).size).toBe(definition.terminals.length);
      expect(definition.standardsReferences.length).toBeGreaterThan(0);
    }
  });
});
