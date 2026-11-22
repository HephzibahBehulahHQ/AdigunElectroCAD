import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://cache.industry.siemens.com/dl/files/638/109750638/att_1134477/v1/03_MiniatureCircuitBreakers_LV10_102022_EN_202303231210577774.pdf";
// Current codes from the 5SY4 order tables, grouped by identical pole and curve availability.
const orderRows = [
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
const specialCurrentCodes: Record<string, number> = { "05": 0.5, "11": 5, "14": 0.3, "15": 1.6, "18": 15 };

export const siemens5sy4Catalog: ElectricalComponentDefinition[] = [1, 2, 3, 4, 5, 6].flatMap(poleCode => {
  const switchedNeutral = poleCode >= 5;
  const protectedPoles = poleCode === 5 ? 1 : poleCode === 6 ? 3 : poleCode;
  const poles = protectedPoles + Number(switchedNeutral);
  const { branches, terminals } = numberedBreakerPoles(poles);
  const neutralTerminals = switchedNeutral ? branches.at(-1)! : [];
  const labeledTerminals = terminals.map(terminal => neutralTerminals.includes(terminal.id) ? { ...terminal, label: "N" } : terminal);
  const voltageRating = poleCode === 1 ? "230/400 VAC" : poleCode === 5 ? "230 VAC" : "400 VAC";
  return orderRows.filter(row => row.poleCodes.includes(poleCode)).flatMap(({ curve, suffix, currentCodes }) =>
    currentCodes.split(" ").map((currentCode): ElectricalComponentDefinition => {
      const orderCode = "5SY4" + poleCode + currentCode + "-" + suffix;
      const ratedCurrentA = specialCurrentCodes[currentCode] ?? Number(currentCode);
      return {
        id: "siemens." + orderCode.toLowerCase(),
        name: "Siemens " + orderCode + " · SENTRON 5SY4",
        category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + (switchedNeutral ? "pn" : "p"),
        description: "SENTRON 5SY4 miniature circuit breaker with " + protectedPoles + " protected pole(s)" + (switchedNeutral ? " and a switched neutral." : "."),
        terminals: labeledTerminals,
        manufacturerRecord: {
          manufacturer: "Siemens", series: "SENTRON 5SY4", orderCode, sourceUrl: catalogue, terminalMap: "verified",
          documentRevision: "Siemens LV 10 (10/2022), 5SY4 A/B/C/D selection tables and circuit diagrams",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles, neutralTerminals },
        },
        propertiesSchema: { ratedCurrentA, curve, voltageRating, icnKa: 10, switchedNeutral, closed: true },
        simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
        documentation: "Manual switching controls the linked contacts. The documented Icn rating applies under IEC/EN 60898-1. Overcurrent timing and protection coordination are outside simulation scope.",
        standardsReferences: ["IEC/EN 60898-1", catalogue],
      };
    }),
  );
});
