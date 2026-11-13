import type { CircuitDocument, ElectricalComponentDefinition, TerminalEndpoint, Wire } from "../types/electrical";
import { terminalSignalUnits } from "./signalContracts";
import { signalDriverConflicts } from "./signalDrivers";

export interface TopologyIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface ConnectionCheck {
  ok: boolean;
  reason?: string;
}

export function canConnectTerminals(document: CircuitDocument, definitions: Map<string, ElectricalComponentDefinition>, from: TerminalEndpoint, to: TerminalEndpoint): ConnectionCheck {
  if (from.componentId === to.componentId && from.terminalId === to.terminalId) return { ok: false, reason: "A wire cannot connect a terminal to itself." };
  const fromTerminal = resolveTerminal(from, document, definitions);
  const toTerminal = resolveTerminal(to, document, definitions);
  if (!fromTerminal || !toTerminal) return { ok: false, reason: "Both wire endpoints must be valid catalog terminals." };
  if (fromTerminal.kind !== toTerminal.kind) return { ok: false, reason: `${fromTerminal.kind} and ${toTerminal.kind} terminals cannot be wired together.` };
  const signalIssue = incompatibleSignal(document, definitions, from, to);
  if (signalIssue) return { ok: false, reason: signalIssue };
  if ((fromTerminal.direction === "input" && toTerminal.direction === "input") || (fromTerminal.direction === "output" && toTerminal.direction === "output")) return { ok: false, reason: "Two input terminals or two output terminals cannot be wired together." };
  const duplicate = document.wires.some((wire) => sameConnection(wire.from, wire.to, from, to));
  if (duplicate) return { ok: false, reason: "Those terminals are already connected." };
  const conflicts = signalDriverConflicts({ ...document, wires: [...document.wires, { id: "connection-check", from, to, points: [] }] }, definitions);
  return conflicts.length ? { ok: false, reason: conflicts[0] } : { ok: true };
}

export function validateCircuit(document: CircuitDocument, definitions: Map<string, ElectricalComponentDefinition>): TopologyIssue[] {
  const issues: TopologyIssue[] = [];
  const components = new Map<string, CircuitDocument["components"][number]>();
  const references = new Set<string>();

  for (const component of document.components) {
    if (components.has(component.id)) issues.push({ severity: "error", code: "duplicate-component-id", message: `Duplicate component ID: ${component.id}` });
    components.set(component.id, component);
    if (references.has(component.reference)) issues.push({ severity: "error", code: "duplicate-reference", message: `Duplicate reference: ${component.reference}` });
    references.add(component.reference);
    if (!definitions.has(component.definitionId)) issues.push({ severity: "error", code: "unknown-definition", message: `${component.reference} references an unknown catalog definition.` });
  }

  const seenWires = new Set<string>();
  const seenConnections = new Set<string>();
  for (const wire of document.wires) {
    if (seenWires.has(wire.id)) issues.push({ severity: "error", code: "duplicate-wire-id", message: `Duplicate wire ID: ${wire.id}` });
    seenWires.add(wire.id);
    validateEndpoint(wire.from, components, definitions, issues, wire.id);
    validateEndpoint(wire.to, components, definitions, issues, wire.id);
    if (wire.from.componentId === wire.to.componentId && wire.from.terminalId === wire.to.terminalId) issues.push({ severity: "error", code: "self-wire", message: `${wire.id} connects a terminal to itself.` });
    const fromTerminal = resolveTerminal(wire.from, document, definitions);
    const toTerminal = resolveTerminal(wire.to, document, definitions);
    if (!fromTerminal || !toTerminal) continue;
    const signalIssue = incompatibleSignal(document, definitions, wire.from, wire.to);
    if (signalIssue) issues.push({ severity: "error", code: "incompatible-signal-unit", message: `${wire.id}: ${signalIssue}` });
    if (fromTerminal.kind !== toTerminal.kind) issues.push({ severity: "error", code: "incompatible-terminal-kind", message: `${wire.id} joins incompatible ${fromTerminal.kind} and ${toTerminal.kind} terminals.` });
    if ((fromTerminal.direction === "input" && toTerminal.direction === "input") || (fromTerminal.direction === "output" && toTerminal.direction === "output")) issues.push({ severity: "error", code: "incompatible-terminal-direction", message: `${wire.id} joins two ${fromTerminal.direction} terminals.` });
    const connectionId = [endpointId(wire.from), endpointId(wire.to)].sort().join("|");
    if (seenConnections.has(connectionId)) issues.push({ severity: "error", code: "duplicate-terminal-connection", message: `${wire.id} duplicates an existing terminal connection.` });
    seenConnections.add(connectionId);
  }

  const wiresById = new Map(document.wires.map((wire) => [wire.id, wire]));
  for (const wire of document.wires) {
    if (!wire.branchOfWireId) continue;
    const parent = wiresById.get(wire.branchOfWireId);
    if (!parent || parent.id === wire.id) {
      issues.push({ severity: "error", code: "invalid-wire-branch-parent", message: `${wire.id} references a missing or self parent wire.` });
      continue;
    }
    const source = wire.branchSource === "to" ? parent.to : parent.from;
    if (wire.from.componentId !== source.componentId || wire.from.terminalId !== source.terminalId || !Number.isFinite(wire.branchPosition) || wire.branchPosition! <= 0 || wire.branchPosition! >= 1) {
      issues.push({ severity: "error", code: "invalid-wire-branch-position", message: `${wire.id} has an invalid branch source or position.` });
    }
    const ancestry = new Set([wire.id]);
    let ancestor: Wire | undefined = parent;
    while (ancestor?.branchOfWireId) {
      if (ancestry.has(ancestor.id)) {
        issues.push({ severity: "error", code: "cyclic-wire-branch", message: `${wire.id} belongs to a cyclic wire branch.` });
        break;
      }
      ancestry.add(ancestor.id);
      ancestor = wiresById.get(ancestor.branchOfWireId);
    }
  }

  for (const message of signalDriverConflicts(document, definitions)) issues.push({ severity: "error", code: "conflicting-signal-drivers", message });
  return issues;
}

