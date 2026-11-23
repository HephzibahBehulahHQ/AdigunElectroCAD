import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const catalogue = "https://library.e.abb.com/public/ac7ba9f0b2fe4959848cfa4f6e8a7e2e/A_ELSB_Catalogue_2024_1st_Edition%202%20_MCB.pdf?x-sign=GAskBmCQdaHJauAVoVBxsNYV0NOiSrEkkQgM8DiqnKF1A71eM0d5Rhc9Up8TNzG5";
const pCatalogue = "https://library.e.abb.com/public/e1feaf53e4b99c8ac1257e36003719a4/Modular%20DIN%20Comps%20MCB%20RCB%20Meters%20Surge%209AKK106354A1400.pdf?x-sign=7pHa0hBqL5wZ0m38PLj8xj8AceR%2BpVM%2BKDDEEa6MIZD0pFUEhqjZ1gswRe6LSwkI";
const neutralCatalogue = "https://library.e.abb.com/public/16137f14159c4d06b7465ee04e2fad92/ABB_Teil2_Kap01_Sicherungsautomaten_Stand_10-2024_72dpi.pdf?x-sign=OIml46OuukGsvkDV2xEFlWui1esiWQP001ErDiFIsfGnOLjUPohwyUJ1pd1qAHGj";
const bCurrents = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const cdCurrents = [0.5, 1, 1.6, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const orderRows = [
  { curve: "B", suffix: "5", currents: bCurrents },
  { curve: "C", suffix: "4", currents: cdCurrents },
  { curve: "D", suffix: "1", currents: cdCurrents },
];


const industrialCurrentCodes = new Map<number, string>([
  [0.5, "015"],
  [1, "021"],
  [1.6, "025"],
  [2, "027"],
  [3, "031"],
  [4, "033"],
  [6, "037"],
  [8, "040"],
  [10, "042"],
  [13, "044"],
  [16, "046"],
  [20, "048"],
  [25, "051"],
  [32, "053"],
  [40, "055"],
  [50, "057"],
  [63, "060"],
]);
const industrialOrderRows = [
  { curve: "K", suffix: "7", currents: [...industrialCurrentCodes.keys()] },
  { curve: "Z", suffix: "8", currents: [...industrialCurrentCodes.keys()].filter(current => current !== 13) },
];

const pIndustrialCatalogue = "https://library.e.abb.com/public/a10050f5f2b14d769844b45d1d3c5bf1/APPENDIX_ELSB_Cat_2022_2nd_edition_2022.pdf?x-sign=6SYsrZ9i%2Fy9NgEaXTDBsDvpOkuGFwRw%2FJRUnrx2TdCqajCBA6bwfU%2FMIB%2BvWlcB%2B";
const pOnlyCurrentCodes = new Map([[0.2, "008"], [0.3, "011"], [0.75, "018"]]);
const pIndustrialOrderRows = [
  { curve: "K", suffix: "7", currents: [...pOnlyCurrentCodes.keys(), ...industrialCurrentCodes.keys()] },
  industrialOrderRows[1],
];

function createAbbS200Catalog(series: "S200" | "S200M" | "S200P", switchedNeutral = false): ElectricalComponentDefinition[] {
  const prefix = { S200: "2CDS25", S200M: "2CDS27", S200P: "2CDS28" }[series];
  const sourceUrl = switchedNeutral ? neutralCatalogue : series === "S200P" ? pCatalogue : catalogue;
  const availableRows = series === "S200P" ? [...orderRows, ...pIndustrialOrderRows] : switchedNeutral ? orderRows.filter(row => row.curve !== "D") : [...orderRows, ...industrialOrderRows];
  return (switchedNeutral ? [1, 3] : [1, 2, 3, 4]).flatMap(protectedPoles => {
    const poles = protectedPoles + Number(switchedNeutral);
    const { branches, terminals } = numberedBreakerPoles(poles);
    const neutralTerminals = switchedNeutral ? branches.at(-1)! : [];
    const labeledTerminals = terminals.map(terminal => neutralTerminals.includes(terminal.id) ? { ...terminal, label: terminal.label + "N" } : terminal);
    return availableRows.flatMap(({ curve, suffix, currents }) => currents.filter(ratedCurrentA => series !== "S200P" || switchedNeutral || curve !== "C" || ratedCurrentA !== 13).map((ratedCurrentA): ElectricalComponentDefinition => {
      const industrialCurve = curve === "K" || curve === "Z";
      const partSource = series === "S200P" && (industrialCurve || switchedNeutral) ? pIndustrialCatalogue : sourceUrl;
      const ratingCode = industrialCurve ? (industrialCurrentCodes.get(ratedCurrentA) ?? pOnlyCurrentCodes.get(ratedCurrentA)!) : ratedCurrentA === 0.5 ? "098" : ratedCurrentA === 1.6 ? "097" : String(ratedCurrentA).padStart(3, "0");
      const orderCode = prefix + protectedPoles + (switchedNeutral ? "103R" : "001R") + ratingCode + suffix;
      const model = "S20" + protectedPoles + series.slice(4) + "-" + curve + ratedCurrentA + (switchedNeutral ? "NA" : "");
      const icnKa = series === "S200P" ? (ratedCurrentA <= 25 ? 25 : 15) : series === "S200M" ? 10 : 6;
      return {
        id: "abb." + orderCode.toLowerCase(),
        name: "ABB " + model + " · " + orderCode,
        category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + (switchedNeutral ? "pn" : "p"),
        description: "ABB System pro M compact " + series + " miniature circuit breaker, " + protectedPoles + (switchedNeutral ? "P with switched neutral." : "P."),
        terminals: labeledTerminals,
        manufacturerRecord: {
          manufacturer: "ABB", series, orderCode, sourceUrl: partSource, terminalMap: "verified",
          documentRevision: partSource === pIndustrialCatalogue ? "ABB ELSB 2022 second edition, appendix S200P " + curve + " ordering index" : switchedNeutral ? "ABB Niederspannungsprodukte Teil 2 (10/2024), B/C mit abschaltbarem Neutralleiter NA" : (series === "S200P" ? "ABB System pro M compact 9AKK106354A1400, " : "ABB Electrical Installation Solutions for Buildings 2024, ") + series + " " + curve + " ordering details and diagrams",
          topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles, ...(switchedNeutral ? { neutralTerminals } : {}) },
        },
        propertiesSchema: { ratedCurrentA, curve, ...(industrialCurve ? {} : { icnKa }), ...(switchedNeutral ? { switchedNeutral } : {}), closed: true },
        simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
        documentation: "The Closed setting controls the linked contacts. Simulation covers manual switching continuity." + (industrialCurve ? " Refer to ABB for IEC/EN 60947-2 breaking capacity at the intended voltage." : " The published Icn is the IEC/EN 60898-1 rating."),
        standardsReferences: [industrialCurve ? "IEC/EN 60947-2" : "IEC/EN 60898-1", partSource, ...(partSource === pIndustrialCatalogue ? [pCatalogue] : [])],
      };
    }));
  });
}

