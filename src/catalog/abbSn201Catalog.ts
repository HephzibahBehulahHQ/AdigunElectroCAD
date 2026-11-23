import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/141f1171b4184f8796b341db8db8d3a7/2CSC402001B0201.pdf";
const leftCatalogue = "https://library.e.abb.com/public/651c92f9a1dc4d51bd066b50ccdadb56/1TXH000221C0303_Lessentiel_tableautier.pdf";
const orders = [
  { series: "SN201L", prefix: "2CSS245101", icnKa: 4.5, curve: "B", suffix: "5", currents: [2, 4, 6, 10, 16, 20, 25, 32, 40] },
  { series: "SN201L", prefix: "2CSS245101", icnKa: 4.5, curve: "C", suffix: "4", currents: [2, 4, 6, 10, 16, 20, 25, 32, 40] },
  { series: "SN201", prefix: "2CSS255101", icnKa: 6, curve: "B", suffix: "5", currents: [6, 10, 16, 20, 25, 32, 40] },
  { series: "SN201", prefix: "2CSS255101", icnKa: 6, curve: "C", suffix: "4", currents: [2, 4, 6, 10, 13, 16, 20, 25, 32, 40] },
  { series: "SN201", prefix: "2CSS255101", icnKa: 6, curve: "D", suffix: "1", currents: [6, 10, 16, 20, 25, 32, 40] },
  { series: "SN201M", prefix: "2CSS275101", icnKa: 10, curve: "B", suffix: "5", currents: [6, 10, 16, 20, 25, 32, 40] },
  { series: "SN201M", prefix: "2CSS275101", icnKa: 10, curve: "C", suffix: "4", currents: [2, 4, 6, 10, 16, 20, 25, 32, 40] },
];
const leftOrders = [
  { series: "SN201L", prefix: "2CSS245102", icnKa: 4.5, curve: "C", suffix: "4", currents: [2, 6, 10, 16, 20, 25, 32] },
  { series: "SN201", prefix: "2CSS255102", icnKa: 6, curve: "C", suffix: "4", currents: [2, 6, 10, 16, 20, 25, 32] },
  { series: "SN201", prefix: "2CSS255102", icnKa: 6, curve: "D", suffix: "1", currents: [10, 16, 20, 25, 32, 40] },
];
const { branches, terminals } = numberedBreakerPoles(2);

export const abbSn201Catalog: ElectricalComponentDefinition[] = [
  ...orders.map(order => ({ ...order, neutralSide: "right", sourceUrl: catalogue })),
  ...leftOrders.map(order => ({ ...order, neutralSide: "left", sourceUrl: leftCatalogue })),
].flatMap(({ series, prefix, icnKa, curve, suffix, currents, neutralSide, sourceUrl }) => {
  const neutralOnLeft = neutralSide === "left";
  const neutralTerminals = branches[neutralOnLeft ? 0 : 1];
  const physicalTerminals = terminals.map((terminal, index) => ({
    ...terminal,
    label: neutralTerminals.includes(terminal.id) ? "N" : String(index % 2 + 1),
  }));
  return currents.map((ratedCurrentA): ElectricalComponentDefinition => {
    const orderCode = prefix + "R" + String(ratedCurrentA).padStart(3, "0") + suffix;
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB " + series + "-" + curve + ratedCurrentA + (neutralOnLeft ? "-L" : "") + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-2pn",
      description: "ABB compact one-module miniature circuit breaker with a protected line pole and switched neutral.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series, orderCode, sourceUrl, terminalMap: "verified",
        documentRevision: neutralOnLeft ? "ABB 1TXH000221C0303, SN201 left-neutral order data" : "ABB 2CSC402001B0201, SN201 ordering tables and 1+N diagrams",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: 1, neutralTerminals },
      },
      propertiesSchema: { ratedCurrentA, curve, icnKa, switchedNeutral: true, neutralSide, closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "The neutral switches with the line pole. Simulation represents manual contact continuity.",
      standardsReferences: ["IEC/EN 60898-1", sourceUrl],
    };
  });
});
