import type { ElectricalComponentDefinition } from "../types/electrical";
import { functionalCatalog } from "./functionalCatalog";
import { modeledCatalog } from "./modeledCatalog";
import { windingCatalog } from "./windingCatalog";
import { userSymbolCatalog } from "./userSymbolCatalog";

const terminals = (...items: ElectricalComponentDefinition["terminals"]): ElectricalComponentDefinition["terminals"] => items;
const terminal = (id: string, label: string, kind: "power" | "control" | "protective-earth", direction: "input" | "output" | "bidirectional" = "bidirectional") => ({ id, label, kind, direction });

export const dolCatalog: ElectricalComponentDefinition[] = [
  {
    id: "supply.three-phase", name: "Three-phase AC supply", category: "Power Supply", referencePrefix: "X", description: "Simplified 400 V, 50 Hz three-phase source with protective earth.", symbolId: "supply-3p",
    terminals: terminals(terminal("l1", "L1", "power", "output"), terminal("l2", "L2", "power", "output"), terminal("l3", "L3", "power", "output"), terminal("pe", "PE", "protective-earth", "output")),
    propertiesSchema: { voltageV: 400, frequencyHz: 50 }, simulationModelId: "three-phase-source-v1", simulationSupport: "numerical", documentation: "Educational balanced three-phase source model.", standardsReferences: ["IEC 60038"]
  },
  {
    id: "breaker.three-pole", name: "Three-pole circuit breaker", category: "Circuit Breakers", referencePrefix: "Q", description: "Manually operated three-pole protective switching device.", symbolId: "breaker-3p",
    terminals: terminals(terminal("l1-in", "1/L1", "power"), terminal("l2-in", "3/L2", "power"), terminal("l3-in", "5/L3", "power"), terminal("l1-out", "2/T1", "power"), terminal("l2-out", "4/T2", "power"), terminal("l3-out", "6/T3", "power")),
    propertiesSchema: { ratedCurrentA: 18, poles: 3, closed: false }, simulationModelId: "breaker-3p-v1", simulationSupport: "control-logic", documentation: "Open/close state is modelled; time-current coordination is not.", standardsReferences: ["IEC 60947-2"]
  },
  {
    id: "contactor.three-pole", name: "Three-pole contactor", category: "Contactors & Starters", referencePrefix: "KM", description: "Three main contacts, 230 V control coil and one normally-open holding auxiliary contact.", symbolId: "contactor-3p",
    terminals: terminals(terminal("l1-in", "1/L1", "power"), terminal("l2-in", "3/L2", "power"), terminal("l3-in", "5/L3", "power"), terminal("l1-out", "2/T1", "power"), terminal("l2-out", "4/T2", "power"), terminal("l3-out", "6/T3", "power"), terminal("a1", "A1", "control"), terminal("a2", "A2", "control"), terminal("aux-13", "13", "control"), terminal("aux-14", "14", "control")),
    propertiesSchema: { coilVoltageV: 230, ratedCurrentA: 18, auxiliaryContacts: "1 NO" }, simulationModelId: "contactor-dol-v1", simulationSupport: "control-logic", documentation: "Coil drives main and holding contacts in the DOL model.", standardsReferences: ["IEC 60947-4-1"]
  },
  {
    id: "overload.thermal", name: "Siemens SIRIUS 3RU2126-4AB0 · 11–16 A", category: "Protection Devices", referencePrefix: "F", description: "3-pole, Class 10 thermal overload; one NC trip contact and one NO trip indicator.", symbolId: "overload-3p",
    terminals: terminals(terminal("l1-in", "1/L1", "power"), terminal("l2-in", "3/L2", "power"), terminal("l3-in", "5/L3", "power"), terminal("t1", "2/T1", "power"), terminal("t2", "4/T2", "power"), terminal("t3", "6/T3", "power"), terminal("aux-95", "95", "control", "input"), terminal("aux-96", "96", "control", "output"), terminal("aux-97", "97", "control", "input"), terminal("aux-98", "98", "control", "output")),
    propertiesSchema: { settingA: 15.2, settingMinA: 11, settingMaxA: 16, tripClass: 10, auxiliaryNoContacts: 1, auxiliaryNcContacts: 1, tripped: false, thermalEnabled: false, overloadFactor: 1.05, heatingTimeSeconds: 60, coolingTimeSeconds: 120, resetLevel: 0.5, reset: false }, simulationModelId: "thermal-overload-dol-v1", simulationSupport: "control-logic", documentation: "Source-backed Siemens SIRIUS 3RU2126-4AB0 thermal overload relay: 3 poles, adjustable 11–16 A, Class 10, contactor mounting, 95/96 NC disconnect contact and 97/98 NO trip indicator. Siemens supplies the electrical ratings and terminal diagram. Runtime heating and trip timing remain an educational abstraction, not a certified protection curve.", standardsReferences: ["IEC 60947-4-1", "Siemens SIRIUS 3RU2126-4AB0 data sheet", "https://support.industry.siemens.com/teddatasheet/?caller=SIOS&format=pdf&language=en&mlfbs=3RU2126-4AB0"]
  },
  {
    id: "motor.three-phase", name: "Three-phase induction motor", category: "Motors", referencePrefix: "M", description: "Simplified 7.5 kW, 400 V induction-motor model with acceleration and coast-down.", symbolId: "motor-3p",
    terminals: terminals(terminal("u1", "U1", "power"), terminal("v1", "V1", "power"), terminal("w1", "W1", "power"), terminal("pe", "PE", "protective-earth")),
    propertiesSchema: { ratedPowerKw: 7.5, ratedVoltageV: 400, ratedCurrentA: 12.5, frequencyHz: 50, nominalSpeedRpm: 1440 }, simulationModelId: "induction-motor-educational-v1", simulationSupport: "numerical", documentation: "Simplified motor dynamics; not a commissioning or protection-coordination model.", standardsReferences: ["IEC 60034-1"]
  },
  {
    id: "supply.control", name: "230 V control supply", category: "Power Supply", referencePrefix: "X", description: "Simplified L/N control-supply terminals.", symbolId: "control-supply", terminals: terminals(terminal("line", "L", "control", "output"), terminal("neutral", "N", "control", "output")),
    propertiesSchema: { voltageV: 230, frequencyHz: 50 }, simulationModelId: "control-supply-v1", simulationSupport: "control-logic", documentation: "Control voltage source used by the DOL example.", standardsReferences: ["IEC 60038"]
  },
  {
    id: "pushbutton.stop-nc", name: "STOP pushbutton (NC)", category: "Switches & Pushbuttons", referencePrefix: "S", description: "Momentary normally-closed STOP contact.", symbolId: "pushbutton-nc", terminals: terminals(terminal("21", "21", "control"), terminal("22", "22", "control")),
    propertiesSchema: { contactType: "NC", momentary: true, pressed: false }, simulationModelId: "pushbutton-stop-v1", simulationSupport: "control-logic", documentation: "Opening STOP interrupts the contactor coil path.", standardsReferences: ["IEC 60947-5-1"]
  },
  {
    id: "pushbutton.start-no", name: "START pushbutton (NO)", category: "Switches & Pushbuttons", referencePrefix: "S", description: "Momentary normally-open START contact.", symbolId: "pushbutton-no", terminals: terminals(terminal("13", "13", "control"), terminal("14", "14", "control")),
    propertiesSchema: { contactType: "NO", momentary: true, pressed: false }, simulationModelId: "pushbutton-start-v1", simulationSupport: "control-logic", documentation: "Closing START energizes the contactor coil when the control path is healthy.", standardsReferences: ["IEC 60947-5-1"]
  }
];

