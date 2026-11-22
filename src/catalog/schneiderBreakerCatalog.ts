import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

const catalogue = "https://download.se.com/files?p_Doc_Ref=CA909006NL&p_File_Ext=.PDF";
const acti9Catalogue = "https://download.se.com/files?p_Doc_Ref=Acti9_Catalogue_2017&p_File_Ext=.pdf";
const originalCurrents = [1, 2, 3, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63];
const additionalCurrents = [0.5, 13];
const fullCurrents = [...originalCurrents, ...additionalCurrents];
const ic60nOriginal = { series: "Acti9 iC60N", icnKa: 6, sourceUrl: catalogue, documentRevision: "CA909006E v1.0 (2017-08-02), p. 9, C/D order table and terminal diagrams" };
const ic60n = { ...ic60nOriginal, sourceUrl: acti9Catalogue, documentRevision: "Acti9 v2.0 (May 2017), iC60N catalogue numbers and terminal diagrams" };
const ic60h = { series: "Acti9 iC60H", icnKa: 10, sourceUrl: acti9Catalogue, documentRevision: "Acti9 v2.0 (May 2017), p. 12, iC60H order table and terminal diagrams" };
const ic60l = {
  series: "Acti9 iC60L", icnKa: undefined, sourceUrl: acti9Catalogue,
  documentRevision: "Acti9 v2.0 (May 2017), pp. 14–15, iC60L B/C/K/Z order table; terminal diagrams in Schneider H&D Ukraine 2024",
};
const k60n = {
  series: "Acti9 K60N Biconnect", icnKa: 6, sourceUrl: acti9Catalogue,
  documentRevision: "Acti9 v2.0 (May 2017), K60N Biconnect order table and terminal diagrams",
};
const ic60lCurrents = [...originalCurrents, 0.5];
const k60nCurrents = [6, 10, 16, 20, 32, 40, 50, 63];
const orderColumns = [
  { ...ic60nOriginal, curve: "C", prefix: "A9F74", currents: originalCurrents },
  { ...ic60nOriginal, curve: "D", prefix: "A9F75", currents: originalCurrents },
  { ...ic60n, curve: "B", prefix: "A9F73", currents: fullCurrents },
  { ...ic60n, curve: "C", prefix: "A9F74", currents: additionalCurrents },
  { ...ic60n, curve: "D", prefix: "A9F75", currents: additionalCurrents },
  { ...ic60h, curve: "B", prefix: "A9F83", currents: fullCurrents },
  { ...ic60h, curve: "C", prefix: "A9F84", currents: fullCurrents },
  { ...ic60h, curve: "D", prefix: "A9F85", currents: fullCurrents },
  { ...ic60l, curve: "B", prefix: "A9F93", currents: ic60lCurrents },
  { ...ic60l, curve: "C", prefix: "A9F94", currents: ic60lCurrents },
  { ...ic60l, curve: "K", prefix: "A9F95", currents: [...ic60lCurrents, 1.6] },
  { ...ic60l, curve: "Z", prefix: "A9F92", currents: [...ic60lCurrents, 1.6] },
  { ...k60n, curve: "B", prefix: "A9K01", currents: k60nCurrents },
  { ...k60n, curve: "C", prefix: "A9K02", currents: k60nCurrents },
] as const;

