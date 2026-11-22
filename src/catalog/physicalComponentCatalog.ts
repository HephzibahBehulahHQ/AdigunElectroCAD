import { hbkLoadCellCatalog } from "./hbkLoadCellCatalog";
import type { ElectricalComponentDefinition } from "../types/electrical";

const phoenixRails = [
  { orderCode: "0801733", depthMm: 7.5, perforated: true, slug: "din-rail-ns-35-75-perf-2000mm-0801733" },
  { orderCode: "0801681", depthMm: 7.5, perforated: false, slug: "din-rail-ns-35-75-unperf-2000mm-0801681" },
  { orderCode: "1201730", depthMm: 15, perforated: true, slug: "din-rail-perforated-ns-35-15-perf-2000mm-1201730" },
  { orderCode: "1201714", depthMm: 15, perforated: false, slug: "din-rail-ns-3515-unperf-2000mm-1201714" },
] as const;

export const physicalComponentCatalog: ElectricalComponentDefinition[] = [
  ...hbkLoadCellCatalog,
  ...phoenixRails.map(({ orderCode, depthMm, perforated, slug }): ElectricalComponentDefinition => {
    const sourceUrl = "https://www.phoenixcontact.com/en-pc/products/" + slug;
    return {
      id: "phoenix-contact.din-rail." + orderCode,
      name: "Phoenix Contact " + orderCode + " · NS 35/" + depthMm + (perforated ? " perforated" : " solid"),
      category: "Distribution & Panel Hardware", referencePrefix: "DR", symbolId: "panel-din-rail",
      description: "Steel top-hat mounting rail with 35 mm width and 2000 mm stock length.",
      manufacturerRecord: { manufacturer: "Phoenix Contact", series: "NS 35", orderCode, sourceUrl, terminalMap: "none-mechanical" },
      terminals: [],
      propertiesSchema: { widthMm: 35, depthMm, stockLengthMm: 2000, cutLengthMm: 2000, perforated },
      simulationModelId: "none", simulationSupport: "symbol-only",
      documentation: "Mechanical mounting hardware. Select a separate, documented terminal or bonding accessory for any electrical connection. The drawing mark represents the rail type. The cut-length property records the intended installation length.",
      standardsReferences: ["EN 60715 profile reference", sourceUrl],
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
