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

const cdCurrents = [0.5, 1, 1.6, 2, 3, 4, 5, 6, 8, 10, 13, 15, 16, 20, 25, 30, 32, 35, 40, 50, 60, 63];
const bCurrents = [1, 2, 3, 4, 5, 6, 8, 10, 13, 15, 16, 20, 25, 30, 32, 35, 40, 50, 60, 63];
const zCurrents = new Set([0.5, 1, 1.6, 2, 3, 4, 5, 6, 8, 10, 13, 15, 16, 20, 25, 30, 32, 35, 40, 50, 60, 63]);
const orders = [
  ...bCurrents.map(ratedCurrentA => ({ ratedCurrentA, code: String(ratedCurrentA).padStart(3, "0") + "5", curve: "B" })),
  ...kOrders.filter(order => zCurrents.has(order.ratedCurrentA)).map(order => ({ ...order, code: order.code.slice(0, -1) + "8", curve: "Z" })),
  ...kOrders.map(order => ({ ...order, curve: "K" })),
  ...[{ curve: "C", suffix: "4" }, { curve: "D", suffix: "1" }].flatMap(({ curve, suffix }) => cdCurrents.map(ratedCurrentA => {
    const currentCode = ratedCurrentA === 0.5 ? "098" : ratedCurrentA === 1.6 ? "097" : String(ratedCurrentA).padStart(3, "0");
    return { ratedCurrentA, code: currentCode + suffix, curve };
  })),
];

export const abbS200mtCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  const physicalTerminals = terminals.map((terminal, index) => ({
    ...terminal,
    label: (index % 2 === 0 ? "Upper " : "Lower ") + (Math.floor(index / 2) + 1),
  }));
  return orders.map(({ ratedCurrentA, code, curve }): ElectricalComponentDefinition => {
    const orderCode = "2CDS27" + poles + "445R" + code;
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB S20" + poles + "MT-" + curve + ratedCurrentA + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + "p",
      description: "ABB S200MT miniature circuit breaker for rolling stock applications.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S200MT", orderCode, sourceUrl: datasheet, terminalMap: "verified",
        documentRevision: "ABB 9AKK108467A8295 Rev C, S200MT " + curve + " ordering tables and terminal construction",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
      },
      propertiesSchema: { ratedCurrentA, curve, closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "CAD labels identify the physical upper and lower positions of each pole. Simulation represents linked manual switching continuity.",
      standardsReferences: ["IEC/EN 60947-2", datasheet],
    };
  });
});
