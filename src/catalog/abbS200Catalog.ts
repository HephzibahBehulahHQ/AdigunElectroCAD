import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/ac7ba9f0b2fe4959848cfa4f6e8a7e2e/A_ELSB_Catalogue_2024_1st_Edition%202%20_MCB.pdf?x-sign=GAskBmCQdaHJauAVoVBxsNYV0NOiSrEkkQgM8DiqnKF1A71eM0d5Rhc9Up8TNzG5";
const pCatalogue = "https://library.e.abb.com/public/e1feaf53e4b99c8ac1257e36003719a4/Modular%20DIN%20Comps%20MCB%20RCB%20Meters%20Surge%209AKK106354A1400.pdf?x-sign=7pHa0hBqL5wZ0m38PLj8xj8AceR%2BpVM%2BKDDEEa6MIZD0pFUEhqjZ1gswRe6LSwkI";
const bCurrents = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const cdCurrents = [0.5, 1, 1.6, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const orderRows = [
  { curve: "B", suffix: "5", currents: bCurrents },
  { curve: "C", suffix: "4", currents: cdCurrents },
  { curve: "D", suffix: "1", currents: cdCurrents },
];

function createAbbS200Catalog(series: "S200" | "S200M" | "S200P"): ElectricalComponentDefinition[] {
  const prefix = { S200: "2CDS25", S200M: "2CDS27", S200P: "2CDS28" }[series];
  const sourceUrl = series === "S200P" ? pCatalogue : catalogue;
  return [1, 2, 3, 4].flatMap(poles => {
    const { branches, terminals } = numberedBreakerPoles(poles);
    return orderRows.flatMap(({ curve, suffix, currents }) => currents.filter(ratedCurrentA => series !== "S200P" || curve !== "C" || ratedCurrentA !== 13).map((ratedCurrentA): ElectricalComponentDefinition => {
      const ratingCode = ratedCurrentA === 0.5 ? "098" : ratedCurrentA === 1.6 ? "097" : String(ratedCurrentA).padStart(3, "0");
      const orderCode = prefix + poles + "001R" + ratingCode + suffix;
      const model = "S20" + poles + series.slice(4) + "-" + curve + ratedCurrentA;
      const icnKa = series === "S200P" ? (ratedCurrentA <= 25 ? 25 : 15) : series === "S200M" ? 10 : 6;
      return {
        id: "abb." + orderCode.toLowerCase(),
        name: "ABB " + model + " · " + orderCode,
        category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + "p",
        description: "ABB System pro M compact " + series + " miniature circuit breaker, " + poles + "P.",
        terminals,
        manufacturerRecord: {
          manufacturer: "ABB", series, orderCode, sourceUrl, terminalMap: "verified",
          documentRevision: (series === "S200P" ? "ABB System pro M compact 9AKK106354A1400, " : "ABB Electrical Installation Solutions for Buildings 2024, ") + series + " B/C/D ordering details and diagrams",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
        },
        propertiesSchema: { ratedCurrentA, curve, icnKa, closed: true },
        simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
        documentation: "The Closed setting controls the linked contacts. The published Icn is the IEC/EN 60898-1 rating. Simulation covers manual switching continuity.",
        standardsReferences: ["IEC/EN 60898-1", sourceUrl],
      };
    }));
  });
}

export const abbS200mCatalog = createAbbS200Catalog("S200M");
export const abbS200Catalog = createAbbS200Catalog("S200");

export const abbS200pCatalog = createAbbS200Catalog("S200P");
