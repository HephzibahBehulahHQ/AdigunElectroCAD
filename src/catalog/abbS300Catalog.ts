import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const datasheet = "https://library.e.abb.com/public/8284132f802a4412b3407e84125e1a81/9AKK107992A4964_Rev_H_S300P_EN_Datasheet_0325_Web.pdf";
const currents = [0.5, 1, 1.6, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const curves = [{ curve: "C", suffix: "4" }, { curve: "D", suffix: "1" }];

export const abbS300pCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  const physicalTerminals = terminals.map((terminal, index) => ({
    ...terminal,
    label: (index % 2 === 0 ? "Upper " : "Lower ") + (Math.floor(index / 2) + 1),
  }));
  return curves.flatMap(({ curve, suffix }) => currents.map((ratedCurrentA): ElectricalComponentDefinition => {
    const currentCode = ratedCurrentA === 0.5 ? "098" : ratedCurrentA === 1.6 ? "097" : String(ratedCurrentA).padStart(3, "0");
    const orderCode = "2CDS38" + poles + "001R" + currentCode + suffix;
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB S30" + poles + "P-" + curve + ratedCurrentA + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + "p",
      description: "ABB S300P miniature circuit breaker with bidirectional cylinder-lift terminals.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S300P", orderCode, sourceUrl: datasheet, terminalMap: "verified",
        documentRevision: "ABB 9AKK107992A4964 Rev H, S300P C/D ordering tables and terminal construction",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
      },
      propertiesSchema: { ratedCurrentA, curve, closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "CAD labels identify physical upper and lower terminal positions. Simulation covers manual contact continuity. Refer to the ABB voltage and breaking-capacity tables for rating selection.",
      standardsReferences: ["IEC/EN 60898-1", "IEC/EN 60947-2", datasheet],
    };
  }));
});
