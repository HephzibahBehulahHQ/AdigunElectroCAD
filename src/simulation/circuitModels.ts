import { evaluateFunctionalModel, evaluateFunctionalSignal, type FunctionalModelResult, type FunctionalSignal } from "./functionalModels";
import type { CircuitDocument, ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

export interface CircuitModelRun { componentId: string; reference: string; modelId: string; output: FunctionalModelResult; }

const endpointKey = (componentId: string, terminalId: string) => `${componentId}.${terminalId}`;

function inputProperty(modelId: string, terminalId: string): string | undefined {
  if (terminalId === "in") return modelId === "signal-adc" ? "milliamp" : modelId === "signal-dac" ? "raw" : "input";
  if (terminalId === "in-a") return modelId.startsWith("logic-comparator-") || modelId.startsWith("logic-math-") ? "left" : "inputA";
  if (terminalId === "in-b") return modelId.startsWith("logic-comparator-") || modelId.startsWith("logic-math-") ? "right" : "inputB";
  return undefined;
}

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
    if (fromSignal !== undefined && direction(wire.to.componentId, wire.to.terminalId) !== "output" && signals.get(to) !== fromSignal) { signals.set(to, fromSignal); changed = true; }
    if (toSignal !== undefined && direction(wire.from.componentId, wire.from.terminalId) !== "output" && signals.get(from) !== toSignal) { signals.set(from, toSignal); changed = true; }
  }
  return changed;
}

export function executeCircuitModels(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): CircuitModelRun[] {
  const definitionsByComponent = definitions(document, catalog);
  const properties = new Map(document.components.map((component) => [component.id, { ...component.properties }]));
  const signals = new Map<string, FunctionalSignal>();
  for (let iteration = 0; iteration < 12; iteration += 1) {
    let changed = false;
    for (const component of document.components) {
      const definition = definitionsByComponent.get(component.id);
      const activeProperties = properties.get(component.id);
      if (!definition || !activeProperties) continue;
      for (const terminal of definition.terminals.filter((item) => item.direction !== "output")) {
        const incoming = signals.get(endpointKey(component.id, terminal.id));
        const property = inputProperty(definition.simulationModelId, terminal.id);
        if (incoming !== undefined && property && activeProperties[property] !== incoming) { activeProperties[property] = incoming; changed = true; }
      }
      const signal = evaluateFunctionalSignal(definition.simulationModelId, activeProperties);
      const output = definition.terminals.find((terminal) => terminal.direction === "output");
      if (signal !== undefined && output) {
        const key = endpointKey(component.id, output.id);
        if (signals.get(key) !== signal) { signals.set(key, signal); changed = true; }
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
