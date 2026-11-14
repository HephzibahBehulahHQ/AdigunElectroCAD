import { catalogById } from "../catalog/dolCatalog";
import type { CircuitDocument, ElectricalProject, ProjectContinuation, TerminalEndpoint } from "../types/electrical";
import { canConnectTerminals } from "../electrical/topology";

/** Validate page order, real local terminals, and the retained source of every cross-sheet net. */
export function validateProjectContinuations(project: ElectricalProject): string[] {
  const issues: string[] = [];
  const sheetOrder = new Map(project.sheets.map((sheet, index) => [sheet.id, index]));
  const seenIds = new Set<string>();

  for (const continuation of project.continuations ?? []) {
    if (seenIds.has(continuation.id)) issues.push(`Duplicate project continuation id: ${continuation.id}`);
    seenIds.add(continuation.id);
    const points = continuation.points;
    if (points.length < 2) { issues.push(`Continuation ${continuation.label} must reach at least two sheets.`); continue; }
    const seenSheets = new Set<string>();
    let previousOrder = -1;
    let expectedKind: string | undefined;

    points.forEach((point, index) => {
      const expectedRole = index === 0 ? "source" : index === points.length - 1 ? "destination" : "continuation";
      if (point.role !== expectedRole) issues.push(`Continuation ${continuation.label} must mark point ${index + 1} as ${expectedRole}.`);
      if (!/^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*$/.test(point.gridReference)) issues.push(`Continuation ${continuation.label} has an invalid grid reference: ${point.gridReference}.`);
      if (seenSheets.has(point.sheetId)) issues.push(`Continuation ${continuation.label} has more than one point on sheet ${point.sheetId}.`);
      seenSheets.add(point.sheetId);
      const order = sheetOrder.get(point.sheetId);
      if (order === undefined) { issues.push(`Continuation ${continuation.label} references unknown sheet ${point.sheetId}.`); return; }
      if (order <= previousOrder) issues.push(`Continuation ${continuation.label} points must follow project sheet order.`);
      previousOrder = order;
      const sheet = project.sheets[order];
      const component = sheet.document.components.find((item) => item.id === point.endpoint.componentId);
      const definition = component && catalogById.get(component.definitionId);
      const terminal = (component?.customTerminals ?? definition?.terminals)?.find((item) => item.id === point.endpoint.terminalId);
      if (!component || !terminal) { issues.push(`Continuation ${continuation.label} references an unknown terminal on sheet ${point.sheetId}.`); return; }
      if (expectedKind && terminal.kind !== expectedKind) issues.push(`Continuation ${continuation.label} joins incompatible terminal kinds.`);
      expectedKind = terminal.kind;
    });
  }
  return issues;
}


export interface ProjectTerminalReference {
  sheetId: string;
  endpoint: TerminalEndpoint;
}

/**
 * Resolve the project-wide wire net containing a terminal. Local document wires
 * and project continuation points are treated as conductor edges; device
 * internals are not, so this does not claim current flow or simulation.
 */
export function resolveProjectNet(project: ElectricalProject, start: ProjectTerminalReference): ProjectTerminalReference[] {
  const endpoints = new Map<string, ProjectTerminalReference>();
  const adjacency = new Map<string, Set<string>>();
  const key = ({ sheetId, endpoint }: ProjectTerminalReference) => `${sheetId}\u0000${endpoint.componentId}\u0000${endpoint.terminalId}`;
  const addEndpoint = (reference: ProjectTerminalReference) => {
    const id = key(reference);
    endpoints.set(id, reference);
    if (!adjacency.has(id)) adjacency.set(id, new Set());
    return id;
  };
  const connect = (left: ProjectTerminalReference, right: ProjectTerminalReference) => {
    const leftId = addEndpoint(left);
    const rightId = addEndpoint(right);
    adjacency.get(leftId)!.add(rightId);
    adjacency.get(rightId)!.add(leftId);
  };

  for (const sheet of project.sheets) {
    for (const component of sheet.document.components) {
      const definition = catalogById.get(component.definitionId);
      for (const terminal of component.customTerminals ?? definition?.terminals ?? []) {
        addEndpoint({ sheetId: sheet.id, endpoint: { componentId: component.id, terminalId: terminal.id } });
      }
    }
    for (const wire of sheet.document.wires) {
      connect({ sheetId: sheet.id, endpoint: wire.from }, { sheetId: sheet.id, endpoint: wire.to });
    }
  }
  for (const continuation of project.continuations ?? []) {
    const [first, ...remaining] = continuation.points;
    if (!first) continue;
    for (const point of remaining) {
      connect({ sheetId: first.sheetId, endpoint: first.endpoint }, { sheetId: point.sheetId, endpoint: point.endpoint });
    }
  }

  const startId = key(start);
  if (!endpoints.has(startId)) return [];
  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }
  return [...visited].map((id) => endpoints.get(id)!);
}
export type CreateProjectContinuationResult =
  | { ok: true; project: ElectricalProject; continuation: ProjectContinuation }
  | { ok: false; reason: string };

