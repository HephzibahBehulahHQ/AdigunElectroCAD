import { resolveDraftingStyle } from "../cad/draftingLayers";
import { displayTerminalLabel } from "../electrical/terminalLabels";
import type { ElectricalComponentDefinition, ElectricalProject, CircuitDocument, ProjectContinuation, ProjectContinuationPoint } from "../types/electrical";
import { validateCircuit, type TopologyIssue } from "../electrical/topology";
import { projectContinuationSignalWarnings, validateProjectContinuations } from "../projects/projectContinuations";
import type { ProjectCircuitModelRun } from "../simulation/projectCircuitModels";

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
  draftingColor?: string;
  conductorColor?: string;
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
  validation: Array<TopologyIssue & { sheet?: string }>;
  simulation?: ReturnType<typeof simulationResultsTable>;
}

export type ReportSection = "bom" | "wires" | "terminals" | "cables" | "validation" | "simulation";

export function simulationResultsTable(
  runs: readonly ProjectCircuitModelRun[], sheets: ElectricalProject["sheets"],
  state: "running" | "paused" | "stopped", activeSheetId?: string,
): { headers: string[]; rows: string[][] } {
  const sheetNames = new Map(sheets.map((sheet, index) => [sheet.id, `${sheet.name} · Sheet ${index + 1}`]));
  const columns = ["Mode", "Reference", "Model", "Result", "Value", "Fault"];
  return {
    headers: activeSheetId === undefined ? ["Sheet", ...columns] : columns,
    rows: runs.filter((run) => activeSheetId === undefined || run.sheetId === activeSheetId).map(({ sheetId, reference, modelId, output }) => {
      const values = [state, reference, modelId, output.label, output.value, output.error ?? ""];
      return activeSheetId === undefined ? [sheetNames.get(sheetId) ?? sheetId, ...values] : values;
    }),
  };
}

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
    for (const [index, terminal] of (component.customTerminals ?? definition.terminals).entries()) {
      terminals.set(`${component.id}.${terminal.id}`, {
        reference: component.reference,
        terminal: component.terminalLabels?.[terminal.id] ?? displayTerminalLabel(component.properties, index, terminal.label),
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
    wires: document.wires.map((wire) => ({
      id: wire.id,
      netName: wire.netName ?? "—",
      from: endpointLabel(wire.from.componentId, wire.from.terminalId),
      to: endpointLabel(wire.to.componentId, wire.to.terminalId),
      draftingColor: resolveDraftingStyle(wire, document.draftingLayers).draftingColor,
    })),
    terminals: [...terminals.values()].sort((left, right) => left.reference.localeCompare(right.reference) || left.terminal.localeCompare(right.terminal)),
    validation: validateCircuit(document, definitions),
  };
}

export function reportCsv(report: ProjectReport, section: ReportSection): string {
  if (section === "simulation") return report.simulation ? toCsv(report.simulation.headers, report.simulation.rows) : "";
  if (section === "bom") return toCsv(["Component", "Category", "Quantity", "References"], report.bom.map((line) => [line.component, line.category, String(line.quantity), line.references.join(", ")]));
  if (section === "wires") {
    const { headers, rows } = wireReportTable(report);
    return toCsv(headers, rows);
  }
  if (section === "cables") {
    const { headers, rows } = cableScheduleTable(report);
    return toCsv(headers, rows);
  }
  if (section === "validation") {
    const { headers, rows } = electricalValidationTable(report);
    return toCsv(headers, rows);
  }
  return report.terminals.some((line) => line.sheet) ? toCsv(["Sheet", "Reference", "Terminal", "Kind", "Direction"], report.terminals.map((line) => [line.sheet ?? "", line.reference, line.terminal, line.kind, line.direction])) : toCsv(["Reference", "Terminal", "Kind", "Direction"], report.terminals.map((line) => [line.reference, line.terminal, line.kind, line.direction]));
}

export function electricalValidationTable(report: ProjectReport): { headers: string[]; rows: string[][] } {
  const columns = ["Severity", "Code", "Finding"];
  return {
    headers: report.projectWide ? ["Scope", ...columns] : columns,
    rows: report.validation.map(({ sheet, severity, code, message }) => report.projectWide
      ? [sheet ?? "Cross-sheet continuations", severity, code, message]
      : [severity, code, message]),
  };
}

export function cableScheduleTable(report: ProjectReport): { headers: string[]; rows: string[][] } {
  const assigned = new Map<string, { cable: string; core: string; net: string; color: string; source: string; destination: string }>();
  for (const wire of report.wires) {
    const continuation = wire.continuation;
    if (!continuation?.cableCore) continue;
    const existing = assigned.get(continuation.id);
    if (existing) existing.destination = wire.to;
    else assigned.set(continuation.id, {
      cable: continuation.cableCore.cableId,
      core: continuation.cableCore.coreId,
      net: wire.netName,
      color: wire.conductorColor ?? "",
      source: continuation.originalSource,
      destination: wire.to,
    });
  }
  const cores = [...assigned].sort(([, a], [, b]) => a.cable.localeCompare(b.cable, undefined, { numeric: true }) || a.core.localeCompare(b.core, undefined, { numeric: true }));
  return {
    headers: ["Cable ID", "Core ID", "Net", "Conductor color", "Source", "Destination", "Continuation ID"],
    rows: cores.map(([id, core]) => [core.cable, core.core, core.net, core.color, core.source, core.destination, id]),
  };
}

export function wireReportTable(report: ProjectReport): { headers: string[]; rows: string[][] } {
  if (!report.projectWide) {
    return { headers: ["Net", "From", "To", "Drafting color"], rows: report.wires.map((line) => [line.netName, line.from, line.to, line.draftingColor ?? ""]) };
  }
  return {
    headers: ["Sheet", "Net", "From", "To", "Continuation ID", "Cable ID", "Core ID", "Original source", "Drafting color", "Conductor color"],
    rows: report.wires.map((line) => [
      line.sheet ?? "", line.netName, line.from, line.to,
      line.continuation?.id ?? "", line.continuation?.cableCore?.cableId ?? "",
      line.continuation?.cableCore?.coreId ?? "", line.continuation?.originalSource ?? "",
      line.draftingColor ?? "", line.conductorColor ?? "",
    ]),
  };
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
}

export function createProjectWideReport(project: Pick<ElectricalProject, "sheets" | "continuations">, definitions: Map<string, ElectricalComponentDefinition>): ProjectReport {
  const { sheets, continuations } = project;
  const bomByDefinition = new Map<string, BomLine>();
  const wires: WireLine[] = [];
  const terminals: TerminalLine[] = [];
  const validation: ProjectReport["validation"] = [];
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
    validation.push(...report.validation.map((issue) => ({ ...issue, sheet: name })));
  }

  const describePoint = ({ sheetId, endpoint, gridReference }: ProjectContinuationPoint) => {
    const sheet = sheetLocations.get(sheetId);
    const component = sheet?.components.get(endpoint.componentId);
    const definition = component && definitions.get(component.definitionId);
    const terminals = component?.customTerminals ?? definition?.terminals ?? [];
    const index = terminals.findIndex((terminal) => terminal.id === endpoint.terminalId);
    const label = component && index >= 0
      ? component.terminalLabels?.[endpoint.terminalId] ?? displayTerminalLabel(component.properties, index, terminals[index].label)
      : endpoint.terminalId;
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
        conductorColor: continuation.conductorColor,
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
    validation: [...validation, ...projectContinuationSignalWarnings(project), ...validateProjectContinuations(project).map((message): TopologyIssue => ({ severity: "error", code: "invalid-project-continuation", message }))],
  };
}