export const abbS200mCatalog = createAbbS200Catalog("S200M");
export const abbS200Catalog = createAbbS200Catalog("S200");

export const abbS200pCatalog = createAbbS200Catalog("S200P");

export const abbS200NeutralCatalog = [...createAbbS200Catalog("S200", true), ...createAbbS200Catalog("S200M", true), ...createAbbS200Catalog("S200P", true)];


const ucCatalogue = "https://library.e.abb.com/public/aeeea37834b7488ebd6796ebe35044d7/1SXU400144L0201_SystemProMCompactMCBS200MUC0915.pdf?x-sign=o6JGutA1UjOrQfzeFY9Pk4Sc4LqPt4kOlFl%2BbOpRk9w%2B2EetsQeOA0geBykuhteO";

const ucIndustrialOrders = [
  { curve: "K", ratedCurrentA: 0.2, code: "0087" },
  { curve: "K", ratedCurrentA: 0.3, code: "0117" },
  { curve: "K", ratedCurrentA: 0.5, code: "0157" },
  { curve: "K", ratedCurrentA: 0.75, code: "0187" },
  { curve: "K", ratedCurrentA: 1, code: "0217" },
  { curve: "K", ratedCurrentA: 1.6, code: "0257" },
  { curve: "K", ratedCurrentA: 2, code: "0277" },
  { curve: "K", ratedCurrentA: 3, code: "0317" },
  { curve: "K", ratedCurrentA: 4, code: "0337" },
  { curve: "K", ratedCurrentA: 5, code: "0357" },
  { curve: "K", ratedCurrentA: 6, code: "0377" },
  { curve: "K", ratedCurrentA: 8, code: "0407" },
  { curve: "K", ratedCurrentA: 10, code: "0427" },
  { curve: "K", ratedCurrentA: 13, code: "0447" },
  { curve: "K", ratedCurrentA: 15, code: "0457" },
  { curve: "K", ratedCurrentA: 16, code: "0467" },
  { curve: "K", ratedCurrentA: 20, code: "0487" },
  { curve: "K", ratedCurrentA: 25, code: "0517" },
  { curve: "K", ratedCurrentA: 30, code: "0527" },
  { curve: "K", ratedCurrentA: 32, code: "0537" },
  { curve: "K", ratedCurrentA: 35, code: "0547" },
  { curve: "K", ratedCurrentA: 40, code: "0557" },
  { curve: "K", ratedCurrentA: 50, code: "0577" },
  { curve: "K", ratedCurrentA: 60, code: "0587" },
  { curve: "K", ratedCurrentA: 63, code: "0607" },
  { curve: "Z", ratedCurrentA: 0.5, code: "0158" },
  { curve: "Z", ratedCurrentA: 1, code: "0218" },
  { curve: "Z", ratedCurrentA: 1.6, code: "0258" },
  { curve: "Z", ratedCurrentA: 2, code: "0278" },
  { curve: "Z", ratedCurrentA: 3, code: "0318" },
  { curve: "Z", ratedCurrentA: 4, code: "0338" },
  { curve: "Z", ratedCurrentA: 5, code: "0358" },
  { curve: "Z", ratedCurrentA: 6, code: "0378" },
  { curve: "Z", ratedCurrentA: 8, code: "0408" },
  { curve: "Z", ratedCurrentA: 10, code: "0428" },
  { curve: "Z", ratedCurrentA: 15, code: "0458" },
  { curve: "Z", ratedCurrentA: 16, code: "0468" },
  { curve: "Z", ratedCurrentA: 20, code: "0488" },
  { curve: "Z", ratedCurrentA: 25, code: "0518" },
  { curve: "Z", ratedCurrentA: 30, code: "0528" },
  { curve: "Z", ratedCurrentA: 32, code: "0538" },
  { curve: "Z", ratedCurrentA: 35, code: "0548" },
  { curve: "Z", ratedCurrentA: 40, code: "0558" },
  { curve: "Z", ratedCurrentA: 50, code: "0578" },
  { curve: "Z", ratedCurrentA: 60, code: "0588" },
  { curve: "Z", ratedCurrentA: 63, code: "0608" },
];

