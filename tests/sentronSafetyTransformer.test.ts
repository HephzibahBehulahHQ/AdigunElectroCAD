import { expect, it } from "vitest";
import { terminalAnchors } from "../src/cad/terminalAnchors";
import { deviceEnvelope } from "../src/catalog/deviceEnvelopes";
import { catalogById } from "../src/catalog/dolCatalog";
import { createTransformerPilotProject } from "../src/projects/transformerPilotProject";
import { verifyCircuitSequence } from "../src/projects/templateVerification";

it("uses the documented SENTRON winding terminals and runs an isolated 8 V pilot circuit", () => {
  const definition = catalogById.get("siemens.4ac37.4ac3716-0")!;
  expect(definition.terminals.map(({ label }) => label)).toEqual(["1", "7", "4", "8"]);
  expect(deviceEnvelope(definition.id)).toMatchObject({ widthMm: 36, heightMm: 90, depthMm: 64 });
  const { document } = createTransformerPilotProject();
  const transformer = document.components.find(component => component.id === "transformer")!;
  transformer.definitionId = definition.id;
  transformer.properties = { ...definition.propertiesSchema };
  document.components.find(component => component.id === "lamp")!.properties.ratedVoltageV = 8;
  expect(terminalAnchors(document).filter(({ endpoint }) => endpoint.componentId === transformer.id)
    .map(({ endpoint }) => endpoint.terminalId)).toEqual(["p1", "p2", "s1", "s2"]);
  const results = verifyCircuitSequence(document, [true, false].map(pressed => ({
    name: pressed ? "Energize primary" : "Release primary",
    changes: [{ reference: "S1", properties: { pressed } }],
    expectations: [{ reference: "H1", label: "Indicator lamp", exact: pressed ? "LIT · 8 V AC" : "OFF" }],
  })), catalogById);
  expect(results.map(result => result.failures)).toEqual([[], []]);
});
