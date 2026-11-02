import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";
import type { SignalUnit } from "../simulation/functionalModels";

const numeric: SignalUnit[] = ["milliamp", "plc-raw", "ohm", "millivolt", "hertz", "acceleration", "pulse-count", "ampere", "scalar"];

export function functionalOutputTerminal(definition: ElectricalComponentDefinition): TerminalDefinition | undefined {
  const model = definition.simulationModelId;
  const outputId = model === "catalog-on-delay-timer" ? "18" : model === "catalog-interface-relay" ? "14" : model === "catalog-feed-through-terminal" ? "2" : model === "thermal-overload-dol-v1" ? "aux-96" : undefined;
  return definition.terminals.find((terminal) => outputId ? terminal.id === outputId : terminal.direction === "output");
}

/** Known simulated signal contracts; undefined leaves physical/unsupported terminals unclassified. */
export function terminalSignalUnits(definition: ElectricalComponentDefinition, terminalId: string): SignalUnit[] | undefined {
  const model = definition.simulationModelId;
  if (model === "catalog-plc-digital-io") {
    if (terminalId === "ai-0") return ["plc-raw"];
    if (["in-0", "in-1", "out-0"].includes(terminalId)) return ["boolean"];
  }
  if (model === "signal-adc") return terminalId === "in" ? ["milliamp"] : terminalId === "out" ? ["plc-raw"] : undefined;
  if (model === "signal-dac") return terminalId === "in" ? ["plc-raw"] : terminalId === "out" ? ["milliamp"] : undefined;
  const sensors: Record<string, SignalUnit> = { "sensor-level-4-20": "milliamp", "sensor-pt100": "ohm", "sensor-thermocouple": "millivolt", "sensor-flow": "hertz", "sensor-vibration": "acceleration", "sensor-encoder": "pulse-count", "sensor-load-cell": "millivolt", "sensor-current-transformer": "ampere", "catalog-proximity-sensor": "boolean" };
  if (terminalId === "signal" && sensors[model]) return [sensors[model]];
  if (model.startsWith("logic-math-") || model.startsWith("logic-comparator-")) {
    if (["in-a", "in-b"].includes(terminalId)) return numeric;
    if (terminalId === "out") return [model.startsWith("logic-math-") ? "scalar" : "boolean"];
  }
  if (model.startsWith("logic-") && ["in", "in-a", "in-b", "out"].includes(terminalId)) return ["boolean"];
  if (["catalog-motor-starter", "catalog-interface-relay", "catalog-solenoid-actuator", "catalog-on-delay-timer"].includes(model) && terminalId === "a1") return ["boolean"];
  if ((model === "catalog-on-delay-timer" && terminalId === "18") || (model === "catalog-interface-relay" && terminalId === "14") || (model === "thermal-overload-dol-v1" && terminalId === "aux-96")) return ["boolean"];
  if ((model === "catalog-safety-relay" && ["s11", "s12", "reset", "14"].includes(terminalId)) || (model === "safety-dual-relay" && ["in-a", "in-b", "reset", "out"].includes(terminalId)) || (model === "catalog-feed-through-terminal" && ["1", "2"].includes(terminalId))) return ["boolean"];
  return undefined;
}
