import { abbS800bCatalog, abbS800cCatalog, abbS800hvCatalog, abbS800nCatalog, abbS800sCatalog, abbS800uCatalog } from "./abbS800Catalog";
import { abbS200mCatalog, abbS200Catalog, abbS200pCatalog, abbS200NeutralCatalog, abbS200mUcCatalog } from "./abbS200Catalog";
import { siemens5sp4Catalog } from "./siemens5sp4Catalog";
import { siemens5sy4Catalog, siemens5sy6Catalog, siemens5sy7Catalog, siemens5sy8Catalog, siemens5sy5Catalog } from "./siemens5syCatalog";
import { siemens5sl4Catalog, siemens5sl6Catalog, siemens5sl3Catalog } from "./siemens5slCatalog";
import { eatonFaz6Catalog } from "./eatonFaz6Catalog";
import { eatonFaztCatalog } from "./eatonFaztCatalog";
import { eatonFazCatalog, eatonFazNaCatalog, eatonFazNaDcCatalog, eatonFazRtDcCatalog, eatonFazNeutralCatalog } from "./eatonFazCatalog";
import { schneiderBreakerCatalog } from "./schneiderBreakerCatalog";
import { festoValveCatalog } from "./festoValveCatalog";
import { omronEncoderCatalog } from "./omronEncoderCatalog";
import { hbkLoadCellCatalog } from "./hbkLoadCellCatalog";
import type { ElectricalComponentDefinition } from "../types/electrical";

const railGuide = "https://assets.phoenixcontact.com/file/d093f1e3-03b5-4032-b8ba-582ffacd83e8/media/original/US_Shop-Floor-Productivity-FA-brochure_20230705_1282861-01.pdf";
const railCatalog = "https://www.phoenixcontact.com/assets/17253072-b386-4c6d-8e5f-446f1ee8c43a/index.html";
const galvanized = "Galvanized steel";
const phoenixRails = [
  ["0801733", 7.5, 2000, true, galvanized, railGuide],
  ["0801681", 7.5, 2000, false, galvanized, railGuide],
  ["1201730", 15, 2000, true, galvanized, railGuide],
  ["1201714", 15, 2000, false, galvanized, railGuide],
  ["0814681", 7.5, 2000, true, "Aluminum", railGuide],
  ["0801704", 7.5, 2000, false, "Aluminum", railGuide],
  ["1207663", 15, 1000, false, "Aluminum", railGuide],
  ["1201756", 15, 2000, false, "Aluminum", railGuide],
  ["0801762", 7.5, 2000, false, "Copper", railGuide],
  ["1201895", 15, 2000, false, "Copper", railGuide],
  ["1207679", 15, 755, true, galvanized, railCatalog],
  ["1207682", 15, 955, true, galvanized, railCatalog],
  ["1207658", 15, 1000, true, galvanized, railCatalog],
  ["1207695", 15, 1155, true, galvanized, railCatalog],
  ["1207655", 15, 1000, false, galvanized, railCatalog],
] as const;
const originalProductPages = {
  "0801733": "din-rail-ns-35-75-perf-2000mm-0801733",
  "0801681": "din-rail-ns-35-75-unperf-2000mm-0801681",
  "1201730": "din-rail-perforated-ns-35-15-perf-2000mm-1201730",
  "1201714": "din-rail-ns-3515-unperf-2000mm-1201714",
} as const;