const defaultContinuationColor = (kind: string) => kind === "protective-earth" ? "#1d8f53" : kind === "control" ? "#7c3aed" : "#c42626";

/** Create a labelled project net between two real terminals on different sheets. */
export function createProjectContinuation(
  project: ElectricalProject,
  first: ProjectTerminalReference,
  second: ProjectTerminalReference,
  firstGridReference = "A.1",
  secondGridReference = "A.1",
): CreateProjectContinuationResult {
  if (first.sheetId === second.sheetId) return { ok: false, reason: "A sheet continuation must connect two different sheets." };
  const sheetOrder = new Map(project.sheets.map((sheet, index) => [sheet.id, index]));
  const firstOrder = sheetOrder.get(first.sheetId);
  const secondOrder = sheetOrder.get(second.sheetId);
  if (firstOrder === undefined || secondOrder === undefined) return { ok: false, reason: "Both continuation sheets must belong to the current project." };
  const resolve = (reference: ProjectTerminalReference) => {
    const sheet = project.sheets[sheetOrder.get(reference.sheetId)!];
    const component = sheet.document.components.find((item) => item.id === reference.endpoint.componentId);
    const definition = component && catalogById.get(component.definitionId);
    const terminal = (component?.customTerminals ?? definition?.terminals)?.find((item) => item.id === reference.endpoint.terminalId);
    return terminal && component ? { component, terminal, label: terminal.label } : undefined;
  };
  const firstTerminal = resolve(first);
  const secondTerminal = resolve(second);
  if (!firstTerminal || !secondTerminal) return { ok: false, reason: "Choose real terminals from the component catalog." };
  const checkDocument: CircuitDocument = {
    id: "project-continuation-check",
    name: "Project continuation compatibility check",
    description: "",
    components: [
      { ...firstTerminal.component, id: "continuation-first", properties: { ...firstTerminal.component.properties } },
      { ...secondTerminal.component, id: "continuation-second", properties: { ...secondTerminal.component.properties } },
    ],
    wires: [],
    revision: 1,
  };
  const connectionCheck = canConnectTerminals(checkDocument, catalogById,
    { componentId: "continuation-first", terminalId: first.endpoint.terminalId },
    { componentId: "continuation-second", terminalId: second.endpoint.terminalId });
  if (!connectionCheck.ok) return { ok: false, reason: connectionCheck.reason ?? "Those terminals cannot be connected." };
  const [source, destination, sourceGrid, destinationGrid] = firstOrder < secondOrder
    ? [first, second, firstGridReference, secondGridReference] as const
    : [second, first, secondGridReference, firstGridReference] as const;
  const sourceTerminal = resolve(source)!;
  const endpointId = (reference: ProjectTerminalReference) => `${reference.sheetId}:${reference.endpoint.componentId}:${reference.endpoint.terminalId}`;
  const pair = new Set([endpointId(source), endpointId(destination)]);
  if ((project.continuations ?? []).some((existing) => {
    const endpoints = existing.points.map((point) => endpointId({ sheetId: point.sheetId, endpoint: point.endpoint }));
    return endpoints.length === 2 && pair.has(endpoints[0]) && pair.has(endpoints[1]);
  })) return { ok: false, reason: "Those terminals already have a project continuation." };

  const ids = new Set((project.continuations ?? []).map((item) => item.id));
  let suffix = project.revision + 1;
  while (ids.has(`continuation-${suffix}`)) suffix++;
  const continuation: ProjectContinuation = {
    id: `continuation-${suffix}`,
    label: sourceTerminal.label,
    conductorColor: defaultContinuationColor(sourceTerminal.terminal.kind),
    points: [
      { sheetId: source.sheetId, gridReference: sourceGrid, role: "source", endpoint: source.endpoint },
      { sheetId: destination.sheetId, gridReference: destinationGrid, role: "destination", endpoint: destination.endpoint },
    ],
  };
  const next = { ...project, revision: project.revision + 1, continuations: [...(project.continuations ?? []), continuation] };
  const issues = validateProjectContinuations(next);
  if (issues.length) return { ok: false, reason: issues[0] };
  return { ok: true, project: next, continuation };
}
