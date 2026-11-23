import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/eae49ddf63fe4ee69ee9f8f5fa0f93dd/A_ELSB_Cat_2022_06_Command%20and%20signaling.pdf";

export const abbSd200Catalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  const physicalTerminals = terminals.map((terminal, index) => ({
    ...terminal,
    label: (index % 2 === 0 ? "Upper " : "Lower ") + (Math.floor(index / 2) + 1),
  }));
  return [16, 25, 32, 40, 50, 63].map((ratedCurrentA): ElectricalComponentDefinition => {
    const orderCode = "2CDD28" + poles + "101R" + String(ratedCurrentA).padStart(4, "0");
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB SD20" + poles + "/" + ratedCurrentA + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "switch-disconnector-" + poles + "p",
      description: "ABB SD200 switch-disconnector with cylinder-lift terminals.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "SD200", orderCode, sourceUrl: catalogue, terminalMap: "verified",
        documentRevision: "ABB Electrical Installation Solutions 2022, SD200 ordering and terminal construction",
        topology: { type: "mechanically-linked-disconnector", closed: branches, open: [] },
      },
      propertiesSchema: { ratedCurrentA, acVoltageRating: poles === 1 ? "253 VAC" : "440 VAC", closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "Each CAD anchor represents one upper or lower cylinder-lift terminal. The openings on each terminal share its electrical connection. Simulation models manual continuity.",
      standardsReferences: ["IEC/EN 60947-3", catalogue],
    };
  });
});
