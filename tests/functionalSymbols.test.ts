import { expect, it } from "vitest";
import { modeledCatalog } from "../src/catalog/modeledCatalog";
import { hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";

it("renders each modeled electrical catalog family with a dedicated device symbol", () => {
  const genericOnly = [...new Set(modeledCatalog.map((definition) => definition.symbolId))]
    .filter((symbolId) => !hasDedicatedFunctionalSymbol(symbolId));
  expect(genericOnly).toEqual([]);
});