function validateEndpoint(endpoint: TerminalEndpoint, components: Map<string, CircuitDocument["components"][number]>, definitions: Map<string, ElectricalComponentDefinition>, issues: TopologyIssue[], wireId: string) {
  const component = components.get(endpoint.componentId);
  if (!component) {
    issues.push({ severity: "error", code: "unknown-component", message: `${wireId} references missing component ${endpoint.componentId}.` });
    return;
  }
  const definition = definitions.get(component.definitionId);
  if (definition && !definition.terminals.some((terminal) => terminal.id === endpoint.terminalId)) issues.push({ severity: "error", code: "unknown-terminal", message: `${wireId} references missing terminal ${component.reference}.${endpoint.terminalId}.` });
}

function resolveTerminal(endpoint: TerminalEndpoint, document: CircuitDocument, definitions: Map<string, ElectricalComponentDefinition>) {
  const component = document.components.find((item) => item.id === endpoint.componentId);
  const definition = component ? definitions.get(component.definitionId) : undefined;
  return definition?.terminals.find((terminal) => terminal.id === endpoint.terminalId);
}

function sameConnection(from: TerminalEndpoint, to: TerminalEndpoint, expectedFrom: TerminalEndpoint, expectedTo: TerminalEndpoint) {
  const matches = (left: TerminalEndpoint, right: TerminalEndpoint) => left.componentId === right.componentId && left.terminalId === right.terminalId;
  return (matches(from, expectedFrom) && matches(to, expectedTo)) || (matches(from, expectedTo) && matches(to, expectedFrom));
}

function endpointId(endpoint: TerminalEndpoint) {
  return `${endpoint.componentId}.${endpoint.terminalId}`;
}

function incompatibleSignal(document: CircuitDocument, definitions: Map<string, ElectricalComponentDefinition>, from: TerminalEndpoint, to: TerminalEndpoint): string | undefined {
  const units = (endpoint: TerminalEndpoint) => {
    const component = document.components.find((item) => item.id === endpoint.componentId);
    const definition = component && definitions.get(component.definitionId);
    return definition && terminalSignalUnits(definition, endpoint.terminalId);
  };
  const left = units(from); const right = units(to);
  return left && right && !left.some((unit) => right.includes(unit)) ? `Incompatible simulated signals: ${left.join("/")} and ${right.join("/")}. Use a matching converter.` : undefined;
}