const holdingContactor = dolCatalog.find(definition => definition.id === "contactor.three-pole")!;
export const interlockedContactor: ElectricalComponentDefinition = {
  ...holdingContactor,
  id: "contactor.three-pole-no-nc",
  name: "Three-pole contactor with NO/NC auxiliaries",
  description: "Three main contacts, 230 V coil, NO 13–14 holding and NC 21–22 electrical interlock contacts.",
  terminals: [...holdingContactor.terminals, terminal("aux-21", "21", "control"), terminal("aux-22", "22", "control")],
  propertiesSchema: { ...holdingContactor.propertiesSchema, auxiliaryContacts: "1 NO + 1 NC" },
  documentation: "Wire the opposite contactor's NC 21–22 in series with A1 to create an electrical interlock. Ideal contacts; no mechanical interlock, contact timing, pickup curve or safety certification.",
};
const sourceBackedCatalogIds = new Set([
  "iec.industrial-miniature-breaker.01", "iec.dc-control-supply.01", "iec.motor-starter.01",
  "iec.induction-motor.01", "iec.induction-motor.41", "iec.safety-relay.01",
]);
const familyProfileIds = new Map<string, ElectricalComponentDefinition>();
for (const definition of modeledCatalog) {
  const familyId = /^iec\.(.+)\.\d{2}$/.exec(definition.id)?.[1];
  if (!familyId || sourceBackedCatalogIds.has(definition.id) || familyProfileIds.has(familyId)) continue;
  familyProfileIds.set(familyId, definition);
}
// The generic induction motor must expose six winding ends for star/delta wiring.
const sixTerminalMotor = modeledCatalog.find((definition) => definition.id === "iec.induction-motor.41");
if (sixTerminalMotor) familyProfileIds.set("induction-motor", sixTerminalMotor);
const genericUnsetRatingFields = new Set([
  "nominalVoltageV", "ratedVoltageV", "ratedCurrentA", "ratedPowerKw", "nominalSpeedRpm",
  "coilVoltageV", "breakingCapacityKa", "frequencyHz", "ratedFrequencyHz",
  "inputVoltageV", "outputVoltageV", "primaryVoltageV", "secondaryVoltageV",
  "maximumFrequencyHz", "sensingDistanceMm", "scaleMaximum", "conductorAreaMm2", "strokeMm",
]);
const genericMotorUnsetFields = new Set(["powerFactor", "efficiencyPercent", "lineVoltageV", "resistanceOhm", "reactanceOhm", "polePairs"]);
export const genericComponentProfiles: ElectricalComponentDefinition[] = [...familyProfileIds].map(([familyId, source]) => ({
  ...source,
  id: `generic.iec.${familyId}`,
  name: familyId === "induction-motor" ? "Generic three-phase motor · 6 leads" : `Generic ${source.name.split(" · ")[0]}`,
  description: familyId === "induction-motor" ? "Editable three-phase motor with U1/V1/W1 and U2/V2/W2 winding ends plus PE for star/delta wiring. No manufacturer identity or nameplate rating is claimed; set and verify its properties for your design." : `Editable ${source.category.toLowerCase()} model. No manufacturer identity or nameplate rating is claimed; set and verify its properties for your design.`,
  propertiesSchema: Object.fromEntries(Object.entries(source.propertiesSchema).map(([key, value]) => [key, genericUnsetRatingFields.has(key) || (familyId === "induction-motor" && genericMotorUnsetFields.has(key)) ? 0 : value])),
  documentation: familyId === "induction-motor" ? "Generic IEC-oriented six-lead motor model, not a named manufacturer's device. Nameplate and winding values default to 0 (unset); enter verified project values before running models that require them." : `Generic IEC-oriented ${source.category.toLowerCase()} simulation abstraction. It is not a named manufacturer's device. Device ratings and operating limits default to 0 (unset); enter verified project values before dependent models run. Other values remain editable model assumptions; verify behavior for the intended application.`,
  standardsReferences: source.standardsReferences.filter((reference) => reference.startsWith("IEC ")),
}));

export const componentLibraryCatalog: ElectricalComponentDefinition[] = [
  ...dolCatalog,
  ...functionalCatalog,
  ...genericComponentProfiles,
  ...modeledCatalog.filter((definition) => sourceBackedCatalogIds.has(definition.id)),
  ...windingCatalog,
  ...userSymbolCatalog,
  interlockedContactor,
];
export const componentLibraryById = new Map(componentLibraryCatalog.map((definition) => [definition.id, definition]));
/** All current and legacy definitions remain resolvable when loading existing projects. */
export const componentCatalog: ElectricalComponentDefinition[] = [...dolCatalog, ...functionalCatalog, ...modeledCatalog, ...windingCatalog, ...userSymbolCatalog, interlockedContactor, ...genericComponentProfiles];
export const catalogById = new Map(componentCatalog.map((definition) => [definition.id, definition]));

