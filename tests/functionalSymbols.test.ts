import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Schematic } from "../src/components/Schematic";
import { createSourcedDolMotorStarter } from "../src/projects/sourcedDolMotorStarter";
import { initialDolState } from "../src/simulation/dolSimulator";
import { modeledCatalog } from "../src/catalog/modeledCatalog";
import { hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";

it("renders each modeled electrical catalog family with a dedicated device symbol", () => {
  const genericOnly = [...new Set(modeledCatalog.map((definition) => definition.symbolId))]
    .filter((symbolId) => !hasDedicatedFunctionalSymbol(symbolId));
  expect(genericOnly).toEqual([]);
});

it("renders the DOL example as direct IEC symbols with visible terminal identities", () => {
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document: createSourcedDolMotorStarter(),
    selectedComponentId: "",
    selectedWireId: "",
    simulation: initialDolState(),
    wireMode: false,
    wireStart: null,
    onSelect: () => {},
    onWireSelect: () => {},
    onTerminalSelect: () => {},
  }));
  expect(markup).not.toContain('class="free-symbol"');
  expect(markup).toContain("supply.l1-out");
  expect(markup).toContain("breaker.l1-in");
  expect(markup).toContain("motor.pe");
});
