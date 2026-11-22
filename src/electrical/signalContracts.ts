import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";
import type { SignalUnit } from "../simulation/functionalModels";

const numeric: SignalUnit[] = ["milliamp", "plc-raw", "ohm", "millivolt", "hertz", "acceleration", "pulse-count", "ampere", "scalar"];

const panelMeterUnits = new Map<string, SignalUnit[]>([
  ["Voltage", ["millivolt", "scalar"]],
  ["Current", ["ampere", "milliamp", "scalar"]],
  ["Frequency", ["hertz", "scalar"]],
  ["Power", ["scalar"]],
]);

export function panelMeterSignalUnits(kind: string | number | boolean | undefined): SignalUnit[] {
  return panelMeterUnits.get(String(kind)) ?? numeric;
}

export function functionalOutputTerminal(definition: ElectricalComponentDefinition): TerminalDefinition | undefined {
  const model = definition.simulationModelId;
  if (model === "catalog-selector-switch") return definition.terminals.find((terminal) => terminal.id === "14" || terminal.id === "22");
  const outputId = model === "catalog-circuit-breaker" ? "aux-closed" : model === "catalog-on-delay-timer" ? "18" : model === "catalog-interface-relay" || model === "catalog-safety-relay" ? "14" : model === "catalog-feed-through-terminal" ? "2" : model === "thermal-overload-dol-v1" ? "aux-96" : undefined;
  return definition.terminals.find((terminal) => outputId ? terminal.id === outputId : terminal.direction === "output");
}

export function functionalOutputTerminals(definition: ElectricalComponentDefinition): TerminalDefinition[] {
  if (definition.simulationModelId === "catalog-plc-digital-io") return definition.terminals.filter((terminal) => terminal.id === "out-0" || terminal.id === "out-1");
  if (definition.simulationModelId === "catalog-motor-starter") return definition.terminals.filter((terminal) => ["aux-14", "aux-22"].includes(terminal.id));
  if (definition.simulationModelId === "catalog-on-delay-timer") return definition.terminals.filter((terminal) => terminal.id === "16" || terminal.id === "18");
  if (definition.simulationModelId === "catalog-interface-relay") return definition.terminals.filter((terminal) => /^[1-3][24]$/.test(terminal.id));
  if (definition.simulationModelId === "catalog-safety-relay") return definition.terminals.filter((terminal) => ["14", "24", "34", "42"].includes(terminal.id));
  if (definition.simulationModelId === "thermal-overload-dol-v1") return definition.terminals.filter((terminal) => ["aux-96", "aux-98"].includes(terminal.id));
  const output = functionalOutputTerminal(definition);
  return output ? [output] : [];
}

/** Known simulated signal contracts; undefined leaves physical/unsupported terminals unclassified. */
export function terminalSignalUnits(definition: ElectricalComponentDefinition, terminalId: string): SignalUnit[] | undefined {
  const model = definition.simulationModelId;
  if (model === "hvac-damper") return terminalId === "in" ? ["boolean"] : terminalId === "out" ? ["scalar"] : undefined;
  if ((model === "hvac-thermostat" || model === "hvac-humidistat") && (terminalId === "in" || terminalId === "out")) return ["boolean"];
  if (model === "catalog-circuit-breaker" && terminalId === "aux-closed") return ["boolean"];
  if (["pneumatic-valve-5-2", "pneumatic-valve-3-2"].includes(model)) {
    if (terminalId === "out") return ["motion"];
    if (["in", "in-a", "in-b"].includes(terminalId)) return ["boolean"];
  }
  if (["pneumatic-cylinder-single", "pneumatic-cylinder-double"].includes(model)) {
    if (terminalId === "motion") return ["motion"];
    if (terminalId === "out") return ["scalar"];
    if (["in", "in-a", "in-b"].includes(terminalId)) return ["boolean"];
  }
  if (model === "catalog-plc-digital-io") {
    if (terminalId === "ai-0" || terminalId === "ai-1") return ["plc-raw"];
    if (["in-0", "in-1", "out-0", "out-1"].includes(terminalId)) return ["boolean"];
  }
  if (model === "signal-adc") return terminalId === "in" ? ["milliamp"] : terminalId === "out" ? ["plc-raw"] : undefined;
  if (model === "signal-dac") return terminalId === "in" ? ["plc-raw"] : terminalId === "out" ? ["milliamp"] : undefined;
  if (model === "signal-current-transmitter") return terminalId === "in" ? ["ampere"] : terminalId === "out" ? ["milliamp"] : undefined;
  if (model === "signal-resistance-transmitter") return terminalId === "in" ? ["ohm"] : terminalId === "out" ? ["milliamp"] : undefined;
  const sensors: Record<string, SignalUnit> = { "sensor-level-4-20": "milliamp", "sensor-pt100": "ohm", "sensor-thermocouple": "millivolt", "sensor-flow": "hertz", "sensor-vibration": "acceleration", "sensor-encoder": "pulse-count", "sensor-load-cell": "millivolt", "sensor-current-transformer": "ampere", "catalog-proximity-sensor": "boolean" };
  if (terminalId === "signal" && sensors[model]) return [sensors[model]];
  if (model.startsWith("logic-math-") || model.startsWith("logic-comparator-")) {
    if (["in-a", "in-b"].includes(terminalId)) return numeric;
    if (terminalId === "out") return [model.startsWith("logic-math-") ? "scalar" : "boolean"];
  }
  if (model.startsWith("logic-") && ["in", "in-a", "in-b", "out"].includes(terminalId)) return ["boolean"];
  if (["catalog-motor-starter", "catalog-interface-relay", "catalog-solenoid-actuator", "catalog-on-delay-timer"].includes(model) && terminalId === "a1") return ["boolean"];
  if ((model === "catalog-motor-starter" && ["aux-13", "aux-14", "aux-21", "aux-22"].includes(terminalId)) || (model === "catalog-on-delay-timer" && ["15", "16", "18"].includes(terminalId)) || (model === "catalog-interface-relay" && /^[1-3][124]$/.test(terminalId)) || (model === "thermal-overload-dol-v1" && ["aux-95", "aux-96", "aux-97", "aux-98"].includes(terminalId))) return ["boolean"];
  if (model === "catalog-selector-switch" && ["13", "14", "21", "22"].includes(terminalId)) return ["boolean"];
  if ((model === "catalog-safety-relay" && ["s11", "s21", "s34", "14", "24", "34", "42"].includes(terminalId)) || (model === "safety-dual-relay" && ["in-a", "in-b", "reset", "out"].includes(terminalId)) || (model === "catalog-feed-through-terminal" && ["1", "2"].includes(terminalId))) return ["boolean"];
  return undefined;
}