export const physicalComponentCatalog: ElectricalComponentDefinition[] = [
  ...hbkLoadCellCatalog,
  ...omronEncoderCatalog,
  ...festoValveCatalog,
  ...schneiderBreakerCatalog,
  ...eatonFazCatalog,
  ...eatonFazNaCatalog,
  ...eatonFazNaDcCatalog,
  ...eatonFazRtDcCatalog,
  ...eatonFazNeutralCatalog,
  ...eatonFaztCatalog,
  ...eatonFaz6Catalog,
  ...siemens5sl4Catalog,
  ...siemens5sl6Catalog,
  ...siemens5sl3Catalog,
  ...siemens5sy4Catalog,
  ...siemens5sy6Catalog,
  ...siemens5sy7Catalog,
  ...siemens5sy8Catalog,
  ...siemens5sy5Catalog,
  ...siemens5sp4Catalog,
  ...abbS200mCatalog,
  ...abbS200Catalog,
  ...abbS200pCatalog,
  ...abbS200NeutralCatalog,
  ...abbS200mUcCatalog,
  ...abbS800sCatalog,
  ...abbS800nCatalog,
  ...abbS800cCatalog,
  ...abbS800bCatalog,
  ...abbS800hvCatalog,
  ...abbS800uCatalog,
  ...phoenixRails.map(([orderCode, depthMm, stockLengthMm, perforated, material, reference]): ElectricalComponentDefinition => {
    const slug = originalProductPages[orderCode as keyof typeof originalProductPages];
    const sourceUrl = slug ? "https://www.phoenixcontact.com/en-pc/products/" + slug : reference;
    return {
      id: "phoenix-contact.din-rail." + orderCode,
      name: "Phoenix Contact " + orderCode + " · NS 35/" + depthMm + (perforated ? " perforated" : " solid"),
      category: "Distribution & Panel Hardware", referencePrefix: "DR", symbolId: "panel-din-rail",
      description: material + " top-hat mounting rail with 35 mm width and " + stockLengthMm + " mm stock length.",
      manufacturerRecord: { manufacturer: "Phoenix Contact", series: "NS 35", orderCode, sourceUrl, terminalMap: "none-mechanical",
        documentRevision: reference === railCatalog ? "2026 Cabinet accessories, DIN rail order table, p. 53" : "2023 Shop Floor Productivity, DIN rail selection, p. 35" },
      terminals: [],
      propertiesSchema: { widthMm: 35, depthMm, stockLengthMm, cutLengthMm: stockLengthMm, perforated, material },
      simulationModelId: "none", simulationSupport: "symbol-only",
      documentation: "Mechanical mounting hardware. Select a separate, documented terminal or bonding accessory for any electrical connection. The drawing mark represents the rail type. The cut-length property records the intended installation length.",
      standardsReferences: ["EN 60715 profile reference", ...new Set([sourceUrl, reference])],
    };
  }),
  {
    id: "panel.cable-tray-mechanical", name: "Cable tray / trunking", category: "Wiring & Cables", referencePrefix: "CT",
    symbolId: "cable-tray", description: "Editable mechanical cable-routing hardware without device terminals.",
    terminals: [], propertiesSchema: { lengthMm: 1000, widthMm: 100, depthMm: 50 },
    simulationModelId: "none", simulationSupport: "symbol-only",
    documentation: "Generic mechanical tray. Enter dimensions from the selected installation product. No cable fill or bonding simulation is assigned.",
    standardsReferences: ["IEC 61537"],
  },
  {
    id: "sensor.thermocouple-type-k", name: "Type K thermocouple · two leads", category: "Advanced Sensors & Instrumentation", referencePrefix: "B",
    symbolId: "sensor-thermocouple-two-lead", description: "Passive two-lead Type K probe. The simulation reports differential open-circuit EMF.",
    terminals: [
      { id: "common", label: "K−", kind: "control", direction: "bidirectional" },
      { id: "signal", label: "K+", kind: "control", direction: "output" },
    ],
    propertiesSchema: { temperatureC: 20, referenceJunctionC: 0 },
    simulationModelId: "sensor-thermocouple", simulationSupport: "numerical",
    documentation: "The signal connection carries differential K+/K− EMF in the simulator. K− is a physical drafting terminal. Loop continuity, lead impedance and instrument input loading are outside this model.",
    standardsReferences: ["IEC 60584", "https://srdata.nist.gov/its90/main/"],
  },
];