const ucOrders = [
  ...orderRows.filter(row => row.curve !== "D").flatMap(({ curve, suffix, currents }) => currents.map(ratedCurrentA => {
    const ratingCode = ratedCurrentA === 0.5 ? "098" : ratedCurrentA === 1.6 ? "097" : String(ratedCurrentA).padStart(3, "0");
    return { curve, ratedCurrentA, code: ratingCode + suffix };
  })),
  ...ucIndustrialOrders,
];

export const abbS200mUcCatalog: ElectricalComponentDefinition[] = [1, 2, 3, 4].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  return ucOrders.map(({ curve, ratedCurrentA, code }): ElectricalComponentDefinition => {
    const industrialCurve = curve === "K" || curve === "Z";
    const orderCode = "2CDS27" + poles + "061R" + code;
    const model = "S20" + poles + "MUC-" + curve + ratedCurrentA;
    const dcVoltageRating = poles === 1 ? "220 VDC" : "440 VDC with two poles in series";
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB " + model + " · " + orderCode,
      category: "Protection Devices", referencePrefix: "Q", symbolId: "breaker-acti9-" + poles + "p",
      description: "ABB S200 M UC miniature circuit breaker with polarized DC operation.",
      terminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S200M UC", orderCode, sourceUrl: ucCatalogue, terminalMap: "verified",
        documentRevision: "ABB 1SXU400144L0201, B/C/K/Z ordering details, technical ratings and DC connection diagrams",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], polaritySensitive: true },
      },
      propertiesSchema: {
        ratedCurrentA, curve,
        ...(industrialCurve ? {
          acVoltageRating: poles === 1 ? "253 VAC" : "440 VAC",
          dcVoltageRating,
          icuAcKa: ratedCurrentA <= 40 ? 10 : 6,
          icuDcKa: 10,
        } : {
          acVoltageRating: poles === 1 ? "230 VAC" : "400 VAC",
          ...(poles === 3 ? {} : { dcVoltageRating }),
          icnKa: 10,
        }),
        polaritySensitive: true, closed: true,
      },
      simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
      documentation: "For DC wiring, follow ABB’s polarity and series connection diagrams. ABB identifies terminal 1 as negative and terminal 3 as positive for top-fed configurations. The simulation models manual contact continuity. It omits polarity validation and trip behavior.",
      standardsReferences: industrialCurve ? ["IEC/EN 60947-2", ucCatalogue] : ["IEC/EN 60898-2", "IEC/EN 60947-2", ucCatalogue],
    };
  });
});

