import { automaticWireBends, findAutomaticWireBends, resolveBranchWireRoute, wireRouteObstacles, wireRouteObstructions } from "../cad/automaticWireRoute";
import { frontEnvelopeClearance } from "../catalog/deviceEnvelopes";
import { componentFootprintsOverlap, instanceFootprint } from "../cad/componentGeometry";
import { endpointKey, terminalAnchors } from "../cad/terminalAnchors";
import { resolveDraftingStyle } from "../cad/draftingLayers";
import { displayTerminalLabel } from "../electrical/terminalLabels";
import type { ElectricalComponentDefinition, ElectricalProject, CircuitDocument, ProjectContinuation, ProjectContinuationPoint, Wire } from "../types/electrical";
import { validateCircuit, type TopologyIssue } from "../electrical/topology";
import { projectContinuationSignalWarnings, projectSignalDriverConflicts, validateProjectContinuations } from "../projects/projectContinuations";
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

export function wireClearanceWarnings(document: CircuitDocument): TopologyIssue[] {
  if (document.id === "reference-dol-motor-starter") return [];
  const hiddenLayers = new Set(document.draftingLayers?.filter(({ hidden }) => hidden).map(({ id }) => id));
  const visible = document.components.filter(({ layerId }) => !hiddenLayers.has(layerId ?? ""));
  const references = new Map(visible.map(({ id, reference }) => [id, reference]));
  const obstacles = wireRouteObstacles(visible, document.drawingGrid?.units === "mm");
  const anchors = new Map(terminalAnchors(document).map((anchor) => [endpointKey(anchor.endpoint), anchor]));
  const routePoints = (wire: Wire) => {
    const from = anchors.get(endpointKey(wire.from)), to = anchors.get(endpointKey(wire.to));
    return wire.points.length || wire.branchOfWireId || !from || !to ? wire.points : automaticWireBends(from, to, obstacles);
  };
  return document.wires.flatMap((wire): TopologyIssue[] => {
    if (hiddenLayers.has(wire.layerId ?? "")) return [];
    if (wire.branchOfWireId) {
      const branch = resolveBranchWireRoute(wire, document.wires, anchors, obstacles, routePoints);
      if (!branch?.blockedBy.length) return [];
      const blockedBy = branch.blockedBy.map((id) => references.get(id) ?? id);
      return [{ severity: "warning", code: "blocked-branch-wire-route",
        message: "Branch " + (wire.netName ?? wire.id) + " has no clear automatic route. Its fallback crosses " + blockedBy.join(", ") + "." }];
    }
    const from = anchors.get(endpointKey(wire.from)), to = anchors.get(endpointKey(wire.to));
    if (!from || !to) return [];
    if (wire.points.length) {
      const blockedBy = wireRouteObstructions(from, to, wire.points, obstacles).map((id) => references.get(id) ?? id);
      return blockedBy.length ? [{ severity: "warning", code: "blocked-manual-wire-route",
        message: "Wire " + (wire.netName ?? wire.id) + " crosses " + blockedBy.join(", ") + ". Edit its route points to clear the obstruction." }] : [];
    }
    if (findAutomaticWireBends(from, to, obstacles) !== null) return [];
    const blockedBy = wireRouteObstructions(from, to, [], obstacles).map((id) => references.get(id) ?? id);
    return [{ severity: "warning", code: "blocked-automatic-wire-route",
      message: "Wire " + (wire.netName ?? wire.id) + " has no clear automatic route. Its fallback crosses " + blockedBy.join(", ") + "." }];
  });
}

export function componentClearanceWarnings(document: CircuitDocument): TopologyIssue[] {
  if (document.id === "reference-dol-motor-starter") return [];
  const footprints = document.components.map(component => ({ reference: component.reference, bounds: instanceFootprint(component, document.drawingGrid?.units === "mm") }));
  const warnings: TopologyIssue[] = [];
  for (const [index, footprint] of footprints.entries()) {
    // Keep reports bounded even when many components occupy the same location.
    for (let prior = 0; prior < index; prior++) {
      const other = footprints[prior];
      if (!componentFootprintsOverlap(footprint.bounds, other.bounds)) continue;
      warnings.push({ severity: "warning", code: "component-clearance-overlap", message: `Drawing clearance overlaps between ${other.reference} and ${footprint.reference}.` });
      break;
    }
  }
  return warnings;
}