const germanCatalogue = "https://download.se.com/files?p_Doc_Ref=ZXPRESI9ACTI9&p_File_name=ZXPRESI9ACTI9_062025_WEB.pdf";
// Order table columns: iC60N B/C/D, then iC60H B/C/D. Empty cells have no listed order code.
const germanOrderRows = [
  [1, 0.5, null, "A9F04170", null, null, "A9F07170", null],
  [1, 1, "A9F03101", "A9F04101", "A9F05101", null, "A9F07101", "A9F08101"],
  [1, 2, "A9F03102", "A9F04102", "A9F05102", null, "A9F07102", "A9F08102"],
  [1, 3, null, "A9F04103", null, null, "A9F07103", "A9F08103"],
  [1, 4, "A9F03104", "A9F04104", "A9F05104", null, "A9F07104", null],
  [1, 6, "A9F03106", "A9F04106", null, "A9F06106", "A9F07106", "A9F08106"],
  [1, 10, "A9F03110", "A9F04110", "A9F05110", "A9F06110", "A9F07110", "A9F08110"],
  [1, 13, "A9F03113", "A9F04113", null, "A9F06113", "A9F07113", null],
  [1, 16, "A9F03116", "A9F04116", "A9F05116", "A9F06116", "A9F07116", "A9F08116"],
  [1, 20, "A9F03120", "A9F04120", "A9F05120", "A9F06120", "A9F07120", null],
  [1, 25, "A9F03125", "A9F04125", "A9F05125", "A9F06125", "A9F07125", null],
  [1, 32, "A9F03132", "A9F04132", "A9F05132", "A9F06132", "A9F07132", "A9F08132"],
  [1, 40, "A9F03140", "A9F04140", null, "A9F06140", "A9F07140", null],
  [1, 50, "A9F03150", "A9F04150", null, null, "A9F07150", null],
  [1, 63, "A9F03163", "A9F04163", "A9F05163", null, "A9F07163", null],
  [2, 0.5, null, "A9F04270", "A9F05270", null, "A9F07270", null],
  [2, 1, null, "A9F04201", "A9F05201", null, "A9F07201", "A9F08201"],
  [2, 2, "A9F03202", "A9F04202", "A9F05202", null, "A9F07202", "A9F08202"],
  [2, 3, null, "A9F04203", "A9F05203", null, "A9F07203", "A9F08203"],
  [2, 4, "A9F03204", "A9F04204", "A9F05204", null, "A9F07204", "A9F08204"],
  [2, 6, "A9F03206", "A9F04206", "A9F05206", "A9F06206", "A9F07206", "A9F08206"],
  [2, 10, "A9F03210", "A9F04210", "A9F05210", "A9F06210", "A9F07210", "A9F08210"],
  [2, 13, "A9F03213", "A9F04213", "A9F05213", "A9F06213", "A9F07213", "A9F08213"],
  [2, 16, "A9F03216", "A9F04216", "A9F05216", "A9F06216", "A9F07216", "A9F08216"],
  [2, 20, "A9F03220", "A9F04220", "A9F05220", "A9F06220", "A9F07220", "A9F08220"],
  [2, 25, "A9F03225", "A9F04225", "A9F05225", "A9F06225", "A9F07225", null],
  [2, 32, "A9F03232", "A9F04232", null, "A9F06232", "A9F07232", "A9F08232"],
  [2, 40, "A9F03240", "A9F04240", "A9F05240", "A9F06240", "A9F07240", null],
  [2, 50, "A9F03250", "A9F04250", null, "A9F06250", "A9F07250", null],
  [2, 63, "A9F03263", "A9F04263", "A9F05263", "A9F06263", "A9F07263", null],
  [3, 0.5, null, "A9F04370", null, null, "A9F07370", null],
  [3, 1, null, "A9F04301", "A9F05301", null, "A9F07301", null],
  [3, 2, "A9F03302", "A9F04302", "A9F05302", null, "A9F07302", null],
  [3, 3, null, "A9F04303", null, null, "A9F07303", null],
  [3, 4, null, "A9F04304", null, null, "A9F07304", "A9F08304"],
  [3, 6, "A9F03306", "A9F04306", "A9F05306", "A9F06306", "A9F07306", "A9F08306"],
  [3, 10, "A9F03310", "A9F04310", "A9F05310", "A9F06310", "A9F07310", "A9F08310"],
  [3, 13, "A9F03313", "A9F04313", null, "A9F06313", "A9F07313", "A9F08313"],
  [3, 16, "A9F03316", "A9F04316", "A9F05316", "A9F06316", "A9F07316", "A9F08316"],
  [3, 20, "A9F03320", "A9F04320", "A9F05320", "A9F06320", "A9F07320", "A9F08320"],
  [3, 25, "A9F03325", "A9F04325", "A9F05325", "A9F06325", "A9F07325", "A9F08325"],
  [3, 32, "A9F03332", "A9F04332", "A9F05332", "A9F06332", "A9F07332", "A9F08332"],
  [3, 40, "A9F03340", "A9F04340", "A9F05340", "A9F06340", "A9F07340", "A9F08340"],
  [3, 50, "A9F03350", "A9F04350", "A9F05350", "A9F06350", "A9F07350", "A9F08350"],
  [3, 63, "A9F03363", "A9F04363", "A9F05363", "A9F06363", "A9F07363", "A9F08363"],
] as const;
const germanColumns = [
  { ...ic60n, curve: "B" }, { ...ic60n, curve: "C" }, { ...ic60n, curve: "D" },
  { ...ic60h, curve: "B" }, { ...ic60h, curve: "C" }, { ...ic60h, curve: "D" },
] as const;

