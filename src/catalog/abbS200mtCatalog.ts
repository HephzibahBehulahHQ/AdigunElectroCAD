import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const datasheet = "https://library.e.abb.com/public/5b68bd3ae4c34dd6841713412734e8ff/9AKK108467A8295_Rev_C_S200MT_DE_Datenblatt_0224_72dpi.pdf";
const kOrders = [
  { ratedCurrentA: 0.2, code: "0087" },
  { ratedCurrentA: 0.3, code: "0117" },
  { ratedCurrentA: 0.5, code: "0157" },
  { ratedCurrentA: 0.75, code: "0187" },
  { ratedCurrentA: 1, code: "0217" },
  { ratedCurrentA: 1.6, code: "0257" },
  { ratedCurrentA: 2, code: "0277" },
  { ratedCurrentA: 3, code: "0317" },
  { ratedCurrentA: 4, code: "0337" },
  { ratedCurrentA: 5, code: "0357" },
  { ratedCurrentA: 6, code: "0377" },
  { ratedCurrentA: 8, code: "0407" },
  { ratedCurrentA: 10, code: "0427" },
  { ratedCurrentA: 13, code: "0447" },
  { ratedCurrentA: 15, code: "0457" },
  { ratedCurrentA: 16, code: "0467" },
  { ratedCurrentA: 20, code: "0487" },
  { ratedCurrentA: 25, code: "0517" },
  { ratedCurrentA: 30, code: "0527" },
  { ratedCurrentA: 32, code: "0537" },
  { ratedCurrentA: 35, code: "0547" },
  { ratedCurrentA: 40, code: "0557" },
  { ratedCurrentA: 50, code: "0577" },
  { ratedCurrentA: 60, code: "0587" },
  { ratedCurrentA: 63, code: "0607" },
];

export const abbS200mtCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  const physicalTerminals = terminals.map((terminal, index) => ({
    ...terminal,
    label: (index % 2 === 0 ? "Upper " : "Lower ") + (Math.floor(index / 2) + 1),
  }));
  return kOrders.map(({ ratedCurrentA, code }): ElectricalComponentDefinition => {
    const orderCode = "2CDS27" + poles + "445R" + code;
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB S20" + poles + "MT-K" + ratedCurrentA + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + "p",
      description: "ABB S200MT K-curve miniature circuit breaker for rolling stock applications.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S200MT", orderCode, sourceUrl: datasheet, terminalMap: "verified",
        documentRevision: "ABB 9AKK108467A8295 Rev C, S200MT K ordering tables and terminal construction",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
      },
      propertiesSchema: { ratedCurrentA, curve: "K", closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "CAD labels identify the physical upper and lower positions of each pole. Simulation represents linked manual switching continuity.",
      standardsReferences: ["IEC/EN 60947-2", datasheet],
    };
  });
});
