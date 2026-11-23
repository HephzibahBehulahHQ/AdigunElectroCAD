import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const datasheet = "https://library.e.abb.com/public/8284132f802a4412b3407e84125e1a81/9AKK107992A4964_Rev_H_S300P_EN_Datasheet_0325_Web.pdf";
const currents = [0.5, 1, 1.6, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const curves = [{ curve: "C", suffix: "4" }, { curve: "D", suffix: "1" }];

const wiring = "https://library.e.abb.com/public/8e06b6235b5746db95d6a53ab5e7e138/9AKK108466A0382_Rev_G_S300P_DE_Datenblatt_0325_72dpi.pdf";
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
  { ratedCurrentA: 6, code: "0377" },
  { ratedCurrentA: 8, code: "0407" },
  { ratedCurrentA: 10, code: "0427" },
  { ratedCurrentA: 13, code: "0447" },
  { ratedCurrentA: 16, code: "0467" },
  { ratedCurrentA: 20, code: "0487" },
  { ratedCurrentA: 25, code: "0517" },
  { ratedCurrentA: 32, code: "0537" },
  { ratedCurrentA: 40, code: "0557" },
  { ratedCurrentA: 50, code: "0577" },
  { ratedCurrentA: 63, code: "0607" },
];
const zCurrents = new Set([0.5, 1, 1.6, 2, 3, 4, 6, 8, 10, 16, 20, 25, 32, 40, 50, 63]);
const industrialOrders = kOrders.flatMap(order => [
  { ...order, curve: "K" },
  ...(zCurrents.has(order.ratedCurrentA) ? [{ ...order, curve: "Z", code: order.code.slice(0, -1) + "8" }] : []),
]);
const cdOrders = curves.flatMap(({ curve, suffix }) => currents.map(ratedCurrentA => {
  const currentCode = ratedCurrentA === 0.5 ? "098" : ratedCurrentA === 1.6 ? "097" : String(ratedCurrentA).padStart(3, "0");
  return { curve, ratedCurrentA, code: currentCode + suffix };
}));
const poleConfigurations = [
  ...[1, 2, 3, 4].map(protectedPoles => ({ protectedPoles, switchedNeutral: false })),
  ...[1, 3].map(protectedPoles => ({ protectedPoles, switchedNeutral: true })),
];

export const abbS300pCatalog: ElectricalComponentDefinition[] = poleConfigurations.flatMap(({ protectedPoles, switchedNeutral }) => {
  const poles = protectedPoles + Number(switchedNeutral);
  const { branches, terminals } = numberedBreakerPoles(poles);
  const neutralTerminals = switchedNeutral ? branches.at(-1)! : [];
  const physicalTerminals = terminals.map(terminal =>
    neutralTerminals.includes(terminal.id) ? { ...terminal, label: terminal.label + "N" } : terminal,
  );
  const orders = [...(switchedNeutral ? [] : cdOrders), ...industrialOrders];
  return orders.map(({ curve, ratedCurrentA, code }): ElectricalComponentDefinition => {
    const orderCode = "2CDS38" + protectedPoles + (switchedNeutral ? "103R" : "001R") + code;
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB S30" + protectedPoles + "P-" + curve + ratedCurrentA + (switchedNeutral ? "NA" : "") + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + (switchedNeutral ? "pn" : "p"),
      description: "ABB S300P miniature circuit breaker with bidirectional cylinder-lift terminals.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S300P", orderCode, sourceUrl: datasheet, terminalMap: "verified",
        documentRevision: "ABB 9AKK107992A4964 Rev H, S300P ordering tables, with terminal diagrams in 9AKK108466A0382 Rev G",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles, ...(switchedNeutral ? { neutralTerminals } : {}) },
      },
      propertiesSchema: { ratedCurrentA, curve, ...(switchedNeutral ? { switchedNeutral } : {}), closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "Simulation covers manual contact continuity. Refer to the ABB voltage and breaking-capacity tables for rating selection.",
      standardsReferences: [...(curve === "K" || curve === "Z" ? [] : ["IEC/EN 60898-1"]), "IEC/EN 60947-2", datasheet, wiring],
    };
  });
});
