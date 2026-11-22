import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://cache.industry.siemens.com/dl/files/638/109750638/att_1134477/v1/03_MiniatureCircuitBreakers_LV10_102022_EN_202303231210577774.pdf";
// Current codes from the 5SY4 order tables, grouped by identical pole and curve availability.
const orderRows5sy4 = [
  { poleCodes: [1, 2, 3], curve: "A", suffix: 5, currentCodes: "01 02 03 04 05 06 08 10 13 15 16 20 25 32 40 50 63" },
  { poleCodes: [1, 2, 3], curve: "B", suffix: 6, currentCodes: "01 02 03 04 06 08 10 13 15 16 20 25 32 40 50 63 80" },
  { poleCodes: [1, 2, 3], curve: "C", suffix: 7, currentCodes: "01 02 03 04 05 06 08 10 11 13 14 15 16 18 20 25 30 32 35 40 45 50 60 63 80" },
  { poleCodes: [1, 2, 3, 4, 5, 6], curve: "D", suffix: 8, currentCodes: "01 02 03 04 05 06 08 10 13 14 15 16 20 25 32 40 50 63" },
  { poleCodes: [4, 5, 6], curve: "A", suffix: 5, currentCodes: "01 02 03 04 06 08 10 13 15 16 20 25 32 40 50 63" },
  { poleCodes: [4], curve: "B", suffix: 6, currentCodes: "06 10 13 16 20 25 32 40 50 63 80" },
  { poleCodes: [4, 5, 6], curve: "C", suffix: 7, currentCodes: "01 02 03 04 05 06 08 10 13 14 15 16 20 25 32 40 50 63 80" },
  { poleCodes: [5], curve: "B", suffix: 6, currentCodes: "04 06 10 13 15 16 20 25 32 40 50 63" },
  { poleCodes: [6], curve: "B", suffix: 6, currentCodes: "04 06 10 13 16 20 25 32 40 50 63" },
];
const orderRows5sy6 = [
  { poleCodes: [1], curve: "B", suffix: 6, currentCodes: "02 04 06 10 13 16 20 25 32 40 50 63" },
  { poleCodes: [1, 2, 3], curve: "C", suffix: 7, currentCodes: "01 02 03 04 05 06 08 10 11 13 14 15 16 18 20 25 30 32 40 50 63" },
  { poleCodes: [2, 3, 4, 5, 6], curve: "B", suffix: 6, currentCodes: "06 10 13 16 20 25 32 40 50 63" },
  { poleCodes: [4, 5, 6], curve: "C", suffix: 7, currentCodes: "01 02 03 04 05 06 08 10 13 14 15 16 20 25 32 40 50 63" },
];
const orderRows5sy7 = [
  { poleCodes: [1, 2, 3, 4, 5, 6], curve: "B", suffix: 6, currentCodes: "06 10 13 16 20 25 32 40 50 63" },
  { poleCodes: [1, 2, 3, 4, 5, 6], curve: "C", suffix: 7, currentCodes: "01 02 03 04 05 06 08 10 13 14 15 16 20 25 32 40 50 63" },
  { poleCodes: [1, 2, 3, 4, 5, 6], curve: "D", suffix: 8, currentCodes: "01 02 03 04 05 06 08 10 13 14 15 16 20 25 32 40 50 63" },
];
const orderRows5sy8 = [
  { poleCodes: [1, 2, 3, 4, 5, 6], curve: "C", suffix: 7, currentCodes: "01 02 03 04 05 06 08 10 13 14 15 16 20 25 32 40 50 63" },
  { poleCodes: [1, 2, 3, 4, 5, 6], curve: "D", suffix: 8, currentCodes: "01 02 03 04 05 06 08 10 13 14 15 16 20 25 32 40 50 63" },
];
const specialCurrentCodes: Record<string, number> = { "05": 0.5, "11": 5, "14": 0.3, "15": 1.6, "18": 15 };

function createSiemens5syCatalog(family: "5SY4" | "5SY6" | "5SY7" | "5SY8", icnKa: number, orderRows: typeof orderRows5sy4): ElectricalComponentDefinition[] {
  return [1, 2, 3, 4, 5, 6].flatMap(poleCode => {
    const switchedNeutral = poleCode >= 5;
    const protectedPoles = poleCode === 5 ? 1 : poleCode === 6 ? 3 : poleCode;
    const poles = protectedPoles + Number(switchedNeutral);
    const { branches, terminals } = numberedBreakerPoles(poles);
    const neutralTerminals = switchedNeutral ? branches.at(-1)! : [];
    const labeledTerminals = terminals.map(terminal => neutralTerminals.includes(terminal.id) ? { ...terminal, label: "N" } : terminal);
    const voltageRating = poleCode === 1 ? "230/400 VAC" : poleCode === 5 ? "230 VAC" : "400 VAC";
    return orderRows.filter(row => row.poleCodes.includes(poleCode)).flatMap(({ curve, suffix, currentCodes }) =>
      currentCodes.split(" ").map((currentCode): ElectricalComponentDefinition => {
        const orderCode = family + poleCode + currentCode + "-" + suffix;
        const ratedCurrentA = specialCurrentCodes[currentCode] ?? Number(currentCode);
        return {
          id: "siemens." + orderCode.toLowerCase(),
          name: "Siemens " + orderCode + " · SENTRON " + family,
          category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + (switchedNeutral ? "pn" : "p"),
          description: "SENTRON " + family + " miniature circuit breaker with " + protectedPoles + " protected pole(s)" + (switchedNeutral ? " and a switched neutral." : "."),
          terminals: labeledTerminals,
          manufacturerRecord: {
            manufacturer: "Siemens", series: "SENTRON " + family, orderCode, sourceUrl: catalogue, terminalMap: "verified",
            documentRevision: "Siemens LV 10 (10/2022), " + family + " selection tables and circuit diagrams",
            topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles, neutralTerminals },
          },
          propertiesSchema: { ratedCurrentA, curve, voltageRating, icnKa, switchedNeutral, closed: true },
          simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
          documentation: "Manual switching controls the linked contacts. The documented Icn rating applies under IEC/EN 60898-1. Overcurrent timing and protection coordination are outside simulation scope.",
          standardsReferences: ["IEC/EN 60898-1", catalogue],
        };
      }),
    );
  });
}

export const siemens5sy4Catalog = createSiemens5syCatalog("5SY4", 10, orderRows5sy4);
export const siemens5sy6Catalog = createSiemens5syCatalog("5SY6", 6, orderRows5sy6);

export const siemens5sy7Catalog = createSiemens5syCatalog("5SY7", 15, orderRows5sy7);

export const siemens5sy8Catalog = createSiemens5syCatalog("5SY8", 25, orderRows5sy8);
