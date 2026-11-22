import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/industrial-miniature-circuit-breakers/Industrial-breakers-catalog-ca08100005e.pdf";
const orderRows = [
  { curve: "B", currents: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 15, 16, 20, 25, 30, 32, 40, 50, 63] },
  { curve: "C", currents: [0.5, 1, 1.6, 2, 3, 4, 5, 6, 7, 8, 10, 13, 15, 16, 20, 25, 30, 32, 40, 50, 63] },
  { curve: "D", currents: [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 10, 13, 15, 16, 20, 25, 30, 32, 40, 50, 63] },
] as const;

export const eatonFazCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  return orderRows.flatMap(({ curve, currents }) => currents.map((ratedCurrentA): ElectricalComponentDefinition => {
    const orderCode = "FAZ-" + curve + ratedCurrentA + "/" + poles + (poles === 1 ? "-SP" : "");
    return {
      id: "eaton." + orderCode.toLowerCase().replace("/", "-"),
      name: "Eaton " + orderCode + " · FAZ Supplementary Protector",
      category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + "p",
      description: "FAZ DIN-rail supplementary protector (" + poles + "P, " + curve + " curve, " + ratedCurrentA + " A).",
      terminals,
      manufacturerRecord: {
        manufacturer: "Eaton", series: "FAZ UL 1077", orderCode, sourceUrl: catalogue, terminalMap: "verified",
        documentRevision: "CA08100005E, vol. 4 tab 1, section 1.3, UL 1077 B/C/D product selection",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], auxiliaryInstalled: false },
      },
      propertiesSchema: { ratedCurrentA, curve, closed: true },
      simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
      documentation: "The Closed setting controls the linked poles. Overcurrent tripping and protection coordination are outside the simulation scope. Eaton lists these models as UL 1077 supplementary protectors.",
      standardsReferences: ["UL 1077", catalogue],
    };
  }));
});
