import type { ElectricalComponentDefinition, CircuitDocument } from "../types/electrical";

export interface BomLine {
  definitionId: string;
  component: string;
  category: string;
  quantity: number;
  references: string[];
}

export interface WireLine {
  id: string;
  netName: string;
  from: string;
  to: string;
}

export interface TerminalLine {
  reference: string;
  terminal: string;
  kind: string;
  direction: string;
}

export interface ProjectReport {
  bom: BomLine[];
  wires: WireLine[];
  terminals: TerminalLine[];
}

export type ReportSection = "bom" | "wires" | "terminals";

export function createProjectReport(document: CircuitDocument, definitions: Map<string, ElectricalComponentDefinition>): ProjectReport {
  const bomByDefinition = new Map<string, BomLine>();
  const components = new Map(document.components.map((component) => [component.id, component]));
  const terminals = new Map<string, TerminalLine>();

  for (const component of document.components) {
    const definition = definitions.get(component.definitionId);
    if (!definition) continue;
    const line = bomByDefinition.get(definition.id) ?? { definitionId: definition.id, component: definition.name, category: definition.category, quantity: 0, references: [] };
    line.quantity += 1;
    line.references.push(component.reference);
    bomByDefinition.set(definition.id, line);
    for (const terminal of definition.terminals) terminals.set(`${component.id}.${terminal.id}`, { reference: component.reference, terminal: terminal.label, kind: terminal.kind, direction: terminal.direction });
  }

  const endpointLabel = (componentId: string, terminalId: string) => {
    const component = components.get(componentId);
    const terminal = terminals.get(`${componentId}.${terminalId}`);
    return component && terminal ? `${component.reference}.${terminal.terminal}` : `${componentId}.${terminalId}`;
  };

  return {
    bom: [...bomByDefinition.values()].sort((left, right) => left.category.localeCompare(right.category) || left.component.localeCompare(right.component)),
    wires: document.wires.map((wire) => ({ id: wire.id, netName: wire.netName ?? "—", from: endpointLabel(wire.from.componentId, wire.from.terminalId), to: endpointLabel(wire.to.componentId, wire.to.terminalId) })),
    terminals: [...terminals.values()].sort((left, right) => left.reference.localeCompare(right.reference) || left.terminal.localeCompare(right.terminal)),
  };
}

export function reportCsv(report: ProjectReport, section: ReportSection): string {
  if (section === "bom") return toCsv(["Component", "Category", "Quantity", "References"], report.bom.map((line) => [line.component, line.category, String(line.quantity), line.references.join(", ")]));
  if (section === "wires") return toCsv(["Net", "From", "To"], report.wires.map((line) => [line.netName, line.from, line.to]));
  return toCsv(["Reference", "Terminal", "Kind", "Direction"], report.terminals.map((line) => [line.reference, line.terminal, line.kind, line.direction]));
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
}
