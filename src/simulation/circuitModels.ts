import { evaluateFunctionalModel, evaluateFunctionalSignal, type FunctionalModelResult, type FunctionalSignal, type SignalUnit } from "./functionalModels";
import type { CircuitDocument, ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

export interface CircuitModelRun { componentId: string; reference: string; modelId: string; output: FunctionalModelResult; }

const endpointKey = (componentId: string, terminalId: string) => `${componentId}.${terminalId}`;

const numericalUnits: SignalUnit[] = ["milliamp", "plc-raw", "ohm", "millivolt", "hertz", "acceleration", "pulse-count", "ampere", "scalar"];
type InputBinding = { property: string; acceptedUnits: SignalUnit[]; pairedProperty?: string; };

function inputBinding(modelId: string, terminalId: string): InputBinding | undefined {
  if (modelId === "catalog-interface-relay" && terminalId === "a1") return { property: "energized", acceptedUnits: ["boolean"] };
  if (modelId === "catalog-plc-digital-io" && ["in-0", "in-1"].includes(terminalId)) return { property: terminalId === "in-0" ? "inputA" : "inputB", acceptedUnits: ["boolean"] };
  if (modelId === "catalog-solenoid-actuator" && terminalId === "a1") return { property: "energized", acceptedUnits: ["boolean"] };
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
  const properties = new Map<string, Record<string, string | number | boolean>>(document.components.flatMap((component) => {
    const definition = definitionsByComponent.get(component.id);
    return definition ? [[component.id, { ...definition.propertiesSchema, ...component.properties }]] : [];
  }));
  const signals = new Map<string, FunctionalSignal>();
  // Trace each phase through actual wires and closed switching paths.
  // Component commands alone cannot supply a motor with power.
  const powerEdges = new Map<string, string[]>();
  const link = (from: string, to: string) => powerEdges.set(from, [...(powerEdges.get(from) ?? []), to]);
  for (const wire of document.wires) {
    const from = endpointKey(wire.from.componentId, wire.from.terminalId);
    const to = endpointKey(wire.to.componentId, wire.to.terminalId);
    link(from, to); link(to, from);
  }
  const powered = new Map<string, Set<string>>();
  const frequencies = new Map<string, number>();
  const driveOutputs = new Map<string, number>();
  const queue: Array<[string, string, number]> = [];
  for (const component of document.components) {
    const model = definitionsByComponent.get(component.id)?.simulationModelId;
    const p = properties.get(component.id) ?? {};
    if (model === "catalog-ac-supply" && p.outputEnabled === true) {
      for (const phase of ["l1", "l2", "l3"]) queue.push([endpointKey(component.id, `${phase}-out`), `${component.id}:${phase}`, Number(p.frequencyHz ?? 50)]);
    }
    if (model === "catalog-variable-frequency-drive") for (const phase of ["l1", "l2", "l3"]) {
      driveOutputs.set(endpointKey(component.id, `${phase}-out`), Math.max(0, Math.min(Number(p.commandHz ?? 0), Number(p.maximumFrequencyHz ?? 50))));
    }
    const conducting = model === "catalog-circuit-breaker" ? p.closed === true
      : model === "catalog-motor-starter" ? p.energized === true
      : model === "catalog-variable-frequency-drive" ? p.enabled === true : false;
    if (conducting) for (const phase of ["l1", "l2", "l3"]) {
      link(endpointKey(component.id, `${phase}-in`), endpointKey(component.id, `${phase}-out`));
    }
  }
  while (queue.length) {
    const [terminal, phase, incomingFrequency] = queue.shift()!;
    const frequency = driveOutputs.get(terminal) ?? incomingFrequency;
    const phases = powered.get(terminal) ?? new Set<string>();
    if (phases.has(phase)) continue;
    phases.add(phase);
    powered.set(terminal, phases);
    frequencies.set(`${terminal}|${phase}`, frequency);
    queue.push(...(powerEdges.get(terminal) ?? []).map((next): [string, string, number] => [next, phase, frequency]));
  }
  for (const component of document.components) {
    if (definitionsByComponent.get(component.id)?.simulationModelId !== "catalog-induction-motor") continue;
    const p = properties.get(component.id)!;
    const feeds = ["u1", "v1", "w1"].map((terminal) => [...(powered.get(endpointKey(component.id, terminal)) ?? [])]);
    const uniqueFeeds = feeds.every((feed) => feed.length === 1) && new Set(feeds.map((feed) => feed[0])).size === 3;
    const sameSource = new Set(feeds.flat().map((feed) => feed.slice(0, feed.lastIndexOf(":")))).size === 1;
    const motorFrequencies = ["u1", "v1", "w1"].map((terminal, index) => frequencies.get(`${endpointKey(component.id, terminal)}|${feeds[index][0]}`));
    const frequency = motorFrequencies[0];
    const validFrequency = frequency !== undefined && Number.isFinite(frequency) && frequency > 0 && motorFrequencies.every((value) => value === frequency);
    p.energized = p.energized === true && uniqueFeeds && sameSource && validFrequency;
    if (p.energized) p.nominalSpeedRpm = Number(p.nominalSpeedRpm) * frequency! / Number(p.ratedFrequencyHz ?? 50);
  }
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
      const contactOutput = definition.simulationModelId === "catalog-on-delay-timer" ? "18" : definition.simulationModelId === "catalog-interface-relay" ? "14" : undefined;
      const output = definition.terminals.find((terminal) => contactOutput ? terminal.id === contactOutput : terminal.direction === "output");
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
