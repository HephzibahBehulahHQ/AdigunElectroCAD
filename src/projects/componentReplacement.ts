import { canPlaceComponent, placementLayout } from "../cad/documentOps";
import { terminalGridReference } from "../cad/terminalAnchors";
import { catalogById } from "../catalog/dolCatalog";
import { validateCircuit } from "../electrical/topology";
import type { CircuitSheet, ElectricalProject, TerminalEndpoint } from "../types/electrical";
import { introducedDriverConflict, validateProjectContinuations } from "./projectContinuations";
import { replaceSheetDocument } from "./starterProject";

export function connectedComponentTerminals(project: ElectricalProject, sheet: CircuitSheet, componentId: string): Set<string> {
  const endpoints = sheet.document.wires.flatMap(wire => [wire.from, wire.to]);
  for (const net of project.continuations ?? []) {
    for (const point of net.points) if (point.sheetId === sheet.id) endpoints.push(point.endpoint);
  }
  return new Set(endpoints.filter(endpoint => endpoint.componentId === componentId).map(endpoint => endpoint.terminalId));
}

export function replaceCatalogComponent(project: ElectricalProject, sheetId: string, componentId: string,
  definitionId: string, mapping: ReadonlyMap<string, string>): { project: ElectricalProject; reason?: string } {
  const sheet = project.sheets.find(item => item.id === sheetId);
  const component = sheet?.document.components.find(item => item.id === componentId);
  const currentDefinition = component && catalogById.get(component.definitionId);
  const target = catalogById.get(definitionId);
  if (!sheet || sheet.kind !== "free-schematic" || !component || !currentDefinition || !target || target.id === component.definitionId) {
    return { project, reason: "Choose a different catalog component on an editable sheet." };
  }
  const connected = connectedComponentTerminals(project, sheet, componentId);
  const originalTerminals = component.customTerminals ?? currentDefinition.terminals;
  const used = new Set<string>();
  for (const pinId of connected) {
    const original = originalTerminals.find(pin => pin.id === pinId);
    const next = target.terminals.find(pin => pin.id === mapping.get(pinId));
    if (!original || !next || next.kind !== original.kind) return { project, reason: "Choose a compatible destination for " + (original?.label ?? pinId) + "." };
    if (used.has(next.id)) return { project, reason: "Use a distinct destination for each connected terminal." };
    used.add(next.id);
  }
  const { customTerminals, customTerminalOffsets, customSymbolGraphics, terminalLabels, ...instance } = component;
  const replacement = { ...instance, definitionId, properties: { ...target.propertiesSchema } };
  const remap = (endpoint: TerminalEndpoint): TerminalEndpoint => endpoint.componentId === componentId
    ? { ...endpoint, terminalId: mapping.get(endpoint.terminalId)! } : endpoint;
  const original = sheet.document;
  const document = {
    ...original, revision: original.revision + 1,
    components: original.components.map(item => item.id === componentId ? replacement : item),
    wires: original.wires.map(wire => {
      const from = remap(wire.from), to = remap(wire.to);
      return from === wire.from && to === wire.to ? wire : { ...wire, from, to };
    }),
  };
  if (!canPlaceComponent(document.components, componentId, replacement.x, replacement.y, undefined, undefined, placementLayout(document))) {
    return { project, reason: "The replacement needs more clearance at this position." };
  }
  const priorErrors = new Set(validateCircuit(original, catalogById).map(issue => issue.message));
  const invalid = validateCircuit(document, catalogById).find(issue => !priorErrors.has(issue.message));
  if (invalid) return { project, reason: invalid.message };
  const nextProject = replaceSheetDocument(project, sheetId, document);
  if (project.continuations) {
    nextProject.continuations = project.continuations.map(net => ({
      ...net, points: net.points.map(point => {
        if (point.sheetId !== sheetId || point.endpoint.componentId !== componentId) return point;
        const endpoint = remap(point.endpoint);
        return { ...point, endpoint, gridReference: terminalGridReference(document, endpoint) };
      }),
    }));
  }
  const issue = validateProjectContinuations(nextProject)[0] ?? introducedDriverConflict(project, nextProject);
  return issue ? { project, reason: issue } : { project: nextProject };
}