function panelOutlines(document: CircuitDocument) {
  if (document.drawingGrid?.units !== "mm") return [];
  return (document.graphics ?? []).flatMap(graphic =>
    (graphic.kind === "rectangle" || graphic.kind === "ellipse" || graphic.kind === "polygon") && graphic.deviceLink ? [{
    name: graphic.name, link: graphic.deviceLink, kind: graphic.kind, points: graphic.points,
    bounds: { left: Math.min(graphic.x1, graphic.x2), top: Math.min(graphic.y1, graphic.y2),
      right: Math.max(graphic.x1, graphic.x2), bottom: Math.max(graphic.y1, graphic.y2) },
  }] : []);
}

type PanelOutline = ReturnType<typeof panelOutlines>[number];

type PanelShape = Pick<PanelOutline, "kind" | "bounds"> & Partial<Pick<PanelOutline, "points">>;

function polygonIntersectsEllipse(points: NonNullable<PanelShape["points"]>, bounds: PanelShape["bounds"]): boolean {
  const rx = (bounds.right - bounds.left) / 2;
  const ry = (bounds.bottom - bounds.top) / 2;
  const centreX = bounds.left + rx;
  const centreY = bounds.top + ry;
  const normalized = points.map(({ x, y }) => ({ x: (x - centreX) / rx, y: (y - centreY) / ry }));
  let containsCentre = false;
  for (const [index, start] of normalized.entries()) {
    const end = normalized[(index + 1) % normalized.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const edgeLengthSquared = dx * dx + dy * dy;
    const t = edgeLengthSquared ? Math.max(0, Math.min(1, -(start.x * dx + start.y * dy) / edgeLengthSquared)) : 0;
    if (Math.hypot(start.x + t * dx, start.y + t * dy) < 1 - 1e-10) return true;
    if ((start.y > 0) !== (end.y > 0) && start.x - start.y * dx / dy > 0) containsCentre = !containsCentre;
  }
  return containsCentre;
}

function polygonIntersectsRectangle(points: NonNullable<PanelShape["points"]>, bounds: PanelShape["bounds"]): boolean {
  const edges = [["x", bounds.left, 1], ["x", bounds.right, -1],
    ["y", bounds.top, 1], ["y", bounds.bottom, -1]] as const;
  let clipped = points;
  for (const [axis, limit, direction] of edges) {
    clipped = clipped.flatMap((end, index) => {
      const start = clipped[(index + clipped.length - 1) % clipped.length];
      const startInside = (start[axis] - limit) * direction >= 0;
      const endInside = (end[axis] - limit) * direction >= 0;
      if (startInside === endInside) return endInside ? [end] : [];
      const fraction = (limit - start[axis]) / (end[axis] - start[axis]);
      const crossing = { x: start.x + fraction * (end.x - start.x), y: start.y + fraction * (end.y - start.y), [axis]: limit };
      return endInside ? [crossing, end] : [crossing];
    });
  }
  const origin = clipped[0];
  if (!origin) return false;
  const twiceArea = clipped.reduce((area, point, index) => {
    const next = clipped[(index + 1) % clipped.length];
    return area + (point.x - origin.x) * (next.y - origin.y) - (point.y - origin.y) * (next.x - origin.x);
  }, 0);
  return Math.abs(twiceArea) > 1e-10;
}

function panelOverlap(a: PanelShape, b: PanelShape): "exact" | "possible" | undefined {
  if (!componentFootprintsOverlap(a.bounds, b.bounds)) return;
  if (a.kind === "rectangle" && b.kind === "rectangle") return "exact";
  const ellipse = a.kind === "ellipse" ? a.bounds : b.kind === "ellipse" ? b.bounds : undefined;
  const rectangle = a.kind === "rectangle" ? a.bounds : b.kind === "rectangle" ? b.bounds : undefined;
  const polygon = a.kind === "polygon" ? a.points : b.kind === "polygon" ? b.points : undefined;
  if (ellipse && polygon) return polygonIntersectsEllipse(polygon, ellipse) ? "exact" : undefined;
  if (rectangle && polygon) return polygonIntersectsRectangle(polygon, rectangle) ? "exact" : undefined;
  if (ellipse && rectangle) {
    const x = (ellipse.left + ellipse.right) / 2;
    const y = (ellipse.top + ellipse.bottom) / 2;
    const dx = Math.max(rectangle.left - x, x - rectangle.right, 0) / ((ellipse.right - ellipse.left) / 2);
    const dy = Math.max(rectangle.top - y, y - rectangle.bottom, 0) / ((ellipse.bottom - ellipse.top) / 2);
    return Math.hypot(dx, dy) < 1 - 1e-10 ? "exact" : undefined;
  }
  if (a.kind === "ellipse" && b.kind === "ellipse") {
    const diameterA = a.bounds.right - a.bounds.left;
    const diameterB = b.bounds.right - b.bounds.left;
    if (Math.abs(diameterA - (a.bounds.bottom - a.bounds.top)) < 1e-8 &&
      Math.abs(diameterB - (b.bounds.bottom - b.bounds.top)) < 1e-8) {
      const dx = a.bounds.left + diameterA / 2 - b.bounds.left - diameterB / 2;
      const dy = a.bounds.top + diameterA / 2 - b.bounds.top - diameterB / 2;
      return Math.hypot(dx, dy) < (diameterA + diameterB) / 2 - 1e-8 ? "exact" : undefined;
    }
  }
  return "possible";
}

function panelOutlineWarnings(document: CircuitDocument): TopologyIssue[] {
  const outlines = panelOutlines(document);
  return outlines.flatMap((outline, index): TopologyIssue[] => {
    for (let prior = 0; prior < index; prior++) {
      const other = outlines[prior];
      const overlap = panelOverlap(outline, other);
      if (overlap) {
        const exact = overlap === "exact";
        return [{
          severity: "warning", code: exact ? "panel-outline-overlap" : "panel-envelope-overlap",
          message: (exact ? "Linked panel outlines overlap: " : "Linked panel envelopes overlap. Check the outline geometry: ") + other.name + " and " + outline.name + ".",
        }];
      }
    }
    return [];
  });
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
    validation: [...validateCircuit(document, definitions), ...wireClearanceWarnings(document), ...componentClearanceWarnings(document), ...panelOutlineWarnings(document)],
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
    const outlines = panelOutlines(sheet.document);
    for (const outline of outlines) {
      if (outline.kind !== "rectangle") continue;
      const source = sheetLocations.get(outline.link.sheetId)?.components.get(outline.link.componentId);
      if (!source) continue;
      const { left, right, top, bottom } = outline.bounds;
      const clearance = frontEnvelopeClearance(source.definitionId, right - left, bottom - top);
      if (!clearance) continue;
      const required = { left: left - (clearance.lateral ?? 0), right: right + (clearance.lateral ?? 0),
        top: top - clearance.above, bottom: bottom + clearance.below };
      const clearanceOutline = { kind: "rectangle" as const, bounds: required };
      const obstruction = outlines.find(other => other !== outline &&
        (other.link.sheetId !== outline.link.sheetId || other.link.componentId !== outline.link.componentId) &&
        panelOverlap(other, clearanceOutline) && panelOverlap(other, outline) !== "exact");
      if (obstruction) validation.push({
        severity: "warning", code: "panel-installation-clearance", sheet: name,
        message: obstruction.name + (panelOverlap(obstruction, clearanceOutline) === "exact" ? " enters" : " may enter") +
          " the documented mounting clearance for " + outline.name + ".",
      });
    }
    for (const graphic of sheet.document.graphics ?? []) {
      const link = graphic.deviceLink;
      if (!link) continue;
      const device = sheetLocations.get(link.sheetId)?.components.get(link.componentId);
      if (!device) {
        validation.push({
          severity: "warning", code: "unresolved-panel-device", sheet: name,
          message: graphic.name + " links to a missing schematic device. Relink it in the graphic Properties.",
        });
      } else if (graphic.footprintReviewRequired) {
        validation.push({
          severity: "warning", code: "panel-footprint-review", sheet: name,
          message: `${graphic.name} needs footprint review for ${device.reference}. Verify the outline dimensions and mounting features in the graphic Properties.`,
        });
      }
    }
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
    validation: [...validation, ...projectContinuationSignalWarnings(project), ...projectSignalDriverConflicts(project).map((message): TopologyIssue => ({ severity: "warning", code: "project-signal-driver-conflict", message })), ...validateProjectContinuations(project).map((message): TopologyIssue => ({ severity: "error", code: "invalid-project-continuation", message }))],
  };
}
