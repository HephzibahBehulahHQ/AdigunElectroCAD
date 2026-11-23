import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/69d2fecb91064374b58fb8d7a769aece/2019%20v2-%20CatalogueS800.pdf";
const lowCurrents = [0.5, 1, 1.6, 2, 2.5, 3, 4, 5];
const standardCurrents = [6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
const highCurrentCodes = new Map([[100, 82], [125, 84]]);
const standardCurves = [{ curve: "B", code: "5" }, { curve: "C", code: "4" }];

export const abbS800sCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  return standardCurves.flatMap(({ curve, code }, curveIndex) => {
    // ABB uses sequential 2CCF references for the eight low-current variants.
    const firstLowCurrentReference = 19841 + (poles - 1) * 24 + curveIndex * 8;
    const orders = [
      ...lowCurrents.map((ratedCurrentA, index) => ({
        ratedCurrentA,
        orderCode: "2CCF" + String(firstLowCurrentReference + index).padStart(6, "0") + "R0001",
      })),
      ...standardCurrents.map(ratedCurrentA => ({
        ratedCurrentA,
        orderCode: "2CCS86" + poles + "001R" + String(highCurrentCodes.get(ratedCurrentA) ?? ratedCurrentA).padStart(3, "0") + code,
      })),
    ];
    return orders.map(({ ratedCurrentA, orderCode }): ElectricalComponentDefinition => ({
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB S80" + poles + "S-" + curve + ratedCurrentA + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + "p",
      description: "ABB S800S high-performance circuit breaker with interchangeable cage terminals.",
      terminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S800S", orderCode, sourceUrl: catalogue, terminalMap: "verified",
        documentRevision: "ABB S800 High Performance MCBs 2019 v2, S800S B/C ordering tables and wiring diagrams",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
      },
      propertiesSchema: { ratedCurrentA, curve, icuKa: 50, closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "The Closed setting controls linked pole continuity. Trip behavior and voltage-dependent breaking capacity are outside the simulation scope.",
      standardsReferences: ["IEC/EN 60947-2", catalogue],
    }));
  });
});
