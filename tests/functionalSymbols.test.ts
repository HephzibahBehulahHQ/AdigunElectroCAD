import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Schematic } from "../src/components/Schematic";
import { createSourcedDolMotorStarter } from "../src/projects/sourcedDolMotorStarter";
import { initialDolState } from "../src/simulation/dolSimulator";
import { genericComponentProfiles } from "../src/catalog/dolCatalog";
import { modeledCatalog } from "../src/catalog/modeledCatalog";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";

it("renders each modeled electrical catalog family with a dedicated device symbol", () => {
  const genericOnly = [...new Set(modeledCatalog.map((definition) => definition.symbolId))]
    .filter((symbolId) => !hasDedicatedFunctionalSymbol(symbolId));
  expect(genericOnly).toEqual([]);
});

it("uses the actual component name for generic motor accessibility labels", () => {
  const motor = genericComponentProfiles.find((definition) => definition.id === "generic.iec.induction-motor")!;
  const markup = renderToStaticMarkup(createElement(FunctionalSymbol, {
    symbolId: motor.symbolId,
    x: 0,
    y: 0,
    componentName: motor.name,
  }));
  expect(markup).toContain('aria-label="Generic three-phase motor · 6 leads, three-phase induction motor"');
  expect(markup).not.toContain("Siemens SIMOTICS");
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

it.each(["logic-no", "logic-nc", "pushbutton-no", "pushbutton-nc"])("draws %s at the wire anchors and follows its contact state", (symbolId) => {
  const normallyClosed = symbolId.endsWith("-nc");
  for (const actuated of [false, true]) {
    const closed = normallyClosed !== actuated;
    const markup = renderToStaticMarkup(createElement(FunctionalSymbol, {
      symbolId, x: 100, y: 100, properties: { input: actuated, pressed: actuated },
    }));
    expect(markup).toContain(`data-state="${closed ? "closed" : "open"}"`);
    expect(markup).toContain(`M 53 100 H 89 L 111 ${closed ? 100 : 87} M 111 100 H 147`);
  }
});

it("renders the evaluated contact state without changing the saved design", () => {
  const document = { id: "control-state", name: "Control state", description: "", revision: 1, wires: [], components: [{
    id: "contact", definitionId: "logic.no-contact", reference: "S1", x: 200, y: 200, rotation: 0 as const, properties: { input: false },
  }] };
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, symbolStates: new Map([["contact", { input: true }]]),
    selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toContain("Normally open contact, closed");
  expect(document.components[0].properties.input).toBe(false);
});
