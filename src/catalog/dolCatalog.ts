import type { ElectricalComponentDefinition } from "../types/electrical";

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
    propertiesSchema: { ratedCurrentA: 18, poles: 3 }, simulationModelId: "breaker-3p-v1", simulationSupport: "control-logic", documentation: "Open/close state is modelled; time-current coordination is not.", standardsReferences: ["IEC 60947-2"]
  },
  {
    id: "contactor.three-pole", name: "Three-pole contactor", category: "Contactors & Starters", referencePrefix: "KM", description: "Three main contacts, 230 V control coil and one normally-open holding auxiliary contact.", symbolId: "contactor-3p",
    terminals: terminals(terminal("l1-in", "1/L1", "power"), terminal("l2-in", "3/L2", "power"), terminal("l3-in", "5/L3", "power"), terminal("l1-out", "2/T1", "power"), terminal("l2-out", "4/T2", "power"), terminal("l3-out", "6/T3", "power"), terminal("a1", "A1", "control"), terminal("a2", "A2", "control"), terminal("aux-13", "13", "control"), terminal("aux-14", "14", "control")),
    propertiesSchema: { coilVoltageV: 230, ratedCurrentA: 18, auxiliaryContacts: "1 NO" }, simulationModelId: "contactor-dol-v1", simulationSupport: "control-logic", documentation: "Coil drives main and holding contacts in the DOL model.", standardsReferences: ["IEC 60947-4-1"]
  },
  {
    id: "overload.thermal", name: "Three-phase thermal overload relay", category: "Protection Devices", referencePrefix: "F", description: "Thermal overload with an NC 95–96 control contact.", symbolId: "overload-3p",
    terminals: terminals(terminal("l1-in", "L1", "power"), terminal("l2-in", "L2", "power"), terminal("l3-in", "L3", "power"), terminal("t1", "T1", "power"), terminal("t2", "T2", "power"), terminal("t3", "T3", "power"), terminal("aux-95", "95", "control"), terminal("aux-96", "96", "control")),
    propertiesSchema: { settingA: 12.5, tripClass: 10, resetMode: "manual" }, simulationModelId: "thermal-overload-dol-v1", simulationSupport: "control-logic", documentation: "Manual trip/reset state is modelled in this increment.", standardsReferences: ["IEC 60947-4-1"]
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
    propertiesSchema: { contactType: "NC", momentary: true }, simulationModelId: "pushbutton-stop-v1", simulationSupport: "control-logic", documentation: "Opening STOP interrupts the contactor coil path.", standardsReferences: ["IEC 60947-5-1"]
  },
  {
    id: "pushbutton.start-no", name: "START pushbutton (NO)", category: "Switches & Pushbuttons", referencePrefix: "S", description: "Momentary normally-open START contact.", symbolId: "pushbutton-no", terminals: terminals(terminal("13", "13", "control"), terminal("14", "14", "control")),
    propertiesSchema: { contactType: "NO", momentary: true }, simulationModelId: "pushbutton-start-v1", simulationSupport: "control-logic", documentation: "Closing START energizes the contactor coil when the control path is healthy.", standardsReferences: ["IEC 60947-5-1"]
  }
];

export const catalogById = new Map(dolCatalog.map((definition) => [definition.id, definition]));
