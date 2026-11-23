import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/69d2fecb91064374b58fb8d7a769aece/2019%20v2-%20CatalogueS800.pdf";
const lowCurrents = [0.5, 1, 1.6, 2, 2.5, 3, 4, 5];
const standardCurrents = [6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
const highCurrentCodes = new Map([[100, 82], [125, 84]]);
const kCurrentCodes = new Map([
  [6, 6], [8, 40], [10, 42], [13, 44], [16, 46], [20, 48], [25, 51],
  [32, 53], [40, 55], [50, 57], [63, 59], [80, 62], [100, 63], [125, 64],
]);
const curveOrders = [
  { curve: "B", code: "5", firstLowCurrentReference: 19841, poleStride: 24 },
  { curve: "C", code: "4", firstLowCurrentReference: 19849, poleStride: 24 },
  { curve: "D", code: "1", firstLowCurrentReference: 19857, poleStride: 24 },
  { curve: "K", code: "7", firstLowCurrentReference: 19937, poleStride: 8 },
];

function createAbbS800Catalog(series: "S800S" | "S800N" | "S800C" | "S800B"): ElectricalComponentDefinition[] {
  const highPerformance = series === "S800S";
  const { prefix, icuKa, minimumCurrentA } = {
    S800S: { prefix: "2CCS86", icuKa: 50, minimumCurrentA: 6 },
    S800N: { prefix: "2CCS89", icuKa: 36, minimumCurrentA: 6 },
    S800C: { prefix: "2CCS88", icuKa: 25, minimumCurrentA: 10 },
    S800B: { prefix: "2CCS81", icuKa: 16, minimumCurrentA: 32 },
  }[series];
  const terminalStyle = series === "S800B" ? "locked cage" : "interchangeable cage";
  const availableCurves = curveOrders.filter(({ curve }) => series !== "S800N" || curve !== "K");
  const availableStandardCurrents = standardCurrents.filter(current => current >= minimumCurrentA);
  return [1, 2, 3, 4].flatMap(poles => {
    const { branches, terminals } = numberedBreakerPoles(poles);
    return availableCurves.flatMap(({ curve, code, firstLowCurrentReference, poleStride }) => {
      // ABB uses sequential 2CCF references for the eight low-current variants.
      const firstReference = firstLowCurrentReference + (poles - 1) * poleStride;
      const orders = [
        ...(highPerformance ? lowCurrents : []).map((ratedCurrentA, index) => ({
          ratedCurrentA,
          orderCode: "2CCF" + String(firstReference + index).padStart(6, "0") + "R0001",
        })),
        ...availableStandardCurrents.map(ratedCurrentA => ({
          ratedCurrentA,
          orderCode: prefix + poles + "001R" + String((curve === "K" ? kCurrentCodes : highCurrentCodes).get(ratedCurrentA) ?? ratedCurrentA).padStart(3, "0") + code,
        })),
      ];
      return orders.map(({ ratedCurrentA, orderCode }): ElectricalComponentDefinition => ({
        id: "abb." + orderCode.toLowerCase(),
        name: "ABB S80" + poles + series.slice(-1) + "-" + curve + ratedCurrentA + " · " + orderCode,
        category: "Protection Devices",
        referencePrefix: "Q",
        symbolId: "breaker-acti9-" + poles + "p",
        description: "ABB " + series + " high-performance circuit breaker with " + terminalStyle + " terminals.",
        terminals,
        manufacturerRecord: {
          manufacturer: "ABB", series, orderCode, sourceUrl: catalogue, terminalMap: "verified",
          documentRevision: "ABB S800 High Performance MCBs 2019 v2, " + series + " " + curve + " ordering tables and wiring diagrams",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
        },
        propertiesSchema: { ratedCurrentA, curve, icuKa, closed: true },
        simulationModelId: "catalog-circuit-breaker",
        simulationSupport: "connectivity",
        documentation: "The Closed setting controls linked pole continuity. Trip behavior and voltage-dependent breaking capacity are outside the simulation scope.",
        standardsReferences: ["IEC/EN 60947-2", catalogue],
      }));
    });
  });
}

export const abbS800sCatalog = createAbbS800Catalog("S800S");
export const abbS800nCatalog = createAbbS800Catalog("S800N");
export const abbS800cCatalog = createAbbS800Catalog("S800C");
export const abbS800bCatalog = createAbbS800Catalog("S800B");

const hvTechnicalCatalogue = "https://library.e.abb.com/public/59e584dd24424db88c9f54a85a4d6dfe/High%20Performance%20Circuit%20Breaker%20S800HV%20final.pdf";
const hvLowCurrentReferences = [
  [20049, 20050, 30021, 30022, 30030, 30023, 30024, 30031],
  [30025, 30026, 30032, 30027, 30028, 30033, 20063, 20064],
  [20065, 20066, 20067, 20068, 20069, 20070, 20071, 20072],
];

export const abbS800hvCatalog: ElectricalComponentDefinition[] = hvLowCurrentReferences.flatMap((references, poleIndex) => {
  const poles = poleIndex + 1;
  const { branches, terminals } = numberedBreakerPoles(poles);
  const physicalTerminals = terminals.map((terminal, index) => ({
    ...terminal,
    label: (index % 2 === 0 ? "Upper " : "Lower ") + (Math.floor(index / 2) + 1),
  }));
  const orders = [
    ...lowCurrents.map((ratedCurrentA, index) => ({ ratedCurrentA, curve: "K", reference: references[index] })),
    ...standardCurrents.map((ratedCurrentA, index) => ({ ratedCurrentA, curve: "K", reference: 19005 + poleIndex * 14 + index })),
    ...(poles === 3 ? [
      { ratedCurrentA: 10, curve: "C", reference: 19650 },
      { ratedCurrentA: 32, curve: "C", reference: 19651 },
    ] : []),
  ];
  return orders.map(({ ratedCurrentA, curve, reference }): ElectricalComponentDefinition => {
    const orderCode = "2CCF" + String(reference).padStart(6, "0") + "R0001";
    const icuKa = ratedCurrentA < 6 ? 1.5 : ratedCurrentA <= 63 ? 4 : 3;
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB S80" + poles + "HV-" + curve + ratedCurrentA + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + "p",
      description: "ABB S800HV high-voltage miniature AC circuit breaker with cage terminals.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S800HV", orderCode, sourceUrl: catalogue, terminalMap: "verified",
        documentRevision: "ABB S800 High Performance MCBs 2019 v2 and S800HV technical information 2CCC457096D0201",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
      },
      propertiesSchema: { ratedCurrentA, curve, icuKa, closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "Terminal labels identify physical top and bottom cage positions. Icu is the ABB IEC/EN 60947-2 rating for the 580/1000 VAC system. Simulation represents manual contact continuity.",
      standardsReferences: ["IEC/EN 60947-2", catalogue, hvTechnicalCatalogue],
    };
  });
});