const s200sDatasheet = "https://library.e.abb.com/public/29e02788a76841f7823cd829b81dd35a/2CDC002137D0201.pdf";
const s200sCurves = [
  { curve: "B", suffix: "5", currents: [6, 10, 13, 16, 20] },
  { curve: "C", suffix: "4", currents: [6, 8, 10, 13, 16, 20] },
];

export const abbS200sCatalog: ElectricalComponentDefinition[] = [1, 3].flatMap(poles => {
  const { branches, terminals } = numberedBreakerPoles(poles);
  const physicalTerminals = terminals.map((terminal, index) => ({
    ...terminal,
    label: (index % 2 === 0 ? "Line " : "Load ") + (Math.floor(index / 2) + 1),
  }));
  return s200sCurves.flatMap(({ curve, suffix, currents }) => currents.map((ratedCurrentA): ElectricalComponentDefinition => {
    const code = String(ratedCurrentA).padStart(3, "0") + suffix;
    const orderCode = "2CDS25" + poles + "002R" + code;
    return {
      id: "abb." + orderCode.toLowerCase(),
      name: "ABB S20" + poles + "S-" + curve + ratedCurrentA + " · " + orderCode,
      category: "Protection Devices",
      referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + "p",
      description: "ABB S200S miniature circuit breaker with screwless load terminals.",
      terminals: physicalTerminals,
      manufacturerRecord: {
        manufacturer: "ABB", series: "S200S", orderCode, sourceUrl: s200sDatasheet, terminalMap: "verified",
        documentRevision: "ABB 2CDC002137D0201, S200S order data and screwless load-terminal construction",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles: poles },
      },
      propertiesSchema: { ratedCurrentA, curve, acVoltageRating: poles === 1 ? "230 VAC" : "400 VAC", icnKa: 6, closed: true },
      simulationModelId: "catalog-circuit-breaker",
      simulationSupport: "connectivity",
      documentation: "CAD terminal labels identify line and screwless load positions. Simulation covers manual linked switching continuity.",
      standardsReferences: ["IEC/EN 60898-1", s200sDatasheet],
    };
  }));
});
