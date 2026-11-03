import { evaluateWiredControl } from "./wiredControl";
import { traceOverloadCurrents, type NominalCurrentLoad } from "./overloadCurrent";
import { evaluateFunctionalModel, evaluateFunctionalSignal, type FunctionalModelResult, type FunctionalSignal, type SignalUnit } from "./functionalModels";
import type { CircuitDocument, ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";
import { windingConnection } from "../electrical/windingConnections";
import { functionalOutputTerminal } from "../electrical/signalContracts";

export interface CircuitModelRun { componentId: string; reference: string; modelId: string; output: FunctionalModelResult; evaluatedProperties: Readonly<Record<string, string | number | boolean>>; }

const endpointKey = (componentId: string, terminalId: string) => `${componentId}.${terminalId}`;

const numericalUnits: SignalUnit[] = ["milliamp", "plc-raw", "ohm", "millivolt", "hertz", "acceleration", "pulse-count", "ampere", "scalar"];
type InputBinding = { property: string; acceptedUnits: SignalUnit[]; pairedProperty?: string; boundProperty?: string; };

function inputBinding(modelId: string, terminalId: string): InputBinding | undefined {
  if (modelId === "pneumatic-valve-5-2" && ["in-a", "in-b"].includes(terminalId)) return { property: terminalId === "in-a" ? "extendCoil" : "retractCoil", acceptedUnits: ["boolean"] };
  if (modelId === "pneumatic-valve-3-2" && terminalId === "in") return { property: "energized", acceptedUnits: ["boolean"] };
  if (["pneumatic-cylinder-single", "pneumatic-cylinder-double"].includes(modelId)) {
    if (terminalId === "motion") return { property: "motionCommand", acceptedUnits: ["motion"], boundProperty: "runtimeMotionBound" };
    if (terminalId === "in" || terminalId === "in-a") return { property: "extendCommand", acceptedUnits: ["boolean"], boundProperty: "runtimeDirectBound" };
    if (terminalId === "in-b") return { property: "retractCommand", acceptedUnits: ["boolean"], boundProperty: "runtimeDirectBound" };
  }
  if (modelId === "catalog-plc-digital-io" && terminalId === "ai-0") return { property: "analogInput0", acceptedUnits: ["plc-raw"] };
  if (modelId === "catalog-safety-relay" || modelId === "safety-dual-relay") {
    if (["s11", "in-a"].includes(terminalId)) return { property: "channelAClosed", acceptedUnits: ["boolean"] };
    if (["s12", "in-b"].includes(terminalId)) return { property: "channelBClosed", acceptedUnits: ["boolean"] };
    if (terminalId === "reset") return { property: "reset", acceptedUnits: ["boolean"] };
  }
  if (modelId === "catalog-motor-starter" && terminalId === "a1") return { property: "energized", acceptedUnits: ["boolean"] };
  if (modelId === "catalog-on-delay-timer" && terminalId === "a1") return { property: "energized", acceptedUnits: ["boolean"] };
  if (modelId === "catalog-feed-through-terminal" && terminalId === "1") return { property: "inputSignal", acceptedUnits: ["boolean"] };
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

const sameSignal = (left: FunctionalSignal | undefined, right: FunctionalSignal) => left?.unit === right.unit && left.value === right.value && left.error === right.error;

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
  if (document.id !== "reference-dol-motor-starter") for (const c of document.components) {
    const p = properties.get(c.id);
    if (definitionsByComponent.get(c.id)?.simulationModelId === "thermal-overload-dol-v1" && p?.thermalEnabled === true) {
      p.tripped = p.tripped === true || p.runtimeThermalTripped === true;
      if (p.runtimeThermalError) p.runtimeSignalError = p.runtimeThermalError;
    }
  }
  if (document.id !== "reference-dol-motor-starter") for (const [id, coil] of evaluateWiredControl(document, catalog)) {
    const active = properties.get(id)!;
    active.energized = coil.energized;
    active.runtimeCoilVoltageV = coil.voltageV;
    if (coil.error) active.runtimeSignalError = coil.error;
  }
  const signals = new Map<string, FunctionalSignal>();
  const inputUnits = new Map<string, SignalUnit>();
  for (let iteration = 0; iteration < Math.max(12, document.components.length + 1); iteration += 1) {
    let changed = false;
    for (const component of document.components) {
      const definition = definitionsByComponent.get(component.id);
      const activeProperties = properties.get(component.id);
      if (!definition || !activeProperties) continue;
      for (const terminal of definition.terminals.filter((item) => item.direction !== "output")) {
        const incoming = signals.get(endpointKey(component.id, terminal.id));
        const binding = inputBinding(definition.simulationModelId, terminal.id);
        const pairedUnit = binding?.pairedProperty ? inputUnits.get(`${component.id}.${binding.pairedProperty}`) : undefined;
        const unitError = incoming && binding ? !binding.acceptedUnits.includes(incoming.unit) ? `Signal unit ${incoming.unit} is not accepted at ${component.reference}.${terminal.id}.` : pairedUnit && pairedUnit !== incoming.unit ? `Mixed signal units ${pairedUnit}/${incoming.unit} at ${component.reference}.` : undefined : undefined;
        const inputError = incoming?.error ?? unitError;
        if (inputError && binding) {
          if (activeProperties.runtimeSignalError !== inputError) { activeProperties.runtimeSignalError = inputError; changed = true; }
          if (binding.acceptedUnits.includes("boolean") && activeProperties[binding.property] !== false) { activeProperties[binding.property] = false; changed = true; }
          continue;
        }
        const inputUnitKey = binding ? `${component.id}.${binding.property}` : "";
        if (incoming !== undefined && binding && binding.acceptedUnits.includes(incoming.unit) && (!pairedUnit || pairedUnit === incoming.unit) && (activeProperties[binding.property] !== incoming.value || inputUnits.get(inputUnitKey) !== incoming.unit)) {
          activeProperties[binding.property] = incoming.value;
          if (binding.boundProperty) activeProperties[binding.boundProperty] = true;
          inputUnits.set(inputUnitKey, incoming.unit);
          changed = true;
        }
      }
      const signal = evaluateFunctionalSignal(definition.simulationModelId, activeProperties);
      const output = functionalOutputTerminal(definition);
      if (signal !== undefined && output) {
        const key = endpointKey(component.id, output.id);
        if (!sameSignal(signals.get(key), signal)) { signals.set(key, signal); changed = true; }
      }
    }
    if (!propagateWires(document, definitionsByComponent, signals) && !changed) break;
  }
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
      : (model === "catalog-motor-starter" || model === "contactor-dol-v1") ? p.energized === true
      : model === "catalog-variable-frequency-drive" ? p.enabled === true : false;
    if (conducting) for (const phase of ["l1", "l2", "l3"]) {
      link(endpointKey(component.id, `${phase}-in`), endpointKey(component.id, `${phase}-out`));
    }
    if (model === "thermal-overload-dol-v1") for (let phase = 1; phase <= 3; phase++) link(endpointKey(component.id, `l${phase}-in`), endpointKey(component.id, `t${phase}`));
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
  const currentLoads: NominalCurrentLoad[] = [];
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
    if (p.energized) {
      currentLoads.push({ reference: component.reference, currentA: Number(p.ratedCurrentA) > 0 ? Number(p.ratedCurrentA) : NaN, feeds: ["u1", "v1", "w1"].map((terminal, index) => {
        const feed = feeds[index][0], separator = feed.lastIndexOf(":");
        return { terminal: endpointKey(component.id, terminal), source: endpointKey(feed.slice(0, separator), `${feed.slice(separator + 1)}-out`) };
      }) });
      const order = feeds.map((feed) => Number(feed[0].slice(-1)));
      let inversions = 0;
      for (let left = 0; left < order.length; left++) for (let right = left + 1; right < order.length; right++) if (order[left] > order[right]) inversions++;
      const direction = inversions % 2 ? -1 : 1;
      p.nominalSpeedRpm = Math.abs(Number(p.nominalSpeedRpm)) * frequency! / Number(p.ratedFrequencyHz ?? 50) * direction;
    }
  }
  const overloads = document.components.filter(c => definitionsByComponent.get(c.id)?.simulationModelId === "thermal-overload-dol-v1").map(c => ({ id: c.id, poles: [1, 2, 3].map(phase => ({ input: endpointKey(c.id, `l${phase}-in`), output: endpointKey(c.id, `t${phase}`) })) }));
  // Do not silently treat connected but unsupported load families as zero current.
  const supportedPowerModels = new Set(["catalog-ac-supply", "catalog-circuit-breaker", "catalog-motor-starter", "contactor-dol-v1", "thermal-overload-dol-v1", "catalog-induction-motor", "power-junction"]);
  for (const c of document.components) {
    const definition = definitionsByComponent.get(c.id);
    if (!definition || supportedPowerModels.has(definition.simulationModelId)) continue;
    const feeds = definition.terminals.filter(t => t.kind === "power" && t.direction !== "output").flatMap(t => [...(powered.get(endpointKey(c.id, t.id)) ?? [])].map(feed => {
      const separator = feed.lastIndexOf(":");
      return { terminal: endpointKey(c.id, t.id), source: endpointKey(feed.slice(0, separator), `${feed.slice(separator + 1)}-out`) };
    }));
    if (feeds.length) currentLoads.push({ reference: `${c.reference} (unsupported current model)`, currentA: NaN, feeds });
  }
  const unsupportedTransfers = document.components.filter(c => definitionsByComponent.get(c.id)?.simulationModelId === "catalog-variable-frequency-drive").flatMap(c => ["l1", "l2", "l3"].map(phase => endpointKey(c.id, `${phase}-in`)));
  for (const [id, result] of traceOverloadCurrents(powerEdges, overloads, currentLoads, unsupportedTransfers)) {
    const p = properties.get(id)!;
    p.runtimeLoadCurrentA = result.currentA;
    p.runtimeCurrentError = result.error ?? "";
    for (let index = 0; index < 3; index++) p[`runtimePhase${index + 1}CurrentA`] = result.phaseCurrentsA[index] ?? 0;
  }
  return document.components.flatMap((component) => {
    const definition = catalog.get(component.definitionId);
    if (!definition) return [];
    if (document.id === "reference-dol-motor-starter" && definition.simulationModelId === "contactor-dol-v1") return [];
    const active = properties.get(component.id) ?? component.properties;
    if (definition.simulationModelId === "power-junction") active.connectedConductors = document.wires.filter((wire) => wire.from.componentId === component.id || wire.to.componentId === component.id).length;
    if (definition.simulationModelId === "six-terminal-windings") {
      const contacts = document.components.filter((item) => definitionsByComponent.get(item.id)?.simulationModelId === "catalog-motor-starter" && properties.get(item.id)?.energized === true).flatMap((item) => ["l1", "l2", "l3"].map((phase): [{ componentId: string; terminalId: string }, { componentId: string; terminalId: string }] => [{ componentId: item.id, terminalId: `${phase}-in` }, { componentId: item.id, terminalId: `${phase}-out` }]));
      active.connection = windingConnection(document, component.id, contacts);
      const feeds = ["u1", "v1", "w1"].map((terminal) => [...(powered.get(endpointKey(component.id, terminal)) ?? [])]);
      const supplied = feeds.every((feed) => feed.length === 1) && new Set(feeds.flat()).size === 3;
      const sourceIds = feeds.flat().map((feed) => feed.slice(0, feed.lastIndexOf(":")));
      active.lineVoltageV = supplied && new Set(sourceIds).size === 1 ? Number(properties.get(sourceIds[0])?.nominalVoltageV ?? 0) : 0;
    }
    const output = evaluateFunctionalModel(definition.simulationModelId, active);
    return output ? [{ componentId: component.id, reference: component.reference, modelId: definition.simulationModelId, output, evaluatedProperties: { ...active } }] : [];
  });
}