const ulCurrentOrders = [
  { ratedCurrentA: 10, kCode: "0427", zCode: "0105" },
  { ratedCurrentA: 15, kCode: "0457", zCode: "0155" },
  { ratedCurrentA: 20, kCode: "0487", zCode: "0205" },
  { ratedCurrentA: 25, kCode: "0517", zCode: "0255" },
  { ratedCurrentA: 30, kCode: "0527", zCode: "0305" },
  { ratedCurrentA: 40, kCode: "0557", zCode: "0405" },
  { ratedCurrentA: 50, kCode: "0577", zCode: "0505" },
  { ratedCurrentA: 60, kCode: "0587", zCode: "0605" },
  { ratedCurrentA: 70, kCode: "0707", zCode: "0705" },
  { ratedCurrentA: 80, kCode: "0627", zCode: "0805" },
  { ratedCurrentA: 90, kCode: "0907", zCode: "0905" },
  { ratedCurrentA: 100, kCode: "0637", zCode: "0825" },
];

export const abbS800uCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  const prefix = poles === 1 ? "2CCS881" : "2CCS86" + poles;
  const acVoltageRating = poles === 1 ? "240 VAC" : "415 VAC";
  const icuKa = poles === 1 ? 30 : 50;
  return ulCurrentOrders.flatMap(({ ratedCurrentA, kCode, zCode }) => [
    { curve: "K", code: kCode }, { curve: "Z", code: zCode },
  ].map(({ curve, code }): ElectricalComponentDefinition => {
    const orderCode = prefix + "017R" + code;
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB S80" + poles + "U-" + curve + ratedCurrentA + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + "p",
      description: "ABB S800U circuit breaker with interchangeable cage terminals.",
      terminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S800U", orderCode, sourceUrl: catalogue, terminalMap: "verified",
        documentRevision: "ABB S800 High Performance MCBs 2019 v2, S800U K/Z ordering tables and connection diagrams",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
      },
      propertiesSchema: { ratedCurrentA, curve, acVoltageRating, icuKa, closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "Icu and the associated voltage are the IEC/EN 60947-2 values. Refer to ABB for the UL 489 ratings. Simulation represents manual contact continuity.",
      standardsReferences: ["IEC/EN 60947-2", "UL 489", catalogue],
    };
  }));
});

const s800pCatalogue = "https://library.e.abb.com/public/655482c5815b4199b154b211cb40a792/Brochure%20S800P%20-%20rev.B%202023.pdf";
const s800pOrdering = "https://cataloghi.it.abb.com/view/586642090/";

