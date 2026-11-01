import { evaluateFunctionalModel, evaluateFunctionalSignal, type FunctionalModelResult, type FunctionalSignal, type SignalUnit } from "./functionalModels";
import type { CircuitDocument, ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

export interface CircuitModelRun { componentId: string; reference: string; modelId: string; output: FunctionalModelResult; }

const endpointKey = (componentId: string, terminalId: string) => `${componentId}.${terminalId}`;

const numericalUnits: SignalUnit[] = ["milliamp", "plc-raw", "ohm", "millivolt", "hertz", "acceleration", "pulse-count", "ampere", "scalar"];
type InputBinding = { property: string; acceptedUnits: SignalUnit[]; pairedProperty?: string; };

function inputBinding(modelId: string, terminalId: string): InputBinding | undefined {
  if (terminalId === "in") {
    if (modelId === "signal-adc") return { property: "milliamp", acceptedUnits: ["milliamp"] };
    if (modelId === "signal-dac") return { property: "raw", acceptedUnits: ["plc-raw"] };
    return { property: "input", acceptedUnits: ["boolean"] };
  }
  if (terminalId === "in-a") return modelId.startsWith("logic-comparator-") || modelId.startsWith("logic-math-") ? { property: "left", acceptedUnits: numericalUnits, pairedProperty: "right" } : { property: "inputA", acceptedUnits: ["boolean"] };
  if (terminalId === "in-b") return modelId.startsWith("logic-comparator-") || modelId.startsWith("logic-math-") ? { property: "right", acceptedUnits: numericalUnits, pairedProperty: "left" } : { property: "inputB", acceptedUnits: ["boolean"] };
  return undefined;
}

const sameSignal = (left: FunctionalSignal | undefined, right: FunctionalSignal) => left?.unit === right.unit && left.value === right.value;

function definitions(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>) {
  return new Map(document.components.flatMap((component) => { const definition = catalog.get(component.definitionId); return definition ? [[component.id, definition] as const] : []; }));
}

function propagateWires(document: CircuitDocument, definitionsByComponent: Map<string, ElectricalComponentDefinition>, signals: Map<string, FunctionalSignal>) {
  let changed = false;
  const direction = (componentId: string, terminalId: string): TerminalDefinition["direction"] | undefined => definitionsByComponent.get(componentId)?.terminals.find((terminal) => terminal.id === terminalId)?.direction;
  for (const wire of document.wires) {
    const from = endpointKey(wire.from.componentId, wire.from.terminalId);
    const to = endpointKey(wire.to.componentId, wire.to.terminalId);
    const fromSignal = signals.get(from);
    const toSignal = signals.get(to);
    if (fromSignal !== undefined && direction(wire.to.componentId, wire.to.terminalId) !== "output" && !sameSignal(signals.get(to), fromSignal)) { signals.set(to, fromSignal); changed = true; }
    if (toSignal !== undefined && direction(wire.from.componentId, wire.from.terminalId) !== "output" && !sameSignal(signals.get(from), toSignal)) { signals.set(from, toSignal); changed = true; }
  }
  return changed;
}

export function executeCircuitModels(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): CircuitModelRun[] {
  const definitionsByComponent = definitions(document, catalog);
  const properties = new Map(document.components.map((component) => [component.id, { ...component.properties }]));
  const signals = new Map<string, FunctionalSignal>();
  const inputUnits = new Map<string, SignalUnit>();
  for (let iteration = 0; iteration < 12; iteration += 1) {
    let changed = false;
    for (const component of document.components) {
      const definition = definitionsByComponent.get(component.id);
      const activeProperties = properties.get(component.id);
      if (!definition || !activeProperties) continue;
      for (const terminal of definition.terminals.filter((item) => item.direction !== "output")) {
        const incoming = signals.get(endpointKey(component.id, terminal.id));
        const binding = inputBinding(definition.simulationModelId, terminal.id);
        const pairedUnit = binding?.pairedProperty ? inputUnits.get(`${component.id}.${binding.pairedProperty}`) : undefined;
        const inputUnitKey = binding ? `${component.id}.${binding.property}` : "";
        if (incoming !== undefined && binding && binding.acceptedUnits.includes(incoming.unit) && (!pairedUnit || pairedUnit === incoming.unit) && (activeProperties[binding.property] !== incoming.value || inputUnits.get(inputUnitKey) !== incoming.unit)) {
          activeProperties[binding.property] = incoming.value;
          inputUnits.set(inputUnitKey, incoming.unit);
          changed = true;
        }
      }
      const signal = evaluateFunctionalSignal(definition.simulationModelId, activeProperties);
      const output = definition.terminals.find((terminal) => terminal.direction === "output");
      if (signal !== undefined && output) {
        const key = endpointKey(component.id, output.id);
        if (!sameSignal(signals.get(key), signal)) { signals.set(key, signal); changed = true; }
      }
    }
    if (!propagateWires(document, definitionsByComponent, signals) && !changed) break;
  }
  return document.components.flatMap((component) => {
    const definition = catalog.get(component.definitionId);
    if (!definition) return [];
    const output = evaluateFunctionalModel(definition.simulationModelId, properties.get(component.id) ?? component.properties);
    return output ? [{ componentId: component.id, reference: component.reference, modelId: definition.simulationModelId, output }] : [];
  });
}
