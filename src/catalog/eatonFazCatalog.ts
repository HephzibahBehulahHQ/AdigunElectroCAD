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


const branchCircuitRows = [
  { curve: "B", voltage: "wye", interruptingRatingKa: 10, currents: [1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 13, 30, 32] },
  { curve: "B", voltage: "wye", interruptingRatingKa: 14, currents: [15, 16, 20, 25] },
  { curve: "B", voltage: "240", interruptingRatingKa: 10, currents: [35, 40, 50, 63] },
  { curve: "C", voltage: "wye", interruptingRatingKa: 10, currents: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 30, 32] },
  { curve: "C", voltage: "wye", interruptingRatingKa: 14, currents: [15, 16, 20, 25] },
  { curve: "C", voltage: "240", interruptingRatingKa: 10, currents: [35, 40, 50, 63] },
  { curve: "D", voltage: "wye", interruptingRatingKa: 10, currents: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 25, 30, 32] },
  { curve: "D", voltage: "wye", interruptingRatingKa: 14, currents: [13, 15, 16, 20] },
  { curve: "D", voltage: "240", interruptingRatingKa: 10, currents: [35, 40] },
  { curve: "C", voltage: "wye", interruptingRatingKa: 14, currents: [13] },
  { curve: "B", voltage: "240", interruptingRatingKa: 10, currents: [1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 13, 15, 16, 20, 25, 30, 32], series240V: true },
  { curve: "C", voltage: "240", interruptingRatingKa: 10, currents: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 13, 15, 16, 20, 25, 30, 32], series240V: true },
  { curve: "D", voltage: "240", interruptingRatingKa: 10, currents: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 13, 15, 16, 20, 25, 30, 32], series240V: true },
  { curve: "B", voltage: "wye", interruptingRatingKa: 10, currents: [1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 13, 30, 32], ringTongueSeries: true, singlePolePackage: false },
  { curve: "B", voltage: "wye", interruptingRatingKa: 14, currents: [15, 16, 20, 25], ringTongueSeries: true, singlePolePackage: false },
  { curve: "B", voltage: "240", interruptingRatingKa: 10, currents: [35, 40, 50, 63], ringTongueSeries: true, singlePolePackage: false },
  { curve: "C", voltage: "wye", interruptingRatingKa: 14, currents: [13, 15, 16, 20, 25], ringTongueSeries: true, singlePolePackage: true },
  { curve: "C", voltage: "wye", interruptingRatingKa: 10, currents: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 30, 32], ringTongueSeries: true, singlePolePackage: true },
  { curve: "C", voltage: "240", interruptingRatingKa: 10, currents: [40], ringTongueSeries: true, singlePolePackage: true },
  { curve: "D", voltage: "wye", interruptingRatingKa: 14, currents: [13, 15, 16, 20], ringTongueSeries: true, singlePolePackage: true },
  { curve: "D", voltage: "wye", interruptingRatingKa: 10, currents: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 25, 30, 32], ringTongueSeries: true, singlePolePackage: true },
  { curve: "C", voltage: "240", interruptingRatingKa: 10, currents: [35, 50, 63], ringTongueSeries: true, singlePolePackage: false },
  { curve: "D", voltage: "240", interruptingRatingKa: 10, currents: [35], ringTongueSeries: true, singlePolePackage: false },
  { curve: "D", voltage: "240", interruptingRatingKa: 10, currents: [40], ringTongueSeries: true, singlePolePackage: true, singlePoleOnly: true },
] as const;

export const eatonFazNaCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  return branchCircuitRows.flatMap(row => {
    if ("singlePoleOnly" in row && poles !== 1) return [];
    const suffixes = "ringTongueSeries" in row ? ["-RT"] : "series240V" in row ? ["-NA-L", "-RT-L"] : ["-NA"];
    return suffixes.flatMap(suffix => row.currents.map((ratedCurrentA): ElectricalComponentDefinition => {
      const { curve, voltage, interruptingRatingKa } = row;
      const model = "FAZ" + suffix;
      const ringTongue = suffix.startsWith("-RT");
      const singlePolePackage = "singlePolePackage" in row ? row.singlePolePackage : !ringTongue;
      const orderCode = "FAZ-" + curve + ratedCurrentA + "/" + poles + suffix + (poles === 1 && singlePolePackage ? "-SP" : "");
      const voltageRating = voltage === "240" ? "240 VAC" : poles === 1 ? "277 VAC" : "480Y/277 VAC";
      // Eaton lists the four-pole C13 separately at 10 kA.
      const partInterruptingRatingKa = model === "FAZ-NA" && curve === "C" && ratedCurrentA === 13 && poles === 4 ? 10 : interruptingRatingKa;
      return {
        id: "eaton." + orderCode.toLowerCase().replace("/", "-"),
        name: "Eaton " + orderCode + " · " + model + " Branch Breaker",
        category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + "p",
        description: "DIN-rail UL 489 branch-circuit breaker with " + (ringTongue ? "ring-tongue" : "screw") + " terminals.",
        terminals,
        manufacturerRecord: {
          manufacturer: "Eaton", series: model + " UL 489", orderCode, sourceUrl: catalogue, terminalMap: "verified",
          documentRevision: "CA08100005E (July 2026), vol. 4 tab 1, section 1.2, " + model + " B/C/D selection",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], auxiliaryInstalled: false },
        },
        propertiesSchema: { ratedCurrentA, curve, voltageRating, interruptingRatingKa: partInterruptingRatingKa, terminalStyle: ringTongue ? "Ring tongue" : "Screw", closed: true },
        simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
        documentation: "The Closed setting controls the linked poles. Overcurrent tripping and protection coordination are outside the simulation scope. Published UL 489 interrupting ratings apply at the listed AC voltage.",
        standardsReferences: ["UL 489", catalogue],
      };
    }));
  });
});
