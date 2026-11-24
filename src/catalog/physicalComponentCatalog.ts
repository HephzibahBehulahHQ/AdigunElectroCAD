import { abbSd200Catalog } from "./abbSd200Catalog";
import { abbS200mtCatalog } from "./abbS200mtCatalog";
import { abbSn201Catalog } from "./abbSn201Catalog";
import { abbSh200Catalog, abbSh200lCatalog, abbSh200mCatalog, abbSh200tCatalog } from "./abbSh200Catalog";
import { abbS300pCatalog } from "./abbS300Catalog";
import { abbS800bCatalog, abbS800cCatalog, abbS800hvCatalog, abbS800nCatalog, abbS800pCatalog, abbS800pvSdCatalog, abbS800pvSpCatalog, abbS800sCatalog, abbS800sUcCatalog, abbS800uCatalog, abbS802pvMhCatalog, abbS804uUczCatalog } from "./abbS800Catalog";
import { abbS200mCatalog, abbS200Catalog, abbS200pCatalog, abbS200NeutralCatalog, abbS200mUcCatalog, abbS200sCatalog, abbS200mrCatalog } from "./abbS200Catalog";
import { siemens5sp4Catalog } from "./siemens5sp4Catalog";
import { siemens5sy4Catalog, siemens5sy6Catalog, siemens5sy7Catalog, siemens5sy8Catalog, siemens5sy5Catalog } from "./siemens5syCatalog";
import { siemens5sl4Catalog, siemens5sl6Catalog, siemens5sl3Catalog } from "./siemens5slCatalog";
import { eatonFaz6Catalog } from "./eatonFaz6Catalog";
import { eatonFaztCatalog } from "./eatonFaztCatalog";
import { eatonFazCatalog, eatonFazNaCatalog, eatonFazNaDcCatalog, eatonFazRtDcCatalog, eatonFazNeutralCatalog } from "./eatonFazCatalog";
import { schneiderBreakerCatalog } from "./schneiderBreakerCatalog";
import { festoValveCatalog } from "./festoValveCatalog";
import { omronEncoderCatalog } from "./omronEncoderCatalog";
import { sm1223Definition } from "./siemensSm1223";
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
  sm1223Definition,
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
  ...abbS200sCatalog,
  ...abbS200mrCatalog,
  ...abbS200mtCatalog,
  ...abbSd200Catalog,
  ...abbSh200lCatalog,
  ...abbSh200Catalog,
  ...abbSh200tCatalog,
  ...abbSh200mCatalog,
  ...abbSn201Catalog,
  ...abbS800sCatalog,
  ...abbS800nCatalog,
  ...abbS800cCatalog,
  ...abbS800bCatalog,
  ...abbS800hvCatalog,
  ...abbS800uCatalog,
  ...abbS800pCatalog,
  ...abbS800sUcCatalog,
  ...abbS800pvSdCatalog,
  ...abbS802pvMhCatalog,
  ...abbS804uUczCatalog,
  ...abbS300pCatalog,
  ...abbS800pvSpCatalog,
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
    id: "finder.38.51.7.024.0050", name: "Finder 38.51 · 24 V DC changeover relay", category: "Relays",
    referencePrefix: "K", symbolId: "relay-finder-3851", terminals: [
      { id: "a1", label: "A1", kind: "control", direction: "input" },
      { id: "a2", label: "A2", kind: "control", direction: "input" },
      { id: "11", label: "11", kind: "control", direction: "bidirectional" },
      { id: "12", label: "12", kind: "control", direction: "bidirectional" },
      { id: "14", label: "14", kind: "control", direction: "bidirectional" },
    ],
    description: "24 V DC interface relay, one 6 A changeover contact, screw terminals.",
    propertiesSchema: { coilVoltageV: 24, coilDc: true, ratedCurrentA: 6, energized: false },
    simulationModelId: "catalog-interface-relay", simulationSupport: "control-logic",
    manufacturerRecord: { manufacturer: "Finder", series: "38", orderCode: "38.51.7.024.0050",
      sourceUrl: "https://cdn.findernet.com/app/uploads/S38EN.pdf", terminalMap: "verified",
      documentRevision: "Series 38 screw-terminal interface modules and wiring diagrams" },
    documentation: "A1/A2 are the DC coil supply. Common 11 connects to 12 at rest and to 14 when energized. The switching model represents ideal contacts and coil state.",
    standardsReferences: ["https://cdn.findernet.com/app/uploads/S38EN.pdf"],
  },
  {
    id: "phoenix-contact.sacc.1662256", name: "Phoenix Contact M12 male · 1662256", category: "Wiring & Cables",
    referencePrefix: "X", symbolId: "terminal-m12-male-5", terminals: [
      { id: "1", label: "1", kind: "control", direction: "bidirectional", position: { x: -22, y: 22 } },
      { id: "2", label: "2", kind: "control", direction: "bidirectional", position: { x: 22, y: 22 } },
      { id: "3", label: "3", kind: "control", direction: "bidirectional", position: { x: 22, y: -22 } },
      { id: "4", label: "4", kind: "control", direction: "bidirectional", position: { x: -22, y: -22 } },
      { id: "5", label: "5", kind: "control", direction: "bidirectional", position: { x: 0, y: 0 } },
    ],
    description: "A-coded five-position M12 male cable connector with screw termination.",
    propertiesSchema: {}, simulationModelId: "phoenix-sacc-m12-male-5", simulationSupport: "connectivity",
    manufacturerRecord: { manufacturer: "Phoenix Contact", series: "SACC", orderCode: "1662256",
      sourceUrl: "https://www.phoenixcontact.com/en-us/products/circular-connector-cable-side-sacc-m12ms-5con-pg-7-1662256?type=pdf",
      terminalMap: "verified", documentRevision: "1662256 male mating face pin assignment, p. 5" },
    documentation: "The symbol is viewed from the male mating face, with the key at the bottom. Each contact is an independent wire endpoint. Signal roles depend on the connected equipment.",
    standardsReferences: ["https://www.phoenixcontact.com/en-us/products/circular-connector-cable-side-sacc-m12ms-5con-pg-7-1662256?type=pdf"],
  },
  {
    id: "phoenix-contact.pttb.3210567", name: "Phoenix Contact PTTB 2,5 · 3210567", category: "Terminal Blocks",
    referencePrefix: "X", symbolId: "terminal-double-level",
    description: "Double-level feed-through terminal block with an independent conductor path on each level.",
    terminals: [
      { id: "upper-left", label: "UL", kind: "control", direction: "bidirectional", position: { x: -42, y: -14 } },
      { id: "upper-right", label: "UR", kind: "control", direction: "bidirectional", position: { x: 42, y: -14 } },
      { id: "lower-left", label: "LL", kind: "control", direction: "bidirectional", position: { x: -42, y: 14 } },
      { id: "lower-right", label: "LR", kind: "control", direction: "bidirectional", position: { x: 42, y: 14 } },
    ],
    propertiesSchema: { conductorAreaMm2: 2.5 },
    simulationModelId: "phoenix-pttb-double-level", simulationSupport: "connectivity",
    manufacturerRecord: { manufacturer: "Phoenix Contact", series: "PTTB 2,5", orderCode: "3210567",
      sourceUrl: "https://www.phoenixcontact.com/en-us/products/multi-level-terminal-block-pttb-25-3210567?type=pdf",
      terminalMap: "verified", documentRevision: "3210567 circuit diagram, p. 7" },
    documentation: "UL/UR and LL/LR are drafting identifiers for the two feed-through pairs. Each pair passes control-circuit continuity independently. External jumper accessories and conductor ampacity are outside the continuity model.",
    standardsReferences: ["https://www.phoenixcontact.com/en-us/products/multi-level-terminal-block-pttb-25-3210567?type=pdf"],
  },
  {
    id: "rittal.ax.1031000", name: "Rittal AX 1031.000 enclosure", category: "Distribution & Panel Hardware",
    referencePrefix: "ENC", symbolId: "panel-enclosure", terminals: [],
    description: "Single-door sheet-steel enclosure, nominal 380 × 300 × 210 mm.",
    propertiesSchema: { widthMm: 380, heightMm: 300, depthMm: 210 },
    simulationModelId: "none", simulationSupport: "symbol-only",
    manufacturerRecord: { manufacturer: "Rittal", series: "AX", orderCode: "1031000",
      sourceUrl: "https://www.rittal.com/uk-en/products/PG20231215SCH101/PG20231512SCH301/PRO70743?variantId=1031000",
      terminalMap: "none-mechanical", documentRevision: "AX 1031.000 product data" },
    documentation: "Dimensioned front envelope of the enclosure. Instance dimensions can be edited for a custom layout. The supplied mounting plate is available as its own layout entity.",
    standardsReferences: [],
  },
  {
    id: "rittal.ax.1031000.included-plate", name: "Mounting plate supplied with Rittal AX 1031.000",
    category: "Distribution & Panel Hardware", referencePrefix: "MP", symbolId: "panel-mounting-plate", terminals: [],
    description: "Supplied mounting plate, 330 × 275 mm on the face and 2 mm thick.",
    propertiesSchema: { widthMm: 330, heightMm: 275, depthMm: 2 },
    simulationModelId: "none", simulationSupport: "symbol-only",
    documentation: "The nominal millimetre view marks the four Type 2 attachment centres, 280 × 250 mm apart. Add the cutouts required for the equipment being mounted.",
    standardsReferences: ["https://www.rittal.com/imf/none/3_7678/1114000_Technical_details_EN/"],
  },
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
