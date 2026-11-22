import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

const catalogue = "https://download.se.com/files?p_Doc_Ref=CA909006NL&p_File_Ext=.PDF";
const acti9Catalogue = "https://download.se.com/files?p_Doc_Ref=Acti9_Catalogue_2017&p_File_Ext=.pdf";
const originalCurrents = [1, 2, 3, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63];
const additionalCurrents = [0.5, 13];
const fullCurrents = [...originalCurrents, ...additionalCurrents];
const ic60nOriginal = { series: "Acti9 iC60N", icnKa: 6, sourceUrl: catalogue, documentRevision: "CA909006E v1.0 (2017-08-02), p. 9, C/D order table and terminal diagrams" };
const ic60n = { ...ic60nOriginal, sourceUrl: acti9Catalogue, documentRevision: "Acti9 v2.0 (May 2017), iC60N catalogue numbers and terminal diagrams" };
const ic60h = { series: "Acti9 iC60H", icnKa: 10, sourceUrl: acti9Catalogue, documentRevision: "Acti9 v2.0 (May 2017), p. 12, iC60H order table and terminal diagrams" };
const orderColumns = [
  { ...ic60nOriginal, curve: "C", prefix: "A9F74", currents: originalCurrents },
  { ...ic60nOriginal, curve: "D", prefix: "A9F75", currents: originalCurrents },
  { ...ic60n, curve: "B", prefix: "A9F73", currents: fullCurrents },
  { ...ic60n, curve: "C", prefix: "A9F74", currents: additionalCurrents },
  { ...ic60n, curve: "D", prefix: "A9F75", currents: additionalCurrents },
  { ...ic60h, curve: "B", prefix: "A9F83", currents: fullCurrents },
  { ...ic60h, curve: "C", prefix: "A9F84", currents: fullCurrents },
  { ...ic60h, curve: "D", prefix: "A9F85", currents: fullCurrents },
] as const;

export const schneiderBreakerCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const branches = Array.from({ length: poles }, (_, index) => ["l" + (index + 1) + "-in", "l" + (index + 1) + "-out"]);
  const terminals = branches.flatMap(([line, load], index): TerminalDefinition[] => {
    const x = (index - (poles - 1) / 2) * 24;
    return [
      { id: line, label: String(index * 2 + 1), kind: "power", direction: "bidirectional", position: { x, y: -27, vertical: true } },
      { id: load, label: String(index * 2 + 2), kind: "power", direction: "bidirectional", position: { x, y: 27, vertical: true } },
    ];
  });
  return orderColumns.flatMap(({ curve, prefix, currents, series, icnKa, sourceUrl, documentRevision }) => currents.map((ratedCurrentA): ElectricalComponentDefinition => {
    const orderCode = prefix + poles + (ratedCurrentA === 0.5 ? "70" : String(ratedCurrentA).padStart(2, "0"));
    return {
      id: "schneider.acti9." + orderCode.toLowerCase(), name: "Schneider Electric " + orderCode + " · " + series.replace("Acti9 ", "") + " " + poles + "P " + curve + ratedCurrentA,
      category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + "p",
      description: series + " miniature breaker with " + poles + " mechanically linked, electrically separate switched poles.",
      terminals,
      manufacturerRecord: {
        manufacturer: "Schneider Electric", series, orderCode, sourceUrl, terminalMap: "verified",
        documentRevision,
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], auxiliaryInstalled: false },
      },
      propertiesSchema: { ratedCurrentA, curve, closed: true, icnKa },
      simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
      documentation: "The manual Closed setting switches all documented poles together. No instantaneous trip, time-current curve, fault-current interruption or protection coordination is simulated. The published breaking-capacity property uses IEC/EN 60898-1 Icn at 230 V phase-neutral or 400 V phase-phase as applicable.",
      standardsReferences: ["IEC/EN 60898-1", "IEC/EN 60947-2", sourceUrl],
    };
  }));
});
