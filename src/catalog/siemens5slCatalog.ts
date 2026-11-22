import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://cache.industry.siemens.com/dl/files/638/109750638/att_1134477/v1/03_MiniatureCircuitBreakers_LV10_102022_EN_202303231210577774.pdf";
const terminalDiagrams = "https://cache.industry.siemens.com/dl/files/094/82454094/att_28639/v1/04_pi_5sl4miniaturecircuitbreakers_en_3125.pdf";
const poleVariants = [
  { code: 1, protectedPoles: 1, switchedNeutral: false, voltageRating: "230/400 VAC" },
  { code: 2, protectedPoles: 2, switchedNeutral: false, voltageRating: "400 VAC" },
  { code: 3, protectedPoles: 3, switchedNeutral: false, voltageRating: "400 VAC" },
  { code: 4, protectedPoles: 4, switchedNeutral: false, voltageRating: "400 VAC" },
  { code: 5, protectedPoles: 1, switchedNeutral: true, voltageRating: "230 VAC" },
  { code: 6, protectedPoles: 3, switchedNeutral: true, voltageRating: "400 VAC" },
] as const;
const standardCurrents = [1, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const wholeAmpOrderRows = standardCurrents.map(ratedCurrentA => ({
  ratedCurrentA, code: String(ratedCurrentA).padStart(2, "0"), curves: ["B", "C", "D"] as const,
}));
const fractionalOrderRows = [
  { ratedCurrentA: 0.3, code: "14", curves: ["C", "D"] },
  { ratedCurrentA: 0.5, code: "05", curves: ["C", "D"] },
  { ratedCurrentA: 1.6, code: "15", curves: ["C", "D"] },
] as const;
const curveCodes = { B: 6, C: 7, D: 8 } as const;

const bCurve5sl6Currents = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];

function sentronBreakerCatalog(family: "5SL4" | "5SL6", icnKa: number, diagrams: string): ElectricalComponentDefinition[] {
  return poleVariants.flatMap(variant => {
    const { protectedPoles, switchedNeutral, voltageRating } = variant;
    const poles = protectedPoles + Number(switchedNeutral);
    const { branches, terminals } = numberedBreakerPoles(poles);
    const neutralTerminals = switchedNeutral ? branches.at(-1)! : [];
    const labeledTerminals = terminals.map(terminal => neutralTerminals.includes(terminal.id) ? { ...terminal, label: "N" } : terminal);
    return [...wholeAmpOrderRows, ...fractionalOrderRows].flatMap(({ ratedCurrentA, code, curves }) =>
      curves.filter(curve => family === "5SL4" || curve === "C" || (curve === "B" && (
        bCurve5sl6Currents.includes(ratedCurrentA) || (variant.code === 1 && (ratedCurrentA === 2 || ratedCurrentA === 4))
      ))).map((curve): ElectricalComponentDefinition => {
        const orderCode = family + variant.code + code + "-" + curveCodes[curve];
        return {
          id: "siemens." + orderCode.toLowerCase(),
          name: "Siemens " + orderCode + " · SENTRON " + family,
          category: "Protection Devices", referencePrefix: "Q",
          symbolId: "breaker-acti9-" + poles + (switchedNeutral ? "pn" : "p"),
          description: "SENTRON miniature circuit breaker with " + protectedPoles + " protected pole(s)" + (switchedNeutral ? " and a switched neutral." : "."),
          terminals: labeledTerminals,
          manufacturerRecord: {
            manufacturer: "Siemens", series: "SENTRON " + family, orderCode, sourceUrl: catalogue, terminalMap: "verified",
            documentRevision: "Siemens LV 10 (10/2022), " + family + " selection and ordering tables and circuit-symbol diagrams",
            topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles, neutralTerminals },
          },
          propertiesSchema: { ratedCurrentA, curve, voltageRating, icnKa, switchedNeutral, closed: true },
          simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
          documentation: "Manual switching opens and closes the mechanically linked contacts. The published IEC/EN 60898-1 Icn applies at the specified AC voltage. Overcurrent tripping and protection coordination are outside simulation scope.",
          standardsReferences: ["IEC/EN 60898-1", ...new Set([catalogue, diagrams])],
        };
      }),
    );
  });
}

export const siemens5sl4Catalog = sentronBreakerCatalog("5SL4", 10, terminalDiagrams);
export const siemens5sl6Catalog = sentronBreakerCatalog("5SL6", 6, catalogue);
