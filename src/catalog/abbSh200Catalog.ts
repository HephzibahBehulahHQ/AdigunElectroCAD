import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/77f52e04788f48178b16e42387d989fb/9AKK107991A9809_en_F_Compact%20Home%20Catalogue%202026%20%28PDF%29%20_EN_.pdf";
const wiring = "https://library.e.abb.com/public/d751eb4df7cdb9d5c1256f5000348ca4/2CSC400003B0201.pdf";
const configurations = [
  ...[1, 2, 3, 4].map(protectedPoles => ({ protectedPoles, switchedNeutral: false })),
  ...[1, 3].map(protectedPoles => ({ protectedPoles, switchedNeutral: true })),
];
const curves = [
  { curve: "B", suffix: "5", currents: [6, 10, 13, 16, 20, 25, 32, 40, 50, 63] },
  { curve: "C", suffix: "4", currents: [0.5, 1, 1.6, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63] },
];

export const abbSh200lCatalog: ElectricalComponentDefinition[] = configurations.flatMap(({ protectedPoles, switchedNeutral }) => {
  const poles = protectedPoles + Number(switchedNeutral);
  const { branches, terminals } = numberedBreakerPoles(poles);
  const neutralTerminals = switchedNeutral ? branches.at(-1)! : [];
  const physicalTerminals = terminals.map(terminal =>
    neutralTerminals.includes(terminal.id) ? { ...terminal, label: terminal.label + "N" } : terminal,
  );
  return curves.flatMap(({ curve, suffix, currents }) => currents.map((ratedCurrentA): ElectricalComponentDefinition => {
    const currentCode = ratedCurrentA === 0.5 ? "098" : ratedCurrentA === 1.6 ? "097" : String(ratedCurrentA).padStart(3, "0");
    const orderCode = "2CDS24" + protectedPoles + (switchedNeutral ? "103R" : "001R") + currentCode + suffix;
    const model = "SH20" + protectedPoles + "L-" + curve + ratedCurrentA + (switchedNeutral ? "NA" : "");
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB " + model + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + (switchedNeutral ? "pn" : "p"),
      description: "ABB Compact Home SH200L miniature circuit breaker.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "SH200L", orderCode, sourceUrl: catalogue, terminalMap: "verified",
        documentRevision: "ABB Compact Home catalogue 9AKK107991A9809 Rev F, B/C ordering tables; 2CSC400003B0201 terminal diagrams",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles, ...(switchedNeutral ? { neutralTerminals } : {}) },
      },
      propertiesSchema: { ratedCurrentA, curve, icnKa: 4.5, ...(switchedNeutral ? { switchedNeutral } : {}), closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "The Closed setting controls linked contact continuity, including the switched neutral on NA variants. Protection trip curves are outside the simulation scope.",
      standardsReferences: ["IEC/EN 60898-1", catalogue, wiring],
    };
  }));
});
