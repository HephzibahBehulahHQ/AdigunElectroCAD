import type { ElectricalComponentDefinition, ElectricalProject, CircuitDocument, ProjectContinuation, ProjectContinuationPoint } from "../types/electrical";

export interface BomLine {
  definitionId: string;
  component: string;
  category: string;
  quantity: number;
  references: string[];
}

export interface WireLine {
  sheet?: string;
  id: string;
  netName: string;
  from: string;
  to: string;
  continuation?: {
    id: string;
    cableCore?: ProjectContinuation["cableCore"];
    originalSource: string;
  };
}

export interface TerminalLine {
  sheet?: string;
  reference: string;
  terminal: string;
  kind: string;
  direction: string;
}

export interface ProjectReport {
  projectWide?: true;
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
    for (const terminal of component.customTerminals ?? definition.terminals) {
      terminals.set(`${component.id}.${terminal.id}`, {
        reference: component.reference,
        terminal: component.terminalLabels?.[terminal.id] ?? terminal.label,
        kind: terminal.kind,
        direction: terminal.direction,
      });
    }
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
  if (section === "wires") {
    const { headers, rows } = wireReportTable(report);
    return toCsv(headers, rows);
  }
  return report.terminals.some((line) => line.sheet) ? toCsv(["Sheet", "Reference", "Terminal", "Kind", "Direction"], report.terminals.map((line) => [line.sheet ?? "", line.reference, line.terminal, line.kind, line.direction])) : toCsv(["Reference", "Terminal", "Kind", "Direction"], report.terminals.map((line) => [line.reference, line.terminal, line.kind, line.direction]));
}

export function wireReportTable(report: ProjectReport): { headers: string[]; rows: string[][] } {
  if (!report.projectWide) {
    return { headers: ["Net", "From", "To"], rows: report.wires.map((line) => [line.netName, line.from, line.to]) };
  }
  return {
    headers: ["Sheet", "Net", "From", "To", "Continuation ID", "Cable ID", "Core ID", "Original source"],
    rows: report.wires.map((line) => [
      line.sheet ?? "", line.netName, line.from, line.to,
      line.continuation?.id ?? "", line.continuation?.cableCore?.cableId ?? "",
      line.continuation?.cableCore?.coreId ?? "", line.continuation?.originalSource ?? "",
    ]),
  };
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
}

export function createProjectWideReport({ sheets, continuations }: Pick<ElectricalProject, "sheets" | "continuations">, definitions: Map<string, ElectricalComponentDefinition>): ProjectReport {
  const bomByDefinition = new Map<string, BomLine>();
  const wires: WireLine[] = [];
  const terminals: TerminalLine[] = [];
  const sheetLocations = new Map(sheets.map((sheet, index) => [sheet.id, {
    name: `${sheet.name} · Sheet ${index + 1}`,
    components: new Map(sheet.document.components.map((component) => [component.id, component])),
  }]));
  for (const sheet of sheets) {
    const { name } = sheetLocations.get(sheet.id)!;
    const report = createProjectReport(sheet.document, definitions);
    for (const line of report.bom) {
      const aggregate = bomByDefinition.get(line.definitionId) ?? { ...line, quantity: 0, references: [] };
      aggregate.quantity += line.quantity;
      aggregate.references.push(...line.references.map((reference) => `${name} · ${reference}`));
      bomByDefinition.set(line.definitionId, aggregate);
    }
    wires.push(...report.wires.map((wire) => ({ ...wire, sheet: name })));
    terminals.push(...report.terminals.map((terminal) => ({ ...terminal, sheet: name })));
  }

  const describePoint = ({ sheetId, endpoint, gridReference }: ProjectContinuationPoint) => {
    const sheet = sheetLocations.get(sheetId);
    const component = sheet?.components.get(endpoint.componentId);
    const definition = component && definitions.get(component.definitionId);
    const terminal = (component?.customTerminals ?? definition?.terminals)?.find((item) => item.id === endpoint.terminalId);
    const label = component?.terminalLabels?.[endpoint.terminalId] ?? terminal?.label ?? endpoint.terminalId;
    return `${sheet?.name ?? sheetId} · ${gridReference} · ${component?.reference ?? endpoint.componentId}.${label}`;
  };
  for (const continuation of continuations ?? []) {
    const [source, ...destinations] = continuation.points;
    if (!source) continue;
    const originalSource = describePoint(source);
    let from = originalSource;
    let fromSheetId = source.sheetId;
    for (const [index, destination] of destinations.entries()) {
      const to = describePoint(destination);
      wires.push({
        id: `${continuation.id}:${index + 1}`,
        sheet: sheetLocations.get(fromSheetId)?.name,
        netName: continuation.label,
        from,
        to,
        continuation: { id: continuation.id, cableCore: continuation.cableCore, originalSource },
      });
      from = to;
      fromSheetId = destination.sheetId;
    }
  }
  return {
    projectWide: true,
    bom: [...bomByDefinition.values()].sort((left, right) => left.category.localeCompare(right.category) || left.component.localeCompare(right.component)),
    wires,
    terminals,
  };
}
