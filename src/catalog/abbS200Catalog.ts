import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/ac7ba9f0b2fe4959848cfa4f6e8a7e2e/A_ELSB_Catalogue_2024_1st_Edition%202%20_MCB.pdf?x-sign=GAskBmCQdaHJauAVoVBxsNYV0NOiSrEkkQgM8DiqnKF1A71eM0d5Rhc9Up8TNzG5";
const bCurrents = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const cdCurrents = [0.5, 1, 1.6, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const orderRows = [
  { curve: "B", suffix: "5", currents: bCurrents },
  { curve: "C", suffix: "4", currents: cdCurrents },
  { curve: "D", suffix: "1", currents: cdCurrents },
];

function createAbbS200Catalog(mSeries: boolean): ElectricalComponentDefinition[] {
  const series = mSeries ? "S200M" : "S200";
  const icnKa = mSeries ? 10 : 6;
  return [1, 2, 3, 4].flatMap(poles => {
    const { branches, terminals } = numberedBreakerPoles(poles);
    return orderRows.flatMap(({ curve, suffix, currents }) => currents.map((ratedCurrentA): ElectricalComponentDefinition => {
      const ratingCode = ratedCurrentA === 0.5 ? "098" : ratedCurrentA === 1.6 ? "097" : String(ratedCurrentA).padStart(3, "0");
      const orderCode = (mSeries ? "2CDS27" : "2CDS25") + poles + "001R" + ratingCode + suffix;
      const model = "S20" + poles + (mSeries ? "M-" : "-") + curve + ratedCurrentA;
      return {
        id: "abb." + orderCode.toLowerCase(),
        name: "ABB " + model + " · " + orderCode,
        category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + "p",
        description: "ABB System pro M compact " + series + " miniature circuit breaker, " + poles + "P.",
        terminals,
        manufacturerRecord: {
          manufacturer: "ABB", series, orderCode, sourceUrl: catalogue, terminalMap: "verified",
          documentRevision: "ABB Electrical Installation Solutions for Buildings 2024, " + series + " B/C/D ordering details and diagrams",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
        },
        propertiesSchema: { ratedCurrentA, curve, icnKa, closed: true },
        simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
        documentation: "The Closed setting controls the linked contacts. The published Icn is the IEC/EN 60898-1 rating. Simulation covers manual switching continuity.",
        standardsReferences: ["IEC/EN 60898-1", catalogue],
      };
    }));
  });
}

export const abbS200mCatalog = createAbbS200Catalog(true);
export const abbS200Catalog = createAbbS200Catalog(false);