const maCurrents = [[1.6, "72"], [2.5, "73"], [4, "04"], [6.3, "76"], [10, "10"], [12.5, "82"], [16, "16"], [25, "25"], [40, "40"]] as const;
const c120nRows = [
  [1, 63, [40, 56, 78]], [1, 80, [41, 57, 79]], [1, 100, [42, 58, 80]], [1, 125, [43, 59, 81]],
  [2, 63, [44, 60, 82]], [2, 80, [45, 61, 83]], [2, 100, [46, 62, 84]], [2, 125, [47, 63, 85]],
  [3, 63, [48, 64, 86]], [3, 80, [49, 65, 87]], [3, 100, [50, 67, 88]], [3, 125, [51, 69, 89]],
  [4, 63, [52, 71, 90]], [4, 80, [53, 72, 91]], [4, 100, [54, 74, 92]], [4, 125, [55, 76, 93]],
] as const;
const c120nFrenchVariants = [[80, 73], [100, 75], [125, 77]] as const;

export const schneiderBreakerCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const branches = Array.from({ length: poles }, (_, index) => ["l" + (index + 1) + "-in", "l" + (index + 1) + "-out"]);
  const terminals = branches.flatMap(([line, load], index): TerminalDefinition[] => {
    const x = (index - (poles - 1) / 2) * 24;
    return [
      { id: line, label: String(index * 2 + 1), kind: "power", direction: "bidirectional", position: { x, y: -27, vertical: true } },
      { id: load, label: String(index * 2 + 2), kind: "power", direction: "bidirectional", position: { x, y: 27, vertical: true } },
    ];
  });
  const internationalParts = orderColumns.flatMap(({ prefix, currents, ...column }) =>
    currents.map(ratedCurrentA => ({
      ...column, ratedCurrentA,
      orderCode: prefix + poles + (ratedCurrentA === 0.5 ? "70" : ratedCurrentA === 1.6 ? "72" : String(ratedCurrentA).padStart(2, "0")),
    })),
  );
  const germanParts = germanOrderRows.filter(([poleCount]) => poleCount === poles).flatMap(([, ratedCurrentA, ...codes]) =>
    codes.flatMap((orderCode, index) => orderCode === null ? [] : [{
      ...germanColumns[index], orderCode, ratedCurrentA,
      sourceUrl: germanCatalogue,
      documentRevision: "ZXPRESI9ACTI9 (June 2025), iC60 order table; terminal numbering in Acti9 v2.0 (May 2017)",
    }]),
  );
  const maParts = poles === 2 || poles === 3 ? maCurrents.map(([ratedCurrentA, suffix]) => ({
    ...ic60l, curve: "MA", ratedCurrentA, orderCode: "A9F90" + poles + suffix,
    documentRevision: "Acti9 v2.0 (May 2017), iC60L MA order table and terminal diagrams DB12830/DB12831",
  })) : [];
  const c120n = {
    series: "Acti9 C120N", icnKa: undefined, sourceUrl: acti9Catalogue,
    documentRevision: "Acti9 v2.0 (May 2017), C120N order tables and terminal diagrams",
  };
  const c120nParts = c120nRows.filter(([poleCount]) => poleCount === poles).flatMap(([, ratedCurrentA, codes]) =>
    codes.map((suffix, index) => ({ ...c120n, ratedCurrentA, curve: ["B", "C", "D"][index], orderCode: "A9N183" + suffix })),
  );
  const frenchParts = poles === 4 ? c120nFrenchVariants.map(([ratedCurrentA, suffix]) => ({
    ...c120n, ratedCurrentA, curve: "C", orderCode: "A9N183" + suffix,
    documentRevision: c120n.documentRevision + " (France-only order code)",
  })) : [];
  return [...internationalParts, ...germanParts, ...maParts, ...c120nParts, ...frenchParts].map(({ curve, orderCode, ratedCurrentA, series, icnKa, sourceUrl, documentRevision }): ElectricalComponentDefinition => {
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
      propertiesSchema: { ratedCurrentA, curve, closed: true, ...(icnKa === undefined ? {} : { icnKa }) },
      simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
      documentation: "The manual Closed setting switches all documented poles together. No instantaneous trip, time-current curve, fault-current interruption or protection coordination is simulated." + (icnKa === undefined ? " Refer to the manufacturer table for voltage-dependent breaking capacities and approvals." : " Icn is specified at 230 V phase-neutral or 400 V phase-phase as applicable under IEC/EN 60898-1."),
      standardsReferences: [...(icnKa === undefined ? [] : ["IEC/EN 60898-1"]), ...(series === k60n.series ? [] : ["IEC/EN 60947-2"]), sourceUrl, ...(series === ic60l.series && curve !== "MA" ? ["https://download.se.com/files?p_Doc_Ref=UAM-HDOFFERCAT-HK&p_enDocType=Catalog"] : []), ...(sourceUrl === germanCatalogue ? [acti9Catalogue] : [])],
    };
  });
});
