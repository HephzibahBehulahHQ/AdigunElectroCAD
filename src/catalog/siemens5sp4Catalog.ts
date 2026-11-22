import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://cache.industry.siemens.com/dl/files/638/109750638/att_1134477/v1/03_MiniatureCircuitBreakers_LV10_102022_EN_202303231210577774.pdf";
const orderRows = [
  { ratedCurrentA: 80, code: "80", curves: ["B", "C", "D"] },
  { ratedCurrentA: 100, code: "91", curves: ["B", "C", "D"] },
  { ratedCurrentA: 125, code: "92", curves: ["B", "C"] },
] as const;
const suffixes = { B: 6, C: 7, D: 8 };

export const siemens5sp4Catalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  return orderRows.flatMap(({ ratedCurrentA, code, curves }) => curves.map((curve): ElectricalComponentDefinition => {
    const orderCode = "5SP4" + poles + code + "-" + suffixes[curve];
    return {
      id: "siemens." + orderCode.toLowerCase(),
      name: "Siemens " + orderCode + " · SENTRON 5SP4",
      category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + "p",
      description: "SENTRON 5SP4 high-current miniature breaker, " + poles + "P.",
      terminals,
      manufacturerRecord: {
        manufacturer: "Siemens", series: "SENTRON 5SP4", orderCode, sourceUrl: catalogue, terminalMap: "verified",
        documentRevision: "Siemens LV 10 (10/2022), 5SP4 selection tables and terminal diagrams",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
      },
      propertiesSchema: { ratedCurrentA, curve, voltageRating: poles === 1 ? "230/400 VAC" : "400 VAC", icnKa: 10, closed: true },
      simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
      documentation: "The Closed setting controls the linked contacts. The catalog Icn is the IEC/EN 60898-1 rating. Simulation covers manual switching continuity.",
      standardsReferences: ["IEC/EN 60898-1", catalogue],
    };
  }));
});