export const abbS800pCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  return ["B", "C", "D", "K"].flatMap((curve, curveIndex) => [80, 100, 125].flatMap((ratedCurrentA, currentIndex) => {
    const orderVariants = [
      { reference: 214 + curveIndex * 12 + (poles - 1) * 3 + currentIndex, terminalStyle: "cage", modelSuffix: "" },
      { reference: 262 + currentIndex * 16 + (poles - 1) * 4 + curveIndex, terminalStyle: "ring lug", modelSuffix: "-R" },
    ];
    return orderVariants.map(({ reference, terminalStyle, modelSuffix }): ElectricalComponentDefinition => {
      const orderCode = "2CCG001" + reference + "R0001";
      const model = "S80" + poles + "P-" + curve + ratedCurrentA + modelSuffix;
      return {
        id: "abb." + orderCode.toLowerCase(),
        name: "ABB " + model + " · " + orderCode,
        category: "Protection Devices",
        referencePrefix: "Q",
        symbolId: "breaker-acti9-" + poles + "p",
        description: "ABB S800P miniature circuit breaker with " + terminalStyle + " terminals.",
        terminals,
        manufacturerRecord: {
          manufacturer: "ABB", series: "S800P", orderCode, sourceUrl: s800pOrdering, terminalMap: "verified",
          documentRevision: "ABB S800P brochure rev. B 2023, ordering tables, technical data and numbered contact diagrams",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
        },
        propertiesSchema: { ratedCurrentA, curve, terminalStyle, acVoltageRating: "240/415 VAC", icuKa: 50, closed: true },
        simulationModelId: "catalog-circuit-breaker",
        simulationSupport: "connectivity",
        documentation: "Icu is the IEC/EN 60947-2 AC rating at 240/415 VAC. Refer to ABB for ratings at other voltages and DC wiring arrangements. Simulation represents manual contact continuity.",
        standardsReferences: ["IEC/EN 60947-2", s800pCatalogue, s800pOrdering],
      };
    });
  }));
});

const ucLowCurrents = [...lowCurrents, 6, 8];
const ucHighCurrents = standardCurrents.slice(2);
const ucOrders = [
  { curve: "UCB", lowReferences: [
    [19969, 19970, 19971, 19972, 19973, 19974, 19975, 19976, 19977, 19978],
    [19989, 19990, 19991, 19992, 19993, 19994, 19995, 19996, 19997, 19998],
    [30040, 30041, 30056, 30042, 30043, 30057, 30044, 30045, 30058, 20018],
    [20029, 20030, 20031, 20032, 20033, 20034, 20035, 30046, 30047, 30059],
  ], highCodes: ["1105", "1135", "1165", "1205", "1255", "1325", "1405", "1505", "1635", "1805", "1825", "1845"] },
  { curve: "UCK", lowReferences: [
    [19979, 19980, 19981, 19982, 19983, 19984, 19985, 19986, 19987, 19988],
    [19999, 30034, 30035, 30053, 30036, 30037, 30054, 30038, 30039, 30055],
    [20019, 20020, 20021, 20022, 20023, 20024, 20025, 20026, 20027, 20028],
    [30048, 30049, 30060, 30050, 30051, 30061, 30052, 30020, 30029, 20048],
  ], highCodes: ["1427", "1447", "1467", "1487", "1517", "1537", "1557", "1577", "1597", "1627", "1637", "1647"] },
];

export const abbS800sUcCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  return ucOrders.flatMap(({ curve, lowReferences, highCodes }) => {
    const orders = [
      ...ucLowCurrents.map((ratedCurrentA, index) => ({
        ratedCurrentA,
        orderCode: "2CCF" + String(lowReferences[poles - 1][index]).padStart(6, "0") + "R0001",
      })),
      ...ucHighCurrents.map((ratedCurrentA, index) => ({
        ratedCurrentA,
        orderCode: "2CCS86" + poles + "001R" + highCodes[index],
      })),
    ];
    return orders.map(({ ratedCurrentA, orderCode }): ElectricalComponentDefinition => {
      const ratedDcVoltageV = poles < 4 ? poles * 250 : ratedCurrentA < 10 ? undefined : ratedCurrentA <= 50 ? 1000 : 750;
      return {
        id: "abb." + orderCode.toLowerCase(),
        name: "ABB S80" + poles + "S-" + curve + ratedCurrentA + " · " + orderCode,
        category: "Protection Devices",
        referencePrefix: "Q",
        symbolId: "breaker-acti9-" + poles + "p",
        description: "ABB S800S-UC breaker with interchangeable cage terminals.",
        terminals,
        manufacturerRecord: {
          manufacturer: "ABB", series: "S800S-UC", orderCode, sourceUrl: catalogue, terminalMap: "verified",
          documentRevision: "ABB S800 High Performance MCBs 2019 v2, UCB/UCK ordering tables, DC ratings and terminal diagrams",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
        },
        propertiesSchema: { ratedCurrentA, curve, ...(ratedDcVoltageV === undefined ? {} : { ratedDcVoltageV, icuDcKa: 50 }), closed: true },
        simulationModelId: "catalog-circuit-breaker",
        simulationSupport: "connectivity",
        documentation: "The DC rating applies to the manufacturer’s specified pole connection and operating conditions. Refer to ABB for the wiring diagrams. Simulation represents manual contact continuity.",
        standardsReferences: ["IEC/EN 60947-2", catalogue],
      };
    });
  });
});
