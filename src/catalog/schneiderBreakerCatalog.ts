import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

const catalogue = "https://download.se.com/files?p_Doc_Ref=CA909006NL&p_File_Ext=.PDF";
const currents = [1, 2, 3, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63];
const orderColumns = [{ curve: "C", prefix: "A9F74" }, { curve: "D", prefix: "A9F75" }] as const;

export const schneiderBreakerCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const branches = Array.from({ length: poles }, (_, index) => ["l" + (index + 1) + "-in", "l" + (index + 1) + "-out"]);
  const terminals = branches.flatMap(([line, load], index): TerminalDefinition[] => {
    const x = (index - (poles - 1) / 2) * 24;
    return [
      { id: line, label: String(index * 2 + 1), kind: "power", direction: "bidirectional", position: { x, y: -27, vertical: true } },
      { id: load, label: String(index * 2 + 2), kind: "power", direction: "bidirectional", position: { x, y: 27, vertical: true } },
    ];
  });
  return orderColumns.flatMap(({ curve, prefix }) => currents.map((ratedCurrentA): ElectricalComponentDefinition => {
    const orderCode = prefix + poles + String(ratedCurrentA).padStart(2, "0");
    return {
      id: "schneider.acti9." + orderCode.toLowerCase(), name: "Schneider Electric " + orderCode + " · iC60N " + poles + "P " + curve + ratedCurrentA,
      category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + "p",
      description: "Acti9 iC60N miniature breaker with " + poles + " mechanically linked, electrically separate switched poles.",
      terminals,
      manufacturerRecord: {
        manufacturer: "Schneider Electric", series: "Acti9 iC60N", orderCode, sourceUrl: catalogue, terminalMap: "verified",
        documentRevision: "CA909006E v1.0 (2017-08-02), p. 9, C/D order table and terminal diagrams",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], auxiliaryInstalled: false },
      },
      propertiesSchema: { ratedCurrentA, curve, closed: true, icnKa: 6 },
      simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
      documentation: "The manual Closed setting switches all documented poles together. No instantaneous trip, time-current curve, fault-current interruption or protection coordination is simulated. The 6 kA property is the published IEC/EN 60898-1 Icn at 230 V phase-neutral or 400 V phase-phase as applicable.",
      standardsReferences: ["IEC/EN 60898-1", "IEC/EN 60947-2", catalogue],
    };
  }));
});
