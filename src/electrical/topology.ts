import type { CircuitDocument, ElectricalComponentDefinition, TerminalEndpoint } from "../types/electrical";

export interface TopologyIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
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
  for (const wire of document.wires) {
    if (seenWires.has(wire.id)) issues.push({ severity: "error", code: "duplicate-wire-id", message: `Duplicate wire ID: ${wire.id}` });
    seenWires.add(wire.id);
    validateEndpoint(wire.from, components, definitions, issues, wire.id);
    validateEndpoint(wire.to, components, definitions, issues, wire.id);
    if (wire.from.componentId === wire.to.componentId && wire.from.terminalId === wire.to.terminalId) issues.push({ severity: "error", code: "self-wire", message: `${wire.id} connects a terminal to itself.` });
  }

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
