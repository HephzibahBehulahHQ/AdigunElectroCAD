import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/69d2fecb91064374b58fb8d7a769aece/2019%20v2-%20CatalogueS800.pdf";
const lowCurrents = [0.5, 1, 1.6, 2, 2.5, 3, 4, 5];
const standardCurrents = [6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
const highCurrentCodes = new Map([[100, 82], [125, 84]]);
const kCurrentCodes = new Map([
  [6, 6], [8, 40], [10, 42], [13, 44], [16, 46], [20, 48], [25, 51],
  [32, 53], [40, 55], [50, 57], [63, 59], [80, 62], [100, 63], [125, 64],
]);
const curveOrders = [
  { curve: "B", code: "5", firstLowCurrentReference: 19841, poleStride: 24 },
  { curve: "C", code: "4", firstLowCurrentReference: 19849, poleStride: 24 },
  { curve: "D", code: "1", firstLowCurrentReference: 19857, poleStride: 24 },
  { curve: "K", code: "7", firstLowCurrentReference: 19937, poleStride: 8 },
];

function createAbbS800Catalog(series: "S800S" | "S800N"): ElectricalComponentDefinition[] {
  const highPerformance = series === "S800S";
  const prefix = highPerformance ? "2CCS86" : "2CCS89";
  const availableCurves = highPerformance ? curveOrders : curveOrders.filter(({ curve }) => curve !== "K");
  return [1, 2, 3, 4].flatMap(poles => {
    const { branches, terminals } = numberedBreakerPoles(poles);
    return availableCurves.flatMap(({ curve, code, firstLowCurrentReference, poleStride }) => {
      // ABB uses sequential 2CCF references for the eight low-current variants.
      const firstReference = firstLowCurrentReference + (poles - 1) * poleStride;
      const orders = [
        ...(highPerformance ? lowCurrents : []).map((ratedCurrentA, index) => ({
          ratedCurrentA,
          orderCode: "2CCF" + String(firstReference + index).padStart(6, "0") + "R0001",
        })),
        ...standardCurrents.map(ratedCurrentA => ({
          ratedCurrentA,
          orderCode: prefix + poles + "001R" + String((curve === "K" ? kCurrentCodes : highCurrentCodes).get(ratedCurrentA) ?? ratedCurrentA).padStart(3, "0") + code,
        })),
      ];
      return orders.map(({ ratedCurrentA, orderCode }): ElectricalComponentDefinition => ({
        id: "abb." + orderCode.toLowerCase(),
        name: "ABB S80" + poles + series.slice(-1) + "-" + curve + ratedCurrentA + " · " + orderCode,
        category: "Protection Devices",
        referencePrefix: "Q",
        symbolId: "breaker-acti9-" + poles + "p",
        description: "ABB " + series + " high-performance circuit breaker with interchangeable cage terminals.",
        terminals,
        manufacturerRecord: {
          manufacturer: "ABB", series, orderCode, sourceUrl: catalogue, terminalMap: "verified",
          documentRevision: "ABB S800 High Performance MCBs 2019 v2, " + series + " " + curve + " ordering tables and wiring diagrams",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
        },
        propertiesSchema: { ratedCurrentA, curve, icuKa: highPerformance ? 50 : 36, closed: true },
        simulationModelId: "catalog-circuit-breaker",
        simulationSupport: "connectivity",
        documentation: "The Closed setting controls linked pole continuity. Trip behavior and voltage-dependent breaking capacity are outside the simulation scope.",
        standardsReferences: ["IEC/EN 60947-2", catalogue],
      }));
    });  });
}

export const abbS800sCatalog = createAbbS800Catalog("S800S");
export const abbS800nCatalog = createAbbS800Catalog("S800N");
